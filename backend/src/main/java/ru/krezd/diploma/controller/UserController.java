package ru.krezd.diploma.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import ru.krezd.diploma.dto.AdminRegisterRequest;
import ru.krezd.diploma.entity.User;
import ru.krezd.diploma.enums.UserRole;
import ru.krezd.diploma.service.UserService;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/register")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> register(@Valid @RequestBody AdminRegisterRequest registerRequest)
    {
        try
        {
            User user = userService.createUser(
                    registerRequest.getUsername(),
                    passwordEncoder.encode(registerRequest.getPassword()),
                    registerRequest.getName(),
                    UserRole.valueOf(registerRequest.getRole())
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(user);
        }
        catch (IllegalArgumentException ex)
        {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ex.getMessage());
        }
        catch (Exception ex)
        {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Ошибка при регистрации: " + ex.getMessage());
        }
    }

    @DeleteMapping("/{username}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable String username) {
        userService.deleteUser(username);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{username}/role")
    @PreAuthorize("hasAnyRole('ADMIN', 'REGULAR')")
    public ResponseEntity<User> updateUserRole(
            @PathVariable String username,
            @RequestParam UserRole role) {
        User updatedUser = userService.updateUserRole(username, role);
        return ResponseEntity.ok(updatedUser);
    }
}
