package ru.krezd.diploma.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AdminUpdateUserRequest {

    @Size(max = 100, message = "Имя не должно превышать 100 символов")
    private String name;

    /** REGULAR или ADMIN */
    private String role;
}