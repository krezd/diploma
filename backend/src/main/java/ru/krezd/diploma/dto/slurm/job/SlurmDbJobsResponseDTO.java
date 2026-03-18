package ru.krezd.diploma.dto.slurm.job;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.krezd.diploma.dto.slurm.SlurmErrorDTO;
import ru.krezd.diploma.dto.slurm.SlurmMetaDTO;
import ru.krezd.diploma.dto.slurm.SlurmWarningDTO;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

import java.util.List;

/**
 * Ответ на запрос архивных заданий из slurmdbd.
 * Соответствует схеме v0.0.40_openapi_slurmdbd_jobs_resp.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmDbJobsResponseDTO {

    private List<SlurmDbJobDTO> jobs;

    private SlurmMetaDTO meta;

    private List<SlurmErrorDTO> errors;
    private List<SlurmWarningDTO> warnings;
}