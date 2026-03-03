package ru.krezd.diploma.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateAccountRequest {
    @NotBlank(message = "Имя аккаунта не может быть пустым")
    private String name;
    private String description;
    private String organization;
}