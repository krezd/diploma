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
 * Шаг задания (job step) из slurmdbd.
 * Соответствует схеме v0.0.40_step.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmDbJobStepDTO {

    /** Идентификатор и имя шага. */
    private Step step;

    /** Временны́е метки шага. */
    private Time time;

    /** Код завершения шага. */
    private SlurmProcessExitCodeDTO exitCode;

    /** Информация об узлах шага. */
    private Nodes nodes;

    /** Задачи шага. */
    private Tasks tasks;

    /** Статусы шага. */
    private List<String> state;

    /** Статистика шага. */
    private Statistics statistics;

    /** Информация о задаче. */
    private Task task;

    /** TRES-ресурсы шага. */
    private Tres tres;

    private String pid;
    private String killRequestUser;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Step {
        private String id;
        private String name;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class Time {
        private Integer elapsed;
        private SlurmUint64 end;
        private SlurmUint64 start;
        private Integer suspended;
        private CpuTime system;
        private CpuTime total;
        private CpuTime user;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CpuTime {
        private Long seconds;
        private Integer microseconds;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Nodes {
        private Integer count;
        private String range;
        private List<String> list;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Tasks {
        private Integer count;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Statistics {
        @com.fasterxml.jackson.annotation.JsonProperty("CPU")
        private CpuStats CPU;
        private EnergyStats energy;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class CpuStats {
        private Long actualFrequency;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EnergyStats {
        private SlurmUint64 consumed;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Task {
        private String distribution;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Tres {
        private TresDetail requested;
        private TresDetail consumed;
        private List<SlurmDbTresDTO> allocated;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TresDetail {
        private List<SlurmDbTresDTO> max;
        private List<SlurmDbTresDTO> min;
        private List<SlurmDbTresDTO> average;
        private List<SlurmDbTresDTO> total;
    }
}