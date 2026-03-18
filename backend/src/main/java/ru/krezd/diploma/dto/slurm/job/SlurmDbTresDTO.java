package ru.krezd.diploma.dto.slurm.job;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

/**
 * TRES (Trackable RESources) элемент.
 * Соответствует схеме v0.0.40_tres.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmDbTresDTO {

    /** Тип ресурса (cpu, mem, node, gres/gpu и т.д.). */
    private String type;

    /** Имя ресурса (для GRES). */
    private String name;

    /** Числовой идентификатор TRES. */
    private Integer id;

    /** Количество ресурса. */
    private Long count;
}