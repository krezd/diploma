package ru.krezd.diploma.dto.slurm.partition;

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

/**
 * Ответ slurmrestd на запрос списка партиций.
 * Соответствует схеме v0.0.40_openapi_partition_resp.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmPartitionsResponseDTO {

    /** Список партиций. */
    private List<SlurmPartitionDTO> partitions;

    /** Временная метка последнего обновления данных. */
    private SlurmUint64 lastUpdate;

    /** Мета-информация о запросе. */
    private SlurmMetaDTO meta;

    /** Список ошибок. */
    private List<SlurmErrorDTO> errors;

    /** Список предупреждений. */
    private List<SlurmWarningDTO> warnings;
}