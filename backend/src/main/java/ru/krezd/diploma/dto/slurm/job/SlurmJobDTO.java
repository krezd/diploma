package ru.krezd.diploma.dto.slurm.job;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.krezd.diploma.dto.slurm.SlurmUint32;
import ru.krezd.diploma.dto.slurm.SlurmUint64;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmJobDTO {

    private Integer jobId;
    private String name;

    private String userName;
    private Integer userId;

    private String partition;

    private List<String> jobState;

    private SlurmUint64 submitTime;
    private SlurmUint64 startTime;
    private SlurmUint64 endTime;

    private SlurmUint32 nodeCount;
    private SlurmUint32 cpus;
    private SlurmUint32 tasks;

    private SlurmUint64 memoryPerCpu;

    private SlurmUint32 timeLimit;

    private String nodes;
    private String scheduledNodes;

    private String currentWorkingDirectory;

    private String standardOutput;
    private String standardError;

    private String stateReason;
}

