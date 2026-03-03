package ru.krezd.diploma.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import ru.krezd.diploma.dto.slurm.account.SlurmAccountsResponseDTO;
import ru.krezd.diploma.dto.slurm.account.SlurmAssociationDTO;
import ru.krezd.diploma.dto.slurm.account.SlurmAssociationsResponseDTO;
import ru.krezd.diploma.enums.UserRole;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Сервис для управления аккаунтами и ассоциациями в slurmdbd.
 *
 * <p>READ-операции (списки аккаунтов, ассоциаций) выполняются через REST API slurmrestd.
 * WRITE-операции (создание/удаление аккаунтов, ассоциаций, регистрация пользователей)
 * выполняются через sacctmgr CLI, поскольку REST API slurmrestd v0.0.40:</p>
 * <ul>
 *   <li>При создании аккаунта не создаёт ассоциацию аккаунта с кластером,
 *       из-за чего пользователей нельзя к нему привязать.</li>
 *   <li>Иногда закрывает TCP-соединение без HTTP-ответа («Unexpected end of file»),
 *       что приводит к порче keep-alive соединения и каскадным ошибкам.</li>
 * </ul>
 * <p>sacctmgr создаёт аккаунт вместе с ассоциацией кластера за один вызов
 * и работает надёжно через sudo без JWT.</p>
 */
@Service
@Slf4j
public class SlurmAccountService {

    @Autowired
    @Qualifier("slurmRestTemplate")
    private RestTemplate slurmRestTemplate;

    @Value("${slurm.db.address}")
    private String slurmDbAddress;

    @Value("${slurm.cluster.name}")
    private String clusterName;

    @Value("${slurm.default.account:user}")
    private String defaultAccount;

    @Value("${slurm.admin.account:admin}")
    private String adminAccount;

    // ── Аккаунты: READ (REST) ────────────────────────────────────────────────

    /**
     * Возвращает список всех аккаунтов slurmdbd.
     */
    public SlurmAccountsResponseDTO getAccounts() {
        return slurmRestTemplate.getForObject(
                slurmDbAddress + "accounts",
                SlurmAccountsResponseDTO.class
        );
    }

    // ── Аккаунты: WRITE (CLI) ────────────────────────────────────────────────

    /**
     * Создаёт новый аккаунт в slurmdbd и его ассоциацию с кластером через sacctmgr.
     *
     * <p>REST API v0.0.40 POST /accounts создаёт только запись аккаунта без ассоциации
     * с кластером, поэтому после него нельзя добавить пользователя к аккаунту.
     * sacctmgr add account с параметром cluster= создаёт их одновременно.</p>
     */
    public void createAccount(String name, String description, String organization) {
        try {
            String desc = (description != null && !description.isBlank()) ? description : name;
            List<String> args = new ArrayList<>(Arrays.asList(
                    "add", "account",
                    "name=" + name,
                    "cluster=" + clusterName,
                    "description=" + desc
            ));
            if (organization != null && !organization.isBlank()) {
                args.add("organization=" + organization);
            }
            runSacctmgr(args.toArray(String[]::new));
            log.info("Создан аккаунт SLURM: {} (кластер: {})", name, clusterName);
        } catch (Exception e) {
            throw new RuntimeException("Не удалось создать аккаунт '" + name + "': " + e.getMessage(), e);
        }
    }

    /**
     * Удаляет аккаунт из slurmdbd через sacctmgr.
     */
    public void deleteAccount(String name) {
        try {
            runSacctmgr("delete", "account", "name=" + name);
            log.info("Удалён аккаунт SLURM: {}", name);
        } catch (Exception e) {
            throw new RuntimeException("Не удалось удалить аккаунт '" + name + "': " + e.getMessage(), e);
        }
    }

    // ── Ассоциации: READ (REST) ──────────────────────────────────────────────

    /**
     * Возвращает список ассоциаций с возможностью фильтрации по аккаунту и пользователю.
     */
    public SlurmAssociationsResponseDTO getAssociations(String account, String user) {
        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(slurmDbAddress + "associations");
        if (account != null && !account.isBlank()) {
            builder.queryParam("account", account);
        }
        if (user != null && !user.isBlank()) {
            builder.queryParam("user", user);
        }
        return slurmRestTemplate.getForObject(
                builder.toUriString(),

                SlurmAssociationsResponseDTO.class
        );
    }

    // ── Ассоциации: WRITE (CLI) ──────────────────────────────────────────────

    /**
     * Создаёт ассоциацию между пользователем и аккаунтом через sacctmgr.
     *
     * <p>Если пользователь ещё не существует в slurmdbd — sacctmgr его создаёт.
     * Если ассоциация уже есть — sacctmgr сообщает об этом, но не падает.</p>
     */
    public void createAssociation(String username, String accountName) {
        try {
            runSacctmgr("add", "user",
                    "name=" + username,
                    "account=" + accountName,
                    "cluster=" + clusterName);
            log.info("Создана ассоциация: пользователь '{}' → аккаунт '{}'", username, accountName);
        } catch (Exception e) {
            throw new RuntimeException("Не удалось создать ассоциацию пользователя '"
                    + username + "' с аккаунтом '" + accountName + "': " + e.getMessage(), e);
        }
    }

