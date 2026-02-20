package ru.krezd.diploma.dto.slurm.node;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.krezd.diploma.dto.slurm.SlurmUint32;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmAcctGatherEnergy {

    /**
     * Average power consumption (watts).
     */
    private Integer averageWatts;

    /**
     * Base consumed energy (joules).
     */
    private Long baseConsumedEnergy;

    /**
     * Consumed energy (joules).
     */
    private Long consumedEnergy;

    /**
     * Current power consumption (watts).
     */
    private SlurmUint32 currentWatts;

    /**
     * Previous consumed energy (joules).
     */
    private Long previousConsumedEnergy;

    /**
     * Last collected timestamp.
     */
    private Long lastCollected;
}
