package ru.krezd.diploma.dto.slurm;

import lombok.Data;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

@Data
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmErrorDTO {
    private String description;
    private Integer errorNumber;
    private String error;
    private String source;
}
