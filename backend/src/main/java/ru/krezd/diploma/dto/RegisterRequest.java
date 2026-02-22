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
    @Size(min = 2, max = 32, message = "Username должен быть от 2 до 32 символов")
    @Pattern(
        regexp = "^[a-z][a-z0-9_-]{1,31}$",
        message = "Username: строчная буква в начале, затем строчные буквы, цифры, _ или -. От 2 до 32 символов"
    )
    private String username;

    @NotBlank(message = "Password не может быть пустым")
    @Size(min = 1, message = "Password должен быть минимум 1 символов")
    private String password;

    private String name;
}
