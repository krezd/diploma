package ru.krezd.diploma.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AssociateUserRequest {
    @NotBlank(message = "Username не может быть пустым")
    private String username;
    @NotBlank(message = "Имя аккаунта не может быть пустым")
    private String accountName;
}