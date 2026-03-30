package ru.krezd.diploma.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import ru.krezd.diploma.dto.SetAssociationLimitsRequest;
import ru.krezd.diploma.dto.slurm.account.SlurmAccountsResponseDTO;
import ru.krezd.diploma.dto.slurm.account.SlurmAssociationDTO;
import ru.krezd.diploma.dto.slurm.account.SlurmAssociationsResponseDTO;
import ru.krezd.diploma.enums.UserRole;
import ru.krezd.diploma.repository.UserRepository;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Сервис для управления аккаунтами и ассоциациями в slurmdbd.
 *
 * <p>READ-операции выполняются через REST API slurmrestd.
 * WRITE-операции выполняются через sacctmgr CLI (через {@link SlurmCliRunner}).</p>
 */
@Service
@Slf4j
public class SlurmAccountService {

    @Autowired
    @Qualifier("slurmRestTemplate")
    private RestTemplate slurmRestTemplate;

    @Autowired
    private SlurmCliRunner cliRunner;

    @Autowired
    private UserRepository userRepository;

    @Value("${slurm.db.address}")
    private String slurmDbAddress;

    @Value("${slurm.cluster.name}")
    private String clusterName;

    @Value("${slurm.default.account:user}")
    private String defaultAccount;

    @Value("${slurm.admin.account:admin}")
    private String adminAccount;

    // ── Аккаунты: READ (REST) ────────────────────────────────────────────────

    public SlurmAccountsResponseDTO getAccounts() {
        return slurmRestTemplate.getForObject(
                slurmDbAddress + "accounts",
                SlurmAccountsResponseDTO.class
        );
    }

