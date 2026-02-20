package ru.krezd.diploma.dto.slurm;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

import java.util.List;

/**
 * Базовый ответ Slurm REST API, содержащий мета-информацию, ошибки и предупреждения.
 * Соответствует схеме v0.0.40_openapi_resp.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmOpenapiResponse {

    /**
     * Мета-информация о запросе (версия Slurm, плагины, клиент и т.д.)
     */
    private SlurmMetaDTO meta;

    /**
     * Список ошибок, возникших при обработке запроса.
     */
    private List<SlurmErrorDTO> errors;

    /**
     * Список предупреждений.
     */
    private List<SlurmWarningDTO> warnings;
}
