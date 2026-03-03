package ru.krezd.diploma.dto.slurm.account;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class SlurmAccountDTO {
    private String name;
    private String description;
    private String organization;
}