    /**
     * Удаляет ассоциацию пользователя с аккаунтом через sacctmgr.
     *
     * <p>sacctmgr запрещает удалять дефолтный аккаунт и ассоциации по одной при наличии единственной.
     * Поэтому используется подход: получить все текущие ассоциации пользователя → удалить пользователя
     * из кластера целиком → добавить обратно все аккаунты кроме удаляемого.</p>
     */
    public void deleteAssociation(String username, String accountName) {
        // 1. Получаем текущие ассоциации пользователя
        SlurmAssociationsResponseDTO assocResponse = getAssociations(null, username);
        List<String> remainingAccounts = List.of();
        if (assocResponse != null && assocResponse.getAssociations() != null) {
            remainingAccounts = assocResponse.getAssociations().stream()
                    .filter(a -> a.getUser() != null && !a.getUser().isBlank())
                    .filter(a -> a.getPartition() == null || a.getPartition().isBlank())
                    .filter(a -> !accountName.equals(a.getAccount()))
                    .map(SlurmAssociationDTO::getAccount)
                    .distinct()
                    .collect(Collectors.toList());
        }

        // 2. Полностью удаляем пользователя из кластера
        try {
            runSacctmgr("delete", "user", "name=" + username, "cluster=" + clusterName);
            log.debug("Пользователь '{}' удалён из кластера '{}' для переподключения аккаунтов",
                    username, clusterName);
        } catch (Exception e) {
            throw new RuntimeException("Не удалось удалить пользователя '"
                    + username + "' из кластера: " + e.getMessage(), e);
        }

        // 3. Переподключаем оставшиеся аккаунты
        for (String account : remainingAccounts) {
            try {
                runSacctmgr("add", "user",
                        "name=" + username,
                        "account=" + account,
                        "cluster=" + clusterName);
                log.debug("Восстановлена ассоциация '{}' → '{}'", username, account);
            } catch (Exception e) {
                log.error("Не удалось восстановить ассоциацию '{}' → '{}': {}",
                        username, account, e.getMessage());
                throw new RuntimeException("Не удалось восстановить ассоциацию '"
                        + username + "' с аккаунтом '" + account + "': " + e.getMessage(), e);
            }
        }

        log.info("Удалена ассоциация: пользователь '{}' → аккаунт '{}', восстановлено аккаунтов: {}",
                username, accountName, remainingAccounts.size());
    }

    // ── Регистрация пользователя (CLI) ───────────────────────────────────────

    /**
     * Регистрирует нового пользователя в slurmdbd и создаёт ассоциацию с аккаунтом.
     *
     * @param username    имя пользователя
     * @param accountName аккаунт для привязки (если null — используется defaultAccount)
     * @param role        роль: ADMIN → adminlevel=Administrator, REGULAR → None
     */
    public void registerUserInSlurm(String username, String accountName, UserRole role) {
        String resolvedAccount = (accountName != null && !accountName.isBlank())
                ? accountName
                : defaultAccount;
        String adminLevel = (role == UserRole.ADMIN) ? "Administrator" : "None";

        try {
            runSacctmgr("add", "user",
                    "name=" + username,
                    "account=" + resolvedAccount,
                    "cluster=" + clusterName,
                    "adminlevel=" + adminLevel,
                    "defaultaccount=" + resolvedAccount);
            log.info("Пользователь '{}' зарегистрирован в slurmdbd, аккаунт: '{}', adminlevel: {}",
                    username, resolvedAccount, adminLevel);
        } catch (Exception e) {
            log.error("Не удалось зарегистрировать '{}' в slurmdbd: {}", username, e.getMessage());
            throw new RuntimeException("Не удалось зарегистрировать пользователя в slurmdbd: "
                    + e.getMessage(), e);
        }
    }

    /**
     * Обновляет adminlevel пользователя в slurmdbd через sacctmgr.
     */
    public void updateSlurmAdminLevel(String username, UserRole role) {
        String adminLevel = (role == UserRole.ADMIN) ? "Administrator" : "None";
        try {
            runSacctmgr("modify", "user", "name=" + username, "set", "adminlevel=" + adminLevel);
            log.info("Обновлён adminlevel пользователя '{}' → {}", username, adminLevel);
        } catch (Exception e) {
            log.error("Не удалось обновить adminlevel для '{}': {}", username, e.getMessage());
            throw new RuntimeException("Не удалось обновить adminlevel: " + e.getMessage(), e);
        }
    }

    /**
     * Удаляет пользователя из slurmdbd вместе со всеми его ассоциациями через sacctmgr.
     */
    public void deleteUserFromSlurm(String username) {
        try {
            runSacctmgr("delete", "user", "name=" + username);
            log.info("Пользователь '{}' удалён из slurmdbd", username);
        } catch (Exception e) {
            log.error("Не удалось удалить '{}' из slurmdbd: {}", username, e.getMessage());
            throw new RuntimeException("Не удалось удалить пользователя из slurmdbd: "
                    + e.getMessage(), e);
        }
    }

