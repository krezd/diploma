package ru.krezd.diploma.dto.slurm;

import lombok.Data;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

@Data
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmWarningDTO {
    private String description;
    private String source;
}

