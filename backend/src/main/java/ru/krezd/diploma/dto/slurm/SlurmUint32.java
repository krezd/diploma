package ru.krezd.diploma.dto.slurm;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SlurmUint32 {

    private Boolean set;
    private Boolean infinite;
    private Long number;
}
