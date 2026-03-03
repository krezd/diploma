package ru.krezd.diploma.dto.slurm.account;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SlurmAssociationDTO {
    private String user;
    private String account;
    private String cluster;
    private String partition;
    // id намеренно отсутствует: в v0.0.40_assoc это вложенный объект assoc_short, не число
}