    // ── Аккаунты: WRITE (CLI) ────────────────────────────────────────────────

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
            cliRunner.runSacctmgr(args.toArray(String[]::new));
            log.info("Создан аккаунт SLURM: {} (кластер: {})", name, clusterName);
        } catch (Exception e) {
            throw new RuntimeException("Не удалось создать аккаунт '" + name + "': " + e.getMessage(), e);
        }
    }

    public void deleteAccount(String name) {
        try {
            cliRunner.runSacctmgr("delete", "account", "name=" + name);
            log.info("Удалён аккаунт SLURM: {}", name);
        } catch (Exception e) {
            throw new RuntimeException("Не удалось удалить аккаунт '" + name + "': " + e.getMessage(), e);
        }
    }

    // ── Ассоциации: READ (REST) ──────────────────────────────────────────────

    public SlurmAssociationsResponseDTO getAssociations(String account, String user) {
        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(slurmDbAddress + "associations");
        if (account != null && !account.isBlank()) {
            builder.queryParam("account", account);
        }
        if (user != null && !user.isBlank()) {
            builder.queryParam("user", user);
        }
        SlurmAssociationsResponseDTO response = slurmRestTemplate.getForObject(
                builder.toUriString(),
                SlurmAssociationsResponseDTO.class
        );

        // Фильтруем user-level ассоциации: показываем только тех пользователей,
        // которые зарегистрированы в БД приложения.
        // Account-level ассоциации (user == null/"") показываем всегда.
        if (response != null && response.getAssociations() != null) {
            Set<String> appUsernames = userRepository.findAll().stream()
                    .map(u -> u.getUsername())
                    .collect(Collectors.toSet());

            List<SlurmAssociationDTO> filtered = response.getAssociations().stream()
                    .filter(a -> {
                        String assocUser = a.getUser();
                        return assocUser == null || assocUser.isBlank()
                                || appUsernames.contains(assocUser);
                    })
                    .peek(a -> a.setLimits(a.computeLimits()))
                    .collect(Collectors.toList());

            response.setAssociations(filtered);
        }

        return response;
    }

    /**
     * Возвращает account-level ассоциации для аккаунтов, в которых состоит пользователь.
     * Используется для отображения групповых лимитов аккаунта на дашборде.
     */
    public SlurmAssociationsResponseDTO getUserAccountAssociations(String username) {
        SlurmAssociationsResponseDTO userAssocs = getAssociations(null, username);

        Set<String> accountNames = (userAssocs != null && userAssocs.getAssociations() != null)
                ? userAssocs.getAssociations().stream()
                        .filter(a -> a.getUser() != null && !a.getUser().isBlank())
                        .map(SlurmAssociationDTO::getAccount)
                        .filter(a -> a != null && !a.isBlank())
                        .collect(Collectors.toSet())
                : Set.of();

        List<SlurmAssociationDTO> accountAssocs = new ArrayList<>();
        for (String account : accountNames) {
            SlurmAssociationsResponseDTO accResp = getAssociations(account, null);
            if (accResp != null && accResp.getAssociations() != null) {
                accResp.getAssociations().stream()
                        .filter(a -> a.getUser() == null || a.getUser().isBlank())
                        .forEach(accountAssocs::add);
            }
        }

        SlurmAssociationsResponseDTO result = new SlurmAssociationsResponseDTO();
        result.setAssociations(accountAssocs);
        return result;
    }

    // ── Ассоциации: WRITE (CLI) ──────────────────────────────────────────────

    public void createAssociation(String username, String accountName) {
        try {
            cliRunner.runSacctmgr("add", "user",
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
     * Удаляет ассоциацию пользователя с аккаунтом.
     * Использует подход: получить все ассоциации → удалить пользователя целиком →
     * восстановить оставшиеся. sacctmgr запрещает удаление единственной ассоциации.
     */
    public void deleteAssociation(String username, String accountName) {
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

        try {
            cliRunner.runSacctmgr("delete", "user", "name=" + username, "cluster=" + clusterName);
            log.debug("Пользователь '{}' удалён из кластера '{}' для переподключения аккаунтов",
                    username, clusterName);
        } catch (Exception e) {
            throw new RuntimeException("Не удалось удалить пользователя '"
                    + username + "' из кластера: " + e.getMessage(), e);
        }

        for (String account : remainingAccounts) {
            try {
                cliRunner.runSacctmgr("add", "user",
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

    /**
     * Устанавливает список разрешённых QOS и/или default QOS для ассоциации через sacctmgr.
     *
     * <pre>sacctmgr -i modify association where account=&lt;acc&gt; cluster=&lt;cluster&gt;
     *   [user=&lt;user&gt;] set qos=&lt;q1,q2&gt; [defaultqos=&lt;qos&gt;]</pre>
     *
     * @param account    имя аккаунта (обязательно)
     * @param user       имя пользователя; null/"" = account-level ассоциация
     * @param qosList    список QOS; null = без изменений, пустой список = очистить
     * @param defaultQos default QOS; null = без изменений, "" = очистить
     */
    public void setAssociationQos(String account, String user,
                                  List<String> qosList, String defaultQos) {
        try {
            boolean isUser = user != null && !user.isBlank();
            List<String> args = new ArrayList<>();
            if (isUser) {
                // sacctmgr -i modify user where name=<user> account=<account> cluster=<cluster> set ...
                args.addAll(Arrays.asList(
                        "modify", "user", "where",
                        "name=" + user,
                        "account=" + account,
                        "cluster=" + clusterName
                ));
            } else {
                // sacctmgr -i modify account where name=<account> cluster=<cluster> set ...
                args.addAll(Arrays.asList(
                        "modify", "account", "where",
                        "name=" + account,
                        "cluster=" + clusterName
                ));
            }
            args.add("set");
            if (qosList != null) {
                args.add("qos=" + String.join(",", qosList));
            }
            if (defaultQos != null) {
                args.add("defaultqos=" + defaultQos);
            }
            cliRunner.runSacctmgr(args.toArray(String[]::new));
            log.info("Обновлён QOS: account='{}', user='{}', qos={}, default='{}'",
                    account, user, qosList, defaultQos);
        } catch (Exception e) {
            throw new RuntimeException("Не удалось обновить QOS ассоциации: " + e.getMessage(), e);
        }
    }

    /**
     * Устанавливает лимиты TRES и заданий для ассоциации через sacctmgr.
     *
     * <pre>sacctmgr -i modify association where account=&lt;acc&gt; cluster=&lt;cluster&gt;
     *   [user=&lt;user&gt;] set [maxjobs=..] [grptres=..] [fairshare=..] ...</pre>
     *
     * <p>null = не изменять; -1 = UNLIMITED; 0 = снять лимит.</p>
     */
    public void setAssociationLimits(SetAssociationLimitsRequest req) {
        try {
            String user = req.getUser();
            boolean isUser = user != null && !user.isBlank();
            List<String> args = new ArrayList<>();
            if (isUser) {
                // sacctmgr -i modify user where name=<user> account=<account> cluster=<cluster> set ...
                args.addAll(Arrays.asList(
                        "modify", "user", "where",
                        "name=" + user,
                        "account=" + req.getAccount(),
                        "cluster=" + clusterName
                ));
            } else {
                // sacctmgr -i modify account where name=<account> cluster=<cluster> set ...
                args.addAll(Arrays.asList(
                        "modify", "account", "where",
                        "name=" + req.getAccount(),
                        "cluster=" + clusterName
                ));
            }
            args.add("set");

            // Индивидуальные лимиты
            if (req.getMaxJobs() != null)           args.add("maxjobs=" + req.getMaxJobs());
            if (req.getMaxJobsAccrue() != null)     args.add("maxjobsaccrue=" + req.getMaxJobsAccrue());
            if (req.getMaxSubmitJobs() != null)     args.add("maxsubmitjobs=" + req.getMaxSubmitJobs());
            if (req.getMaxWallMinutes() != null)
                                                     args.add("maxwall=" + SlurmCliRunner.minutesToHhMmSs(req.getMaxWallMinutes()));
            if (notBlank(req.getMaxTresPerJob()))   args.add("maxtresperjob=" + req.getMaxTresPerJob().trim());
            if (notBlank(req.getMaxTresPerNode()))  args.add("maxtrespernode=" + req.getMaxTresPerNode().trim());
            if (notBlank(req.getMaxTresMinsPerJob()))
                                                     args.add("maxtresminsperjob=" + req.getMaxTresMinsPerJob().trim());

            // Fairshare
            if (req.getFairshare() != null)         args.add("fairshare=" + req.getFairshare());

            cliRunner.runSacctmgr(args.toArray(String[]::new));
            log.info("Обновлены лимиты ассоциации: account='{}', user='{}'",
                    req.getAccount(), req.getUser());
        } catch (Exception e) {
            throw new RuntimeException("Не удалось обновить лимиты ассоциации: " + e.getMessage(), e);
        }
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }

    // ── Регистрация пользователя (CLI) ───────────────────────────────────────

    public void registerUserInSlurm(String username, String accountName, UserRole role) {
        String resolvedAccount = (accountName != null && !accountName.isBlank())
                ? accountName
                : defaultAccount;
        String adminLevel = (role == UserRole.ADMIN) ? "Administrator" : "None";

        try {
            cliRunner.runSacctmgr("add", "user",
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

    public void updateSlurmAdminLevel(String username, UserRole role) {
        String adminLevel = (role == UserRole.ADMIN) ? "Administrator" : "None";
        try {
            cliRunner.runSacctmgr("modify", "user", "name=" + username, "set", "adminlevel=" + adminLevel);
            log.info("Обновлён adminlevel пользователя '{}' → {}", username, adminLevel);
        } catch (Exception e) {
            log.error("Не удалось обновить adminlevel для '{}': {}", username, e.getMessage());
            throw new RuntimeException("Не удалось обновить adminlevel: " + e.getMessage(), e);
        }
    }

    public void deleteUserFromSlurm(String username) {
        try {
            cliRunner.runSacctmgr("delete", "user", "name=" + username);
            log.info("Пользователь '{}' удалён из slurmdbd", username);
        } catch (Exception e) {
            log.error("Не удалось удалить '{}' из slurmdbd: {}", username, e.getMessage());
            throw new RuntimeException("Не удалось удалить пользователя из slurmdbd: "
                    + e.getMessage(), e);
        }
    }

    // ── Инициализация (CLI) ──────────────────────────────────────────────────

    public void ensureDefaultAccountExists() {
        try {
            if (!cliRunner.slurmAccountExistsCli(defaultAccount)) {
                cliRunner.runSacctmgr("add", "account",
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

    public void ensureAdminSlurmSetup(String username) {
        try {
            if (!cliRunner.slurmAccountExistsCli(adminAccount)) {
                cliRunner.runSacctmgr("add", "account",
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
            if (!cliRunner.slurmUserExistsCli(username)) {
                cliRunner.runSacctmgr("add", "user",
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
}