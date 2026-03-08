package ru.krezd.diploma.dto.slurm.qos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Ответ GET /api/slurm/qos — список QOS в плоском представлении.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SlurmQosListResponseDTO {
    private List<SlurmQosSummaryDTO> qos;
}