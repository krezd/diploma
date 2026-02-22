package ru.krezd.diploma.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import ru.krezd.diploma.config.GroupMapper;
import ru.krezd.diploma.entity.User;
import ru.krezd.diploma.enums.UserRole;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.stream.Collectors;

@Service
@Slf4j
public class LinuxUserService {

    @Value("${linux.user.default-shell:/bin/bash}")
    private String defaultShell;

    @Autowired
    private  GroupMapper groupMapper;

    /**
     * Создание Linux пользователя
     */
    public void createUser(String username, UserRole role) {
        log.info("Creating Linux user: {} with role: {}", username, role);

        try {
            // Проверяем, существует ли уже пользователь
            if (userExists(username)) {
                log.warn("Linux user {} already exists", username);
                return;
            }

            // Формируем команду создания
            ProcessBuilder pb = buildUserCreateCommand(username);

            Process process = pb.start();
            int exitCode = process.waitFor();

            if (exitCode != 0) {
                String error = readError(process);
                throw new RuntimeException("Failed to create Linux user. Exit code: " + exitCode +
                        ". Error: " + error);
            }

            for(String group : groupMapper.getAdditionalGroups(role)){
                if (group != null && !group.equals(""))
                    addUserToGroup(username, group);
            }

            log.info("Linux user {} created successfully", username);

        } catch (Exception e) {
            log.error("Error creating Linux user: {}", username, e);
            throw new RuntimeException("Failed to create Linux user", e);
        }
    }

    /**
     * Удаление Linux пользователя
     */
    public void deleteUser(String username) {
        log.info("Deleting Linux user: {}", username);

        try {
            if (!userExists(username)) {
                log.warn("Linux user {} does not exist", username);
                return;
            }

            ProcessBuilder pb = new ProcessBuilder(
                    "sudo", "userdel", "-r", username  // -r удаляет домашнюю директорию
            );

            Process process = pb.start();
            int exitCode = process.waitFor();

            if (exitCode != 0) {
                String error = readError(process);
                // Не бросаем исключение при удалении, только логируем
                log.error("Failed to delete Linux user {}. Error: {}", username, error);
            } else {
                log.info("Linux user {} deleted successfully", username);
            }

        } catch (Exception e) {
            log.error("Error deleting Linux user: {}", username, e);
        }
    }

    /**
     * Проверка существования пользователя
     */
    public boolean userExists(String username) {
        try {
            ProcessBuilder pb = new ProcessBuilder("id", username);
            Process process = pb.start();
            return process.waitFor() == 0;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Добавление пользователя в группу
     */
    public void addUserToGroup(String username, String group) {
        try {
            // Проверяем, существует ли группа
            if (!groupExists(group)) {
                log.warn("Group {} does not exist", group);
                return;
            }

            ProcessBuilder pb = new ProcessBuilder(
                    "sudo", "usermod", "-a", "-G", group, username
            );

            Process process = pb.start();
            int exitCode = process.waitFor();

            if (exitCode != 0) {
                String error = readError(process);
                log.error("Failed to add user {} to group {}. Error: {}", username, group, error);
            } else {
                log.info("User {} added to group {}", username, group);
            }

        } catch (Exception e) {
            log.error("Error adding user to group", e);
        }
    }

    /**
     * Получение информации о пользователе
     */
    public String getUserInfo(String username) {
        try {
            ProcessBuilder pb = new ProcessBuilder("id", username);
            Process process = pb.start();

            if (process.waitFor() != 0) {
                return null;
            }

            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream()))) {
                return reader.lines().collect(Collectors.joining("\n"));
            }

        } catch (Exception e) {
            log.error("Error getting user info", e);
            return null;
        }
    }

    public String getUid(String username) {
        try {
            ProcessBuilder pb = new ProcessBuilder("id","-u", username);
            Process process = pb.start();

            if (process.waitFor() != 0) {
                return null;
            }

            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream()))) {
                return reader.readLine();
            }

        } catch (Exception e) {
            log.error("Error getting user id", e);
            return null;
        }
    }


    /**
     * Формирование команды создания пользователя
     */
    private ProcessBuilder buildUserCreateCommand(String username) {
        return new ProcessBuilder(
                "sudo", "useradd",
                "-s", defaultShell,      // shell
                username
        );
    }

    /**
     * Проверка существования группы
     */
    private boolean groupExists(String groupName) {
        try {
            ProcessBuilder pb = new ProcessBuilder("getent", "group", groupName);
            Process process = pb.start();
            return process.waitFor() == 0;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Чтение ошибки из процесса
     */
    private String readError(Process process) throws IOException {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getErrorStream()))) {
            return reader.lines().collect(Collectors.joining("\n"));
        }
    }

    /**
     * Чтение вывода из процесса
     */
    private String readOutput(Process process) throws IOException {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream()))) {
            return reader.lines().collect(Collectors.joining("\n"));
        }
    }
}
