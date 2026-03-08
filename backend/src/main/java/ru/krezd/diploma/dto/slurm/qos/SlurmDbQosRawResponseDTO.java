package ru.krezd.diploma.dto.slurm.qos;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.krezd.diploma.dto.slurm.config.SlurmDbQosDTO;

import java.util.List;

/**
 * Сырой ответ GET /slurmdb/v0.0.40/qos от slurmrestd.
 * Используется только внутри SlurmQosService для десериализации,
 * наружу отдаётся SlurmQosListResponseDTO.
 */
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class SlurmDbQosRawResponseDTO {
    private List<SlurmDbQosDTO> qos;
}