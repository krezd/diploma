package ru.krezd.diploma.dto.slurm.ping;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

/**
 * Результат ping-проверки одного контроллера SLURM.
 * Соответствует схеме v0.0.40_ping.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmPingDTO {

    /** Имя хоста контроллера. */
    private String hostname;

    /** Статус доступности: "UP" или "DOWN". */
    private String pinged;

    /** Задержка ответа (мс). */
    private Integer latency;

    /**
     * Режим контроллера.
     * Возможные значения: "primary", "backup", "backup2", "backup3".
     */
    private String mode;
}