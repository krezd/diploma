package ru.krezd.diploma.dto.slurm.qos;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;

/**
 * Один TRES из GET /slurmdb/v0.0.40/tres.
 * Пример: {"type": "gres", "name": "gpu", "id": 1001}
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmTresItemDTO {
    /** Тип ресурса: cpu, mem, node, gres, license, energy, billing, etc. */
    private String type;
    /** Имя подресурса (для gres/gpu → "gpu"; для cpu → null). */
    private String name;
    /** Числовой идентификатор TRES в slurmdbd. */
    private Long id;
}