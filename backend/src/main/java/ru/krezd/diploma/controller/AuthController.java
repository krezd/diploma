package ru.krezd.diploma.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import ru.krezd.diploma.dto.AuthResponse;
import ru.krezd.diploma.dto.LoginRequest;
import ru.krezd.diploma.dto.RefreshRequest;
import ru.krezd.diploma.dto.RegisterRequest;
import ru.krezd.diploma.entity.RefreshToken;
import ru.krezd.diploma.entity.User;
import ru.krezd.diploma.enums.UserRole;
import ru.krezd.diploma.repository.RefreshTokenRepository;
import ru.krezd.diploma.service.AppSettingService;
import ru.krezd.diploma.service.JwtService;
import ru.krezd.diploma.service.RefreshTokenService;
import ru.krezd.diploma.service.UserService;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController
{
    private final AuthenticationManager authenticationManager;
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final AppSettingService appSettingService;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final RefreshTokenRepository refreshTokenRepository;

    /** Публичный endpoint: возвращает, разрешена ли самостоятельная регистрация. */
    @GetMapping("/registration-status")
    public ResponseEntity<Map<String, Boolean>> registrationStatus() {
        return ResponseEntity.ok(Map.of("enabled", appSettingService.isRegistrationEnabled()));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest registerRequest)
    {
        if (!appSettingService.isRegistrationEnabled()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Самостоятельная регистрация отключена администратором");
        }
        try
        {
            User user = userService.createUser(
                    registerRequest.getUsername(),
                    passwordEncoder.encode(registerRequest.getPassword()),
                    registerRequest.getName(),
                    UserRole.REGULAR
            );

            String accessToken = jwtService.generateToken(user.getUsername(), user.getRole().name());
            RefreshToken refreshToken = refreshTokenService.createOrUpdateToken(user);

            AuthResponse response = AuthResponse.builder()
                    .accessToken(accessToken)
                    .refreshToken(refreshToken.getToken())
                    .build();

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
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

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest)
    {
        try
        {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequest.getUsername(),
                            loginRequest.getPassword()
                    )
            );
            UserDetails userDetails = userService.loadUserByUsername(loginRequest.getUsername());
            User user = userService.findByUsername(loginRequest.getUsername())
                    .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

            String accessToken = jwtService.generateToken(userDetails.getUsername(), user.getRole().name());
            RefreshToken refreshToken = refreshTokenService.createOrUpdateToken(user);

            AuthResponse response = AuthResponse.builder()
                    .accessToken(accessToken)
                    .refreshToken(refreshToken.getToken())
                    .build();

            return ResponseEntity.ok(response);
        }
        catch (BadCredentialsException ex)
        {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Неверный username или password");
        }
        catch (Exception ex)
        {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Ошибка при входе: " + ex.getMessage());
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@Valid @RequestBody RefreshRequest refreshRequest)
    {
        try
        {
            String refreshTokenValue = refreshRequest.getRefreshToken();

            if (!refreshTokenService.validateToken(refreshTokenValue))
            {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Refresh token невалиден или истек");
            }

            Optional<RefreshToken> tokenOpt = refreshTokenRepository.findByToken(refreshTokenValue);
            if (tokenOpt.isEmpty())
            {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Refresh token не найден");
            }

            RefreshToken refreshToken = tokenOpt.get();
            User user = refreshToken.getUser();

            String newAccessToken = jwtService.generateToken(user.getUsername(), user.getRole().name());
            RefreshToken newRefreshToken = refreshTokenService.createOrUpdateToken(user);

            AuthResponse response = AuthResponse.builder()
                    .accessToken(newAccessToken)
                    .refreshToken(newRefreshToken.getToken())
                    .build();

            return ResponseEntity.ok(response);
        }
        catch (Exception ex)
        {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Ошибка при обновлении токена: " + ex.getMessage());
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@Valid @RequestBody RefreshRequest refreshRequest)
    {
        try
        {
            String refreshTokenValue = refreshRequest.getRefreshToken();

            // Находим refresh token в БД
            Optional<RefreshToken> tokenOpt = refreshTokenRepository.findByToken(refreshTokenValue);
            if (tokenOpt.isEmpty())
            {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("Refresh token не найден");
            }

            RefreshToken refreshToken = tokenOpt.get();

            // Отзываем токен (помечаем как неактивный)
            refreshToken.setAlive(false);
            refreshTokenRepository.save(refreshToken);

            return ResponseEntity.ok("Выход выполнен успешно");
        }
        catch (Exception ex)
        {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Ошибка при выходе: " + ex.getMessage());
        }
    }
}
