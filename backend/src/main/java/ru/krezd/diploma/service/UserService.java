package ru.krezd.diploma.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import ru.krezd.diploma.config.GroupMapper;
import ru.krezd.diploma.entity.User;
import ru.krezd.diploma.enums.UserRole;
import ru.krezd.diploma.repository.UserRepository;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class UserService implements UserDetailsService {
    private final UserRepository userRepository;
    private final FilesService filesService;
    private final LinuxUserService linuxUserService;
    private final GroupMapper groupMapper;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Пользователь не найден: " + username));

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getUsername())
                .password(user.getPassword())
                .roles(user.getRole().name())
                .build();
    }

    @Transactional
    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    @Transactional
    public User createUser(String username, String password, String name, UserRole role) throws IOException {
        if (userRepository.findByUsername(username).isPresent()) {
            throw new IllegalArgumentException("Пользователь с username '" + username + "' уже существует");
        }

        try {
            linuxUserService.createUser(
                    username,
                    role
            );
        } catch (Exception e) {
            log.error("Failed to create Linux user", e);
            throw new RuntimeException("Не удалось создать системного пользователя", e);
        }

        try {
            filesService.createUserDir(username);
        } catch (Exception e) {
            log.error("Failed to create user directory, rolling back Linux user", e);
            linuxUserService.deleteUser(username);
            throw new RuntimeException("Не удалось создать директорию пользователя", e);
        }
        try {
            User user = User.builder()
                    .username(username)
                    .password(password)
                    .name(name)
                    .role(role)
                    .build();

            User savedUser = userRepository.save(user);
            log.info("User {} created successfully in database", username);

            return savedUser;

        } catch (Exception e) {
            log.error("Failed to save user to database, rolling back Linux user and directory", e);
            // Откатываем создание Linux пользователя и директории
            linuxUserService.deleteUser(username);
            filesService.deleteUserDir(username);
            throw new RuntimeException("Не удалось сохранить пользователя в базу данных", e);
        }
        //TODO в идеале тут этого быть не должно (нарушение single...)
    }

    @Transactional
    public void deleteUser(String username) {
        log.info("Deleting user: {}", username);

        // Сначала удаляем из БД
        userRepository.findByUsername(username).ifPresent(user -> {
            userRepository.delete(user);
            log.info("User {} deleted from database", username);
        });

        // Затем удаляем Linux пользователя
        linuxUserService.deleteUser(username);

        // Удаляем директорию
        try {
            filesService.deleteUserDir(username);
        } catch (Exception e) {
            log.error("Failed to delete user directory: {}", username, e);
        }
    }

    @Transactional
    public User updateUserRole(String username, UserRole newRole) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден: " + username));

        UserRole oldRole = user.getRole();
        user.setRole(newRole);

        if (!oldRole.equals(newRole)) {
            for (String group : groupMapper.getAdditionalGroups(newRole)) {
                linuxUserService.addUserToGroup(username, group);
            }
            log.info("Updated Linux groups for user {} from {} to {}", username, oldRole, newRole);
        }

        return userRepository.save(user);
    }

    @Transactional
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @Transactional
    public User updateProfile(String username, String name) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден: " + username));
        user.setName(name);
        return userRepository.save(user);
    }

    @Transactional
    public void changePassword(String username, String oldPassword, String newPassword, String confirmPassword) {
        if (!newPassword.equals(confirmPassword)) {
            throw new IllegalArgumentException("Новый пароль и подтверждение не совпадают");
        }
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден: " + username));
        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new IllegalArgumentException("Текущий пароль указан неверно");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @Transactional
    public User adminUpdateUser(String username, String newName, UserRole newRole) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден: " + username));
        if (newName != null && !newName.isBlank()) {
            user.setName(newName);
        }
        if (newRole != null && !newRole.equals(user.getRole())) {
            UserRole oldRole = user.getRole();
            user.setRole(newRole);
            for (String group : groupMapper.getAdditionalGroups(newRole)) {
                linuxUserService.addUserToGroup(username, group);
            }
            log.info("Admin updated Linux groups for user {} from {} to {}", username, oldRole, newRole);
        }
        return userRepository.save(user);
    }
}
