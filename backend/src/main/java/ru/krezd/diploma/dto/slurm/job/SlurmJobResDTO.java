package ru.krezd.diploma.dto.slurm.job;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

import java.util.List;

/**
 * Ресурсы, выделенные заданию.
 * Соответствует схеме v0.0.40_job_res.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmJobResDTO {

    /** Список узлов, выделенных заданию. */
    private String nodes;

    /** Количество выделенных ядер. */
    private Integer allocatedCores;

    /** Количество выделенных CPU. */
    private Integer allocatedCpus;

    /** Количество выделенных хостов. */
    private Integer allocatedHosts;

    /** Детальная информация о выделенных узлах (v0.0.40_job_res_nodes). */
    private List<Object> allocatedNodes;
}