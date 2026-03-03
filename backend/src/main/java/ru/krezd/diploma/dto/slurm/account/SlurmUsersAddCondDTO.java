package ru.krezd.diploma.dto.slurm.account;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.util.List;

/**
 * Maps v0.0.40_users_add_cond — фильтр/условие для POST /users_association.
 * Поле users обязательно.
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SlurmUsersAddCondDTO {
    private List<String> users;
    private List<String> accounts;
    private List<String> clusters;
    private List<String> partitions;
    private List<String> wckeys;
}