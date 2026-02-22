package ru.krezd.diploma.dto.slurm.diag;

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
 * Ответ slurmrestd на запрос диагностики.
 * Соответствует схеме v0.0.40_openapi_diag_resp.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmDiagResponse {

    /** Статистика планировщика. */
    private SlurmStatsMsg statistics;

    /** Мета-информация о запросе. */
    private SlurmMetaDTO meta;

    /** Список ошибок. */
    private List<SlurmErrorDTO> errors;

    /** Список предупреждений. */
    private List<SlurmWarningDTO> warnings;
}