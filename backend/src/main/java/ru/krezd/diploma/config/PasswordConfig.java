package ru.krezd.diploma.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * Отдельный конфиг для BCryptPasswordEncoder.
 * Вынесен из SecurityConfig, чтобы избежать circular dependency:
 * SecurityConfig → UserService → PasswordEncoder (SecurityConfig).
 */
@Configuration
public class PasswordConfig {

    @Bean
    public BCryptPasswordEncoder bCryptPasswordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
