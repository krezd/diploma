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
 * Ответ на запрос отправки задания в SLURM.
 * Соответствует схеме v0.0.40_openapi_job_submit_response.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmJobSubmitResponse {

    /** Идентификатор созданного задания. */
    private Integer jobId;

    /** Идентификатор шага задания (если применимо). */
    private String stepId;

    /** Сообщение от Lua-плагина отправки заданий (если настроен). */
    private String jobSubmitUserMsg;

    /** Мета-информация о запросе. */
    private SlurmMetaDTO meta;

    /** Список ошибок. */
    private List<SlurmErrorDTO> errors;

    /** Список предупреждений. */
    private List<SlurmWarningDTO> warnings;
}