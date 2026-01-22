package ru.krezd.diploma.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * DTO для запроса на регистрацию
 */
@Data
public class RegisterRequest
{
    @NotBlank(message = "Username не может быть пустым")
    @Size(min = 3, max = 50, message = "Username должен быть от 3 до 50 символов")
    @Pattern(regexp = "^[a-zA-Z0-9]([._-](?![._-])|[a-zA-Z0-9]){3,48}[a-zA-Z0-9]$")
    private String username;

    @NotBlank(message = "Password не может быть пустым")
    @Size(min = 1, message = "Password должен быть минимум 6 символов")
    private String password;

    private String name;
}
