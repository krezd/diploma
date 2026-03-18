package ru.krezd.diploma.dto.slurm.job;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.krezd.diploma.dto.slurm.SlurmFloat64NoVal;
import ru.krezd.diploma.dto.slurm.SlurmUint32;
import ru.krezd.diploma.dto.slurm.SlurmUint64;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

import java.util.List;

/**
 * Информация о задании SLURM.
 * Соответствует схеме v0.0.40_job_info.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmJobDTO {

    // ── Идентификация ──────────────────────────────────────────────────────────

    private Integer jobId;
    private String name;
    private String account;
    private String cluster;
    private String partition;
    private String qos;
    private String wckey;

    // ── Пользователь / группа ─────────────────────────────────────────────────

    private Integer userId;
    private String userName;
    private Integer groupId;
    private String groupName;

    // ── Состояние задания ─────────────────────────────────────────────────────

    /**
     * Состояние задания: PENDING, RUNNING, SUSPENDED, COMPLETED, CANCELLED,
     * FAILED, TIMEOUT, NODE_FAIL, PREEMPTED, BOOT_FAIL, DEADLINE,
     * OUT_OF_MEMORY, LAUNCH_FAILED, UPDATE_DB, REQUEUED, REQUEUE_HOLD,
     * SPECIAL_EXIT, RESIZING, CONFIGURING, COMPLETING, STOPPED, RECONFIG_FAIL,
     * POWER_UP_NODE, REVOKED, REQUEUE_FED, RESV_DEL_HOLD, SIGNALING, STAGE_OUT.
     */
    private List<String> jobState;

    private String stateDescription;
    private String stateReason;

    /**
     * Флаги задания (битовые признаки из SLURM).
     */
    private List<String> flags;

    // ── Временны́е метки ───────────────────────────────────────────────────────

    private SlurmUint64 submitTime;
    private SlurmUint64 eligibleTime;
    private SlurmUint64 accrueTime;
    private SlurmUint64 startTime;
    private SlurmUint64 endTime;
    private SlurmUint64 deadline;
    private SlurmUint64 suspendTime;
    private SlurmUint64 preemptTime;
    private SlurmUint64 preemptableTime;
    private SlurmUint64 preSusTime;
    private SlurmUint64 resizeTime;
    private SlurmUint64 lastSchedEvaluation;

    // ── Ресурсы ───────────────────────────────────────────────────────────────

    private SlurmUint32 cpus;
    private SlurmUint32 nodeCount;
    private SlurmUint32 tasks;

    private SlurmUint32 timeLimit;
    private SlurmUint32 timeMinimum;
    private SlurmUint32 delayBoot;

    private SlurmUint64 memoryPerCpu;
    private SlurmUint64 memoryPerNode;
    private String memoryPerTres;

    private SlurmUint32 maxCpus;
    private SlurmUint32 maxNodes;

    private SlurmFloat64NoVal billableTres;

    // ── Топология / узлы ──────────────────────────────────────────────────────

    private String nodes;
    private String scheduledNodes;
    private String requiredNodes;
    private String excludedNodes;
    private String failedNode;
    private String allocatingNode;
    private String batchHost;

    // ── CPU / сокеты / потоки ─────────────────────────────────────────────────

    private SlurmUint32 cpuFrequencyMinimum;
    private SlurmUint32 cpuFrequencyMaximum;
    private SlurmUint32 cpuFrequencyGovernor;

    private SlurmUint32 priority;
    private Integer nice;

    private SlurmUint32 coresPerSocket;
    private SlurmUint32 socketsPerNode;
    private SlurmUint32 threadsPerCore;
    private SlurmUint32 tasksPerCore;
    private SlurmUint32 tasksPerNode;
    private SlurmUint32 tasksPerSocket;
    private SlurmUint32 tasksPerTres;
    private SlurmUint32 tasksPerBoard;
    private SlurmUint32 minimumCpusPerNode;
    private SlurmUint32 minimumTmpDiskPerNode;

    private String cpusPerTres;
    private SlurmUint32 cpusPerTask;

    private Integer socketsPerBoard;
    private Integer coreSpec;
    private Integer threadSpec;
    private Integer associationId;

    // ── Переключатели / switches ───────────────────────────────────────────────

    private Integer minimumSwitches;
    private Integer maximumSwitchWaitTime;

    // ── TRES-строки ───────────────────────────────────────────────────────────

    private String tresBind;
    private String tresFreq;
    private String tresPerJob;
    private String tresPerNode;
    private String tresPerSocket;
    private String tresPerTask;
    private String tresReqStr;
    private String tresAllocStr;

    // ── Файлы ввода/вывода ────────────────────────────────────────────────────

    private String standardInput;
    private String standardOutput;
    private String standardError;
    private String currentWorkingDirectory;
    private String command;

    // ── Коды завершения ───────────────────────────────────────────────────────

    private SlurmProcessExitCodeDTO exitCode;
    private SlurmProcessExitCodeDTO derivedExitCode;

    // ── Ресурсы задания ───────────────────────────────────────────────────────

    private SlurmJobResDTO jobResources;
    private List<String> gresDetail;
    private List<String> jobSizeStr;

    // ── Массивы заданий ───────────────────────────────────────────────────────

    private SlurmUint32 arrayJobId;
    private SlurmUint32 arrayTaskId;
    private SlurmUint32 arrayMaxTasks;
    private String arrayTaskString;

    // ── Гетерогенные задания ─────────────────────────────────────────────────

    private SlurmUint32 hetJobId;
    private String hetJobIdSet;
    private SlurmUint32 hetJobOffset;

    // ── Почта ─────────────────────────────────────────────────────────────────

    private List<String> mailType;
    private String mailUser;

    // ── Разное ────────────────────────────────────────────────────────────────

    private String comment;
    private String adminComment;
    private String systemComment;
    private String extra;
    private String dependency;
    private String features;
    private String prefer;
    private String licenses;
    private String network;
    private String mcsLabel;
    private String selinuxContext;
    private String resvName;
    private String batchFeatures;
    private String burstBuffer;
    private String burstBufferState;
    private String clusterFeatures;
    private String container;
    private String containerId;
    private String cron;
    private String federationOrigin;
    private String federationSiblingsActive;
    private String federationSiblingsViable;

    private Boolean batchFlag;
    private Boolean contiguous;
    private Boolean hold;
    private Boolean reboot;
    private Boolean requeue;
    private Boolean oversubscribe;

    private Integer restartCnt;

    /**
     * Режим совместного использования узла: none, oversubscribe, user, mcs.
     */
    private List<String> shared;

    /**
     * Эксклюзивное использование узла: true, false, user, mcs.
     */
    private List<String> exclusive;

    /**
     * Флаги show (ALL, DETAIL, MIXED, LOCAL, SIBLING, FEDERATION, FUTURE).
     */
    private List<String> showFlags;

    /**
     * Профиль сбора данных: NOT_SET, NONE, ENERGY, LUSTRE, NETWORK, TASK.
     */
    private List<String> profile;

    /**
     * Флаги питания (EQUAL_POWER).
     */
    private Power power;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Power {
        private List<String> flags;
    }
}