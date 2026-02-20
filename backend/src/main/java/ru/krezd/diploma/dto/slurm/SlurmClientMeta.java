package ru.krezd.diploma.dto.slurm;

import lombok.Data;

@Data
public class SlurmClientMeta {
    private String source;
    private String user;
    private String group;
}

