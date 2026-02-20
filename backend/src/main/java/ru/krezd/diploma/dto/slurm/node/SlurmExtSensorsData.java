package ru.krezd.diploma.dto.slurm.node;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.krezd.diploma.dto.slurm.SlurmUint32;
import ru.krezd.diploma.dto.slurm.SlurmUint64;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmExtSensorsData {

    /**
     * Consumed energy (joules).
     */
    private SlurmUint64 consumedEnergy;

    /**
     * Temperature reading.
     */
    private SlurmUint32 temperature;

    /**
     * Energy update timestamp.
     */
    private Long energyUpdateTime;

    /**
     * Current power consumption (watts).
     */
    private Integer currentWatts;
}
