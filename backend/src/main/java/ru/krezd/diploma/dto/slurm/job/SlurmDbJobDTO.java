package ru.krezd.diploma.dto.slurm.job;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.krezd.diploma.dto.slurm.SlurmUint32;
import ru.krezd.diploma.dto.slurm.SlurmUint64;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

import java.util.List;

/**
 * Архивное задание из slurmdbd.
 * Соответствует схеме v0.0.40_job.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmDbJobDTO {

    // ── Идентификация ──────────────────────────────────────────────────────────

    private Integer jobId;
    private String name;
    private String account;
    private String cluster;
    private String partition;
    private String qos;
    private String user;
    private String group;
    private String nodes;
    private String container;
    private String block;
    private String constraints;
    private String licenses;
    private String script;
    private String submitLine;
    private String extra;
    private String failedNode;
    private String usedGres;
    private String workingDirectory;
    private String killRequestUser;

    private Boolean hold;

    private Integer allocationNodes;

    // ── Ассоциация ────────────────────────────────────────────────────────────

    private Association association;

    // ── Временны́е метки ───────────────────────────────────────────────────────

    /** Вложенный объект со всеми временны́ми метками и elapsed time. */
    private Time time;

    // ── Состояние ────────────────────────────────────────────────────────────

    private State state;

    // ── Коды завершения ───────────────────────────────────────────────────────

    private SlurmProcessExitCodeDTO exitCode;
    private SlurmProcessExitCodeDTO derivedExitCode;

    // ── Флаги ─────────────────────────────────────────────────────────────────

    /**
     * Флаги: NONE, CLEAR_SCHEDULING, NOT_SET, STARTED_ON_SUBMIT,
     * STARTED_ON_SCHEDULE, STARTED_ON_BACKFILL, START_RECEIVED.
     */
    private List<String> flags;

    // ── Ресурсы (required) ───────────────────────────────────────────────────

    private Required required;

    // ── Приоритет и QOS ───────────────────────────────────────────────────────

    private SlurmUint32 priority;

    // ── Массивы заданий ──────────────────────────────────────────────────────

    private Array array;

    // ── Гетерогенные задания ─────────────────────────────────────────────────

    private Het het;

    // ── Резервации ────────────────────────────────────────────────────────────

    private Reservation reservation;

    // ── MCS ───────────────────────────────────────────────────────────────────

    private Mcs mcs;

    // ── WCKey ─────────────────────────────────────────────────────────────────

    private WckeyTag wckey;

    // ── TRES ─────────────────────────────────────────────────────────────────

    private Tres tres;

    // ── Шаги задания ─────────────────────────────────────────────────────────

    private List<SlurmDbJobStepDTO> steps;

    // ── Вложенные классы ─────────────────────────────────────────────────────

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class Association {
        private String account;
        private String cluster;
        private String partition;
        private String user;
        private Integer id;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class Time {
        /** Затраченное время в секундах. */
        private Integer elapsed;
        /** Время, когда задание стало eligible (unix timestamp). */
        private Long eligible;
        /** Время завершения (unix timestamp). */
        private Long end;
        /** Время начала (unix timestamp). */
        private Long start;
        /** Время отправки (unix timestamp). */
        private Long submission;
        /** Время приостановки в секундах. */
        private Integer suspended;
        /** Системное CPU-время (ядро). */
        private CpuTime system;
        /** Лимит времени. */
        private SlurmUint32 limit;
        /** Суммарное CPU-время. */
        private CpuTime total;
        /** Пользовательское CPU-время. */
        private CpuTime user;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CpuTime {
        private Long seconds;
        private Long microseconds;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class State {
        /** Текущие состояния: PENDING, RUNNING, COMPLETED, FAILED, CANCELLED и др. */
        private List<String> current;
        /** Причина текущего состояния. */
        private String reason;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class Required {
        @com.fasterxml.jackson.annotation.JsonProperty("CPUs")
        private Integer CPUs;
        private SlurmUint64 memoryPerCpu;
        private SlurmUint64 memoryPerNode;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class Array {
        private Integer jobId;
        private Limits limits;
        private SlurmUint32 taskId;
        private String task;

        @Data
        @NoArgsConstructor
        @AllArgsConstructor
        public static class Limits {
            private Max max;

            @Data
            @NoArgsConstructor
            @AllArgsConstructor
            public static class Max {
                private Running running;

                @Data
                @NoArgsConstructor
                @AllArgsConstructor
                public static class Running {
                    private Integer tasks;
                }
            }
        }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class Het {
        private Integer jobId;
        private SlurmUint32 jobOffset;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Reservation {
        private Integer id;
        private String name;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Mcs {
        private String label;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WckeyTag {
        private String wckey;
        private List<String> flags;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Tres {
        private List<SlurmDbTresDTO> allocated;
        private List<SlurmDbTresDTO> requested;
    }
}