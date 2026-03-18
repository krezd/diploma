package ru.krezd.diploma.dto.slurm.job;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

/**
 * Тело запроса на отправку нового задания в SLURM.
 * Соответствует схеме v0.0.40_job_submit_req.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmJobSubmitRequest {

    /**
     * Текст bash-скрипта задания (включая #SBATCH директивы).
     * Пример: "#!/bin/bash\n#SBATCH --job-name=test\nsrun hostname"
     */
    private String script;

    /**
     * Параметры задания. Дополняют или переопределяют #SBATCH директивы в скрипте.
     */
    private SlurmJobDescMsg job;
}