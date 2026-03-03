package ru.krezd.diploma.dto.slurm.account;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.util.List;

/**
 * Maps v0.0.40_user_short — используется в теле POST /users_association.
 * Поле adminlevel принимает значения: "Not Set", "None", "Operator", "Administrator".
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SlurmUserShortDTO {
    private List<String> adminlevel;
    private String defaultaccount;
    private String defaultwckey;
}