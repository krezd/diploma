package ru.krezd.diploma.dto.slurm.config;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.krezd.diploma.dto.slurm.SlurmErrorDTO;
import ru.krezd.diploma.dto.slurm.SlurmWarningDTO;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

import java.util.List;

/**
 * Ответ GET /slurmdb/v0.0.40/config — полная конфигурация slurmdbd.
 * Соответствует схеме v0.0.40_openapi_slurmdbd_config_resp.
 */
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmDbConfigResponseDTO {
    private List<SlurmClusterRecDTO> clusters;
    private List<SlurmTresDTO> tres;
    private List<SlurmDbQosDTO> qos;
    private List<SlurmErrorDTO> errors;
    private List<SlurmWarningDTO> warnings;
}