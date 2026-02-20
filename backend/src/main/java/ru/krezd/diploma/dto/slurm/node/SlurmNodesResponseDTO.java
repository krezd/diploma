package ru.krezd.diploma.dto.slurm.node;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.krezd.diploma.dto.slurm.SlurmErrorDTO;
import ru.krezd.diploma.dto.slurm.SlurmMetaDTO;
import ru.krezd.diploma.dto.slurm.SlurmUint64;
import ru.krezd.diploma.dto.slurm.SlurmWarningDTO;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmNodesResponseDTO {

    /**
     * List of nodes.
     */
    private List<SlurmNodeDTO> nodes;

    /**
     * Timestamp of last node change.
     */
    private SlurmUint64 lastUpdate;

    /**
     * Slurm meta information.
     */
    private SlurmMetaDTO meta;

    /**
     * List of errors.
     */
    private List<SlurmErrorDTO> errors;

    /**
     * List of warnings.
     */
    private List<SlurmWarningDTO> warnings;
}

