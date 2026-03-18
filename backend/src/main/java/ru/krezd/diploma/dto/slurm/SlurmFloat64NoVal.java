package ru.krezd.diploma.dto.slurm;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 64-bit floating point number with flags.
 * Соответствует схеме v0.0.40_float64_no_val.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SlurmFloat64NoVal {

    private Boolean set;
    private Boolean infinite;
    private Double number;
}