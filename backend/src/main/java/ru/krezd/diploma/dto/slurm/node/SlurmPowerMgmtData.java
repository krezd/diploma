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
public class SlurmPowerMgmtData {

    /**
     * Maximum power cap (watts).
     */
    private SlurmUint32 maximumWatts;

    /**
     * Current power consumption (watts).
     */
    private Integer currentWatts;

    /**
     * Total energy consumed (joules).
     */
    private Long totalEnergy;

    /**
     * New maximum power cap (watts).
     */
    private Integer newMaximumWatts;

    /**
     * Peak power consumption (watts).
     */
    private Integer peakWatts;

    /**
     * Lowest power consumption (watts).
     */
    private Integer lowestWatts;

    /**
     * Timestamp when new job will be allowed.
     */
    private SlurmUint64 newJobTime;

    /**
     * Power management state.
     */
    private Integer state;

    /**
     * Start time of the day for power tracking.
     */
    private Long timeStartDay;
}