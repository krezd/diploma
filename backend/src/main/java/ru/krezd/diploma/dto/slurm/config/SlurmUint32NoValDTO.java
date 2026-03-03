package ru.krezd.diploma.dto.slurm.config;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * v0.0.40_uint32_no_val — целое число с флагами set/infinite.
 */
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class SlurmUint32NoValDTO {
    private Boolean set;
    private Boolean infinite;
    private Long number;
}