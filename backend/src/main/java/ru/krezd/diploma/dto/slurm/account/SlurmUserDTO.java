package ru.krezd.diploma.dto.slurm.account;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

/**
 * Минимальное представление v0.0.40_user — используется для обновления пользователя
 * через POST /slurmdb/v0.0.40/users.
 * Поле administrator_level принимает значения: "Not Set", "None", "Operator", "Administrator".
 * Поле name обязательно.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SlurmUserDTO {
    private String name;
    @JsonProperty("administrator_level")
    private List<String> administratorLevel;
}