    // ── Инициализация (CLI) ──────────────────────────────────────────────────

    /**
     * Проверяет наличие аккаунта по умолчанию и создаёт его при необходимости.
     */
    public void ensureDefaultAccountExists() {
        try {
            if (!slurmAccountExistsCli(defaultAccount)) {
                runSacctmgr("add", "account",
                        "name=" + defaultAccount,
                        "cluster=" + clusterName,
                        "description=Default user account");
                log.info("Создан аккаунт по умолчанию '{}' в slurmdbd", defaultAccount);
            } else {
                log.debug("Аккаунт по умолчанию '{}' уже существует в slurmdbd", defaultAccount);
            }
        } catch (Exception e) {
            log.warn("Не удалось проверить/создать аккаунт по умолчанию '{}': {}",
                    defaultAccount, e.getMessage());
        }
    }

    /**
     * Создаёт admin-аккаунт и admin-пользователя в slurmdbd при первом старте.
     */
    public void ensureAdminSlurmSetup(String username) {
        try {
            if (!slurmAccountExistsCli(adminAccount)) {
                runSacctmgr("add", "account",
                        "name=" + adminAccount,
                        "cluster=" + clusterName,
                        "description=Admin account");
                log.info("Создан admin SLURM-аккаунт '{}' через sacctmgr", adminAccount);
            } else {
                log.debug("Admin SLURM-аккаунт '{}' уже существует", adminAccount);
            }
        } catch (Exception e) {
            log.warn("Не удалось создать admin SLURM-аккаунт '{}': {}", adminAccount, e.getMessage());
            return;
        }

        try {
            if (!slurmUserExistsCli(username)) {
                runSacctmgr("add", "user",
                        "name=" + username,
                        "account=" + adminAccount,
                        "cluster=" + clusterName,
                        "adminlevel=Administrator",
                        "defaultaccount=" + adminAccount);
                log.info("Пользователь '{}' зарегистрирован в slurmdbd с adminlevel=Administrator, аккаунт '{}'",
                        username, adminAccount);
            } else {
                log.debug("SLURM-пользователь '{}' уже существует в slurmdbd", username);
            }
        } catch (Exception e) {
            log.warn("Не удалось зарегистрировать '{}' в slurmdbd: {}", username, e.getMessage());
        }
    }

    // ── CLI вспомогательные методы ───────────────────────────────────────────

    private boolean slurmAccountExistsCli(String accountName) throws IOException, InterruptedException {
        ProcessBuilder pb = new ProcessBuilder(
                "sudo", "sacctmgr", "-n", "-P", "show", "account", "name=" + accountName);
        pb.redirectErrorStream(true);
        Process process = pb.start();
        String output = new BufferedReader(new InputStreamReader(process.getInputStream()))
                .lines().collect(Collectors.joining("\n"));
        process.waitFor();
        return !output.isBlank();
    }

    private boolean slurmUserExistsCli(String username) throws IOException, InterruptedException {
        ProcessBuilder pb = new ProcessBuilder(
                "sudo", "sacctmgr", "-n", "-P", "show", "user", "name=" + username);
        pb.redirectErrorStream(true);
        Process process = pb.start();
        String output = new BufferedReader(new InputStreamReader(process.getInputStream()))
                .lines().collect(Collectors.joining("\n"));
        process.waitFor();
        return !output.isBlank();
    }

    /**
     * Выполняет sacctmgr с флагом -i (без запроса подтверждения).
     * Идемпотентные «ошибки» sacctmgr (Nothing new, already exists и т.п.)
     * логируются как debug, а не выбрасывают исключение.
     */
    private void runSacctmgr(String... args) throws IOException, InterruptedException {
        List<String> command = new ArrayList<>();
        command.add("sudo");
        command.add("sacctmgr");
        command.add("-i");
        command.addAll(Arrays.asList(args));

        log.debug("sacctmgr: {}", String.join(" ", command));

        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(true);
        Process process = pb.start();
        String output = new BufferedReader(new InputStreamReader(process.getInputStream()))
                .lines().collect(Collectors.joining("\n"));
        int exitCode = process.waitFor();

        if (exitCode != 0) {
            // Некоторые завершения с ненулевым кодом — это «ничего не изменилось», а не ошибка
            String lower = output.toLowerCase();
            if (lower.contains("nothing new") || lower.contains("nothing modified")
                    || lower.contains("already exists") || lower.contains("already registered")) {
                log.debug("sacctmgr (идемпотентно, exit {}): {}", exitCode, output);
                return;
            }
            throw new RuntimeException("sacctmgr завершился с ошибкой (exit " + exitCode + "): " + output);
        }
        if (!output.isBlank()) {
            log.debug("sacctmgr output: {}", output);
        }
    }
}