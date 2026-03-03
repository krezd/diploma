package ru.krezd.diploma.dto.slurm.account;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * Тело запроса POST /slurmdb/v0.0.40/users_association.
 * Соответствует схеме v0.0.40_openapi_users_add_cond_resp.
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SlurmUserAssocRequest {
    private SlurmUserShortDTO user;
    @JsonProperty("association_condition")
    private SlurmUsersAddCondDTO associationCondition;
}