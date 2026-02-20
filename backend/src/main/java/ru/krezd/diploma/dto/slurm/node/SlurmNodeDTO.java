package ru.krezd.diploma.dto.slurm.node;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.krezd.diploma.dto.slurm.SlurmUint64;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmNodeDTO {

    /**
     * Node architecture (e.g., x86_64).
     */
    private String architecture;

    /**
     * BurstBuffer network address.
     */
    private String burstbufferNetworkAddress;

    /**
     * Number of boards in the node.
     */
    private Integer boards;

    /**
     * Boot time (UNIX timestamp).
     */
    private SlurmUint64 bootTime;

    /**
     * Cluster name.
     */
    private String clusterName;

    /**
     * Number of cores per node.
     */
    private Integer cores;

    /**
     * Number of specialized cores (e.g., for OS).
     */
    private Integer specializedCores;

    /**
     * Default CPU binding type.
     */
    private Integer cpuBinding;

    /**
     * CPU load average.
     */
    private Integer cpuLoad;

    /**
     * Free memory in MB.
     */
    private SlurmUint64 freeMem;

    /**
     * Total CPUs in the node.
     */
    private Integer cpus;

    /**
     * Effective number of CPUs (after specialized cores).
     */
    private Integer effectiveCpus;

    /**
     * Specialized CPUs (list).
     */
    private String specializedCpus;

    /**
     * Energy accounting data.
     */
    private SlurmAcctGatherEnergy energy;

    /**
     * External sensors data.
     */
    private SlurmExtSensorsData externalSensors;

    /**
     * Arbitrary string for site use.
     */
    private String extra;

    /**
     * Power management data.
     */
    private SlurmPowerMgmtData power;

    /**
     * Available features of the node (list).
     */
    private List<String> features;

    /**
     * Active features of the node (list).
     */
    private List<String> activeFeatures;

    /**
     * Generic resources (GRES) configured.
     */
    private String gres;

    /**
     * Drained GRES.
     */
    private String gresDrained;

    /**
     * GRES in use.
     */
    private String gresUsed;

    /**
     * Cloud instance ID.
     */
    private String instanceId;

    /**
     * Cloud instance type.
     */
    private String instanceType;

    /**
     * Timestamp when node was last busy.
     */
    private SlurmUint64 lastBusy;

    /**
     * MCS label (if enabled).
     */
    private String mcsLabel;

    /**
     * Specialized memory in MB.
     */
    private Long specializedMemory;

    /**
     * Node name.
     */
    private String name;

    /**
     * State the node will assume after reboot.
     */
    private List<SlurmNodeState> nextStateAfterReboot;

    /**
     * Communication name (same as hostname usually).
     */
    private String address;

    /**
     * Node hostname.
     */
    private String hostname;

    /**
     * Current node state(s).
     */
    private List<SlurmNodeState> state;

    /**
     * Operating system.
     */
    private String operatingSystem;

    /**
     * Owner of the node (if private).
     */
    private String owner;

    /**
     * Partitions this node belongs to.
     */
    private List<String> partitions;

    /**
     * Communication port.
     */
    private Integer port;

    /**
     * Real memory in MB.
     */
    private Long realMemory;

    /**
     * Admin comment.
     */
    private String comment;

    /**
     * Reason for node being down/drained.
     */
    private String reason;

    /**
     * Timestamp when reason was last changed.
     */
    private SlurmUint64 reasonChangedAt;

    /**
     * User who set the reason.
     */
    private String reasonSetByUser;

    /**
     * Time after which node will automatically resume (seconds).
     */
    private SlurmUint64 resumeAfter;

    /**
     * Reservation name if node is reserved.
     */
    private String reservation;

    /**
     * Allocated memory in MB.
     */
    private Long allocMemory;

    /**
     * Allocated CPUs.
     */
    private Integer allocCpus;

    /**
     * Idle CPUs (allocated but idle?).
     */
    private Integer allocIdleCpus;

    /**
     * TRES currently used.
     */
    private String tresUsed;

    /**
     * Weighted TRES (for billing).
     */
    private Double tresWeighted;

    /**
     * slurmd start time.
     */
    private SlurmUint64 slurmdStartTime;

    /**
     * Number of sockets in the node.
     */
    private Integer sockets;

    /**
     * Number of threads per core.
     */
    private Integer threads;

    /**
     * Temporary disk space in MB.
     */
    private Integer temporaryDisk;

    /**
     * Node weight for scheduling.
     */
    private Integer weight;

    /**
     * TRES string (e.g., "cpu=24,mem=128G").
     */
    private String tres;

    /**
     * slurmd version.
     */
    private String version;
}
