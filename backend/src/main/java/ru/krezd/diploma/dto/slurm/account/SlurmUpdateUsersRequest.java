package ru.krezd.diploma.dto.slurm.account;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.util.List;

/**
 * Тело запроса POST /slurmdb/v0.0.40/users (обновление пользователей).
 * Соответствует схеме v0.0.40_openapi_users_resp.
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SlurmUpdateUsersRequest {
    private List<SlurmUserDTO> users;
}