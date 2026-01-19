package ru.krezd.diploma.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * DTO для запроса на вход
 */
@Data
public class LoginRequest
{
    @NotBlank(message = "Username не может быть пустым")
    private String username;

    @NotBlank(message = "Password не может быть пустым")
    private String password;
}
