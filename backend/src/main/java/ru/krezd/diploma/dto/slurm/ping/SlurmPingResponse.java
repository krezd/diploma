package ru.krezd.diploma.dto.slurm.ping;

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
 * Ответ slurmrestd на ping-запрос.
 * Соответствует схеме v0.0.40_openapi_ping_array_resp.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmPingResponse {

    /** Результаты ping для каждого контроллера SLURM. */
    private List<SlurmPingDTO> pings;

    /** Мета-информация о запросе. */
    private SlurmMetaDTO meta;

    /** Список ошибок. */
    private List<SlurmErrorDTO> errors;

    /** Список предупреждений. */
    private List<SlurmWarningDTO> warnings;
}