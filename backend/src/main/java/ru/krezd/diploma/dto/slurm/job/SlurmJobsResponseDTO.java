package ru.krezd.diploma.dto.slurm.job;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.krezd.diploma.dto.slurm.SlurmErrorDTO;
import ru.krezd.diploma.dto.slurm.SlurmMetaDTO;
import ru.krezd.diploma.dto.slurm.SlurmUint64;
import ru.krezd.diploma.dto.slurm.SlurmWarningDTO;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmJobsResponseDTO {

    private List<SlurmJobDTO> jobs;

    private SlurmUint64 lastBackfill;
    private SlurmUint64 lastUpdate;

    private SlurmMetaDTO meta;

    private List<SlurmErrorDTO> errors;
    private List<SlurmWarningDTO> warnings;
}