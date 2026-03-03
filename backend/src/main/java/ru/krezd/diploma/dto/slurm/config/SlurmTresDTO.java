package ru.krezd.diploma.dto.slurm.config;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.NoArgsConstructor;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

/**
 * Trackable Resource (TRES) — ресурс, учитываемый slurmdbd.
 * Соответствует схеме v0.0.40_tres из ответа GET /slurmdb/v0.0.40/config.
 */
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmTresDTO {
    /** Тип ресурса: cpu, mem, node, billing, gres, license и др. */
    private String type;
    /** Имя (для gres и license). Пустое для базовых типов (cpu, mem). */
    private String name;
    /** Числовой идентификатор TRES. */
    private Integer id;
    /** Текущее количество (опционально, есть только в некоторых контекстах). */
    private Long count;
}