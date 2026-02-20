package ru.krezd.diploma.dto.slurm;

import lombok.Data;

@Data
public class SlurmClusterMeta {

    private String release;
    private String cluster;

    private SlurmVersion version;
}

