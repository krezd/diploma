package ru.krezd.diploma.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * DTO для запроса на обновление токена
 */
@Data
public class RefreshRequest
{
    @NotBlank(message = "Refresh token не может быть пустым")
    private String refreshToken;
}
