package ru.krezd.diploma.dto.slurm.job;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.krezd.diploma.dto.slurm.SlurmUint32;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

import java.util.List;

/**
 * Информация о коде завершения процесса.
 * Соответствует схеме v0.0.40_process_exit_code_verbose.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmProcessExitCodeDTO {

    /** Статус завершения: INVALID, PENDING, SUCCESS, ERROR, SIGNALED, CORE_DUMPED. */
    private List<String> status;

    /** Числовой код возврата. */
    private SlurmUint32 returnCode;

    /** Информация о сигнале (если процесс завершён по сигналу). */
    private Signal signal;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class Signal {

        /** Числовой идентификатор сигнала. */
        private ru.krezd.diploma.dto.slurm.SlurmUint32 id;

        /** Имя сигнала (например, SIGTERM). */
        private String name;
    }
}