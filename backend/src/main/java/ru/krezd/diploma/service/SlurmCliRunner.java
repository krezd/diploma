package ru.krezd.diploma.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Общий CLI-runner для всех sacctmgr-операций.
 * Инкапсулирует запуск процесса, обработку идемпотентности и логирование.
 */
@Component
@Slf4j
public class SlurmCliRunner {

    /**
     * Выполняет sacctmgr с флагом -i (без запроса подтверждения).
     * Идемпотентные «ошибки» sacctmgr (Nothing new, already exists и т.п.)
     * логируются как debug, а не выбрасывают исключение.
     */
    public void runSacctmgr(String... args) throws IOException, InterruptedException {
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

    /**
     * Возвращает true, если аккаунт с указанным именем существует в slurmdbd.
     */
    public boolean slurmAccountExistsCli(String accountName) throws IOException, InterruptedException {
        ProcessBuilder pb = new ProcessBuilder(
                "sudo", "sacctmgr", "-n", "-P", "show", "account", "name=" + accountName);
        pb.redirectErrorStream(true);
        Process process = pb.start();
        String output = new BufferedReader(new InputStreamReader(process.getInputStream()))
                .lines().collect(Collectors.joining("\n"));
        process.waitFor();
        return !output.isBlank();
    }

    /**
     * Возвращает true, если пользователь с указанным именем существует в slurmdbd.
     */
    public boolean slurmUserExistsCli(String username) throws IOException, InterruptedException {
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
     * Выполняет sacctmgr (без флага -i) и возвращает stdout.
     * Используется для read-операций: show qos, show assoc и т.п.
     */
    public String runSacctmgrShow(String... args) throws IOException, InterruptedException {
        List<String> command = new ArrayList<>();
        command.add("sudo");
        command.add("sacctmgr");
        command.addAll(Arrays.asList(args));
        log.debug("sacctmgr show: {}", String.join(" ", command));
        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(true);
        Process process = pb.start();
        String output = new BufferedReader(new InputStreamReader(process.getInputStream()))
                .lines().collect(Collectors.joining("\n"));
        process.waitFor();
        return output;
    }

    /**
     * Конвертирует минуты в строку HH:MM:SS для sacctmgr.
     * -1L → "UNLIMITED", 0L → "00:00:00"
     */
    public static String minutesToHhMmSs(Long minutes) {
        if (minutes == null) return null;
        if (minutes == -1L) return "UNLIMITED";
        long h = minutes / 60;
        long m = minutes % 60;
        return String.format("%02d:%02d:00", h, m);
    }
}