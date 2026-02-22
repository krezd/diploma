package ru.krezd.diploma.dto.slurm.partition;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.krezd.diploma.dto.slurm.SlurmUint32;
import ru.krezd.diploma.dto.slurm.SlurmUint64;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

import java.util.List;

/**
 * Информация о партиции SLURM.
 * Соответствует схеме v0.0.40_partition_info.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmPartitionDTO {

    /** Имя партиции. */
    private String name;

    /** Имя кластера. */
    private String cluster;

    /** Альтернативная партиция. */
    private String alternate;

    /** Набор узлов партиции (node_sets). */
    private String nodeSets;

    /** Время ожидания перед освобождением узла (сек). */
    private Integer graceTime;

    /** Время приостановки узла. */
    private SlurmUint32 suspendTime;

    /** Состояние партиции. */
    private PartitionState partition;

    /** Информация об узлах партиции. */
    private PartitionNodes nodes;

    /** Разрешённые/запрещённые аккаунты. */
    private PartitionAccounts accounts;

    /** Разрешённые группы. */
    private PartitionGroups groups;

    /** Настройки QOS партиции. */
    private PartitionQos qos;

    /** Конфигурация TRES. */
    private PartitionTres tres;

    /** Информация о CPU партиции. */
    private PartitionCpus cpus;

    /** Значения по умолчанию для заданий в партиции. */
    private PartitionDefaults defaults;

    /** Максимальные ограничения для заданий в партиции. */
    private PartitionMaximums maximums;

    /** Минимальные ограничения для заданий в партиции. */
    private PartitionMinimums minimums;

    /** Приоритет партиции. */
    private PartitionPriority priority;

    /** Таймауты операций с узлами. */
    private PartitionTimeouts timeouts;

    // ── Nested types ──────────────────────────────────────────────────────────

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class PartitionState {
        private List<String> state;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class PartitionNodes {
        private String allowedAllocation;
        private String configured;
        private Integer total;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class PartitionAccounts {
        private String allowed;
        private String deny;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class PartitionGroups {
        private String allowed;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class PartitionQos {
        private String allowed;
        private String deny;
        private String assigned;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class PartitionTres {
        private String billingWeights;
        private String configured;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class PartitionCpus {
        private Integer taskBinding;
        private Integer total;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class PartitionDefaults {
        /** Оперативная память на CPU (МБ), plain int64. */
        private Long memoryPerCpu;
        private SlurmUint64 partitionMemoryPerCpu;
        private SlurmUint64 partitionMemoryPerNode;
        private SlurmUint32 time;
        private String job;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class PartitionMaximums {
        private SlurmUint32 cpusPerNode;
        private SlurmUint32 cpusPerSocket;
        /** Оперативная память на CPU (МБ), plain int64. */
        private Long memoryPerCpu;
        private SlurmUint64 partitionMemoryPerCpu;
        private SlurmUint64 partitionMemoryPerNode;
        private SlurmUint32 nodes;
        private Integer shares;
        private PartitionOversubscribe oversubscribe;
        private SlurmUint32 time;
        /** Соответствует uint16_no_val, структура идентична SlurmUint32. */
        private SlurmUint32 overTimeLimit;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class PartitionOversubscribe {
        private Integer jobs;
        private List<String> flags;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class PartitionMinimums {
        private Integer nodes;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class PartitionPriority {
        private Integer jobFactor;
        private Integer tier;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class PartitionTimeouts {
        /** Соответствует uint16_no_val, структура идентична SlurmUint32. */
        private SlurmUint32 resume;
        /** Соответствует uint16_no_val, структура идентична SlurmUint32. */
        private SlurmUint32 suspend;
    }
}