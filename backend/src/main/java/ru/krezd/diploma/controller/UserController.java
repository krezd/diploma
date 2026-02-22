package ru.krezd.diploma.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import ru.krezd.diploma.dto.*;
import ru.krezd.diploma.entity.User;
import ru.krezd.diploma.enums.UserRole;
import ru.krezd.diploma.service.AppSettingService;
import ru.krezd.diploma.service.UserService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final AppSettingService appSettingService;

    // ── Профиль текущего пользователя ────────────────────────────────────────

    @GetMapping("/me")
    public ResponseEntity<UserDto> getMyProfile(Authentication authentication) {
        return userService.findByUsername(authentication.getName())
                .map(UserDto::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateMyProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            Authentication authentication) {
        try {
            User updated = userService.updateProfile(authentication.getName(), request.getName());
            return ResponseEntity.ok(UserDto.from(updated));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @PutMapping("/me/password")
    public ResponseEntity<?> changeMyPassword(
            @Valid @RequestBody ChangePasswordRequest request,
            Authentication authentication) {
        try {
            userService.changePassword(
                    authentication.getName(),
                    request.getOldPassword(),
                    request.getNewPassword(),
                    request.getConfirmPassword()
            );
            return ResponseEntity.ok(Map.of("message", "Пароль успешно изменён"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    // ── Управление пользователями (только ADMIN) ─────────────────────────────

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserDto>> getAllUsers() {
        List<UserDto> users = userService.getAllUsers().stream()
                .map(UserDto::from)
                .toList();
        return ResponseEntity.ok(users);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createUser(@Valid @RequestBody AdminRegisterRequest request) {
        try {
            User user = userService.createUser(
                    request.getUsername(),
                    passwordEncoder.encode(request.getPassword()),
                    request.getName(),
                    UserRole.valueOf(request.getRole())
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(UserDto.from(user));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Ошибка при создании пользователя: " + ex.getMessage());
        }
    }

    @PutMapping("/{username}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateUser(
            @PathVariable String username,
            @Valid @RequestBody AdminUpdateUserRequest request) {
        try {
            UserRole newRole = request.getRole() != null ? UserRole.valueOf(request.getRole()) : null;
            User updated = userService.adminUpdateUser(username, request.getName(), newRole);
            return ResponseEntity.ok(UserDto.from(updated));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @DeleteMapping("/{username}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable String username) {
        userService.deleteUser(username);
        return ResponseEntity.noContent().build();
    }

    // ── Настройки регистрации (только ADMIN) ─────────────────────────────────

    @GetMapping("/settings/registration")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Boolean>> getRegistrationSetting() {
        return ResponseEntity.ok(Map.of("enabled", appSettingService.isRegistrationEnabled()));
    }

    @PutMapping("/settings/registration")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Boolean>> setRegistrationSetting(
            @RequestBody Map<String, Boolean> body) {
        Boolean enabled = body.get("enabled");
        if (enabled == null) {
            return ResponseEntity.badRequest().build();
        }
        appSettingService.setRegistrationEnabled(enabled);
        return ResponseEntity.ok(Map.of("enabled", enabled));
    }
}