package ru.krezd.diploma.dto.slurm.config;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * v0.0.40_float64_no_val — число с плавающей точкой с флагами set/infinite.
 */
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class SlurmFloat64NoValDTO {
    private Boolean set;
    private Boolean infinite;
    private Double number;
}