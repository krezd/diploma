package ru.krezd.diploma.dto.slurm.config;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.NoArgsConstructor;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

import java.util.List;

/**
 * Политика Quality of Service (QOS) в slurmdbd.
 * Соответствует схеме v0.0.40_qos из ответа GET /slurmdb/v0.0.40/config.
 */
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmDbQosDTO {

    private String description;
    private List<String> flags;
    private Integer id;
    private String name;
    private SlurmUint32NoValDTO priority;
    private SlurmFloat64NoValDTO usageFactor;
    private SlurmFloat64NoValDTO usageThreshold;
    private Limits limits;
    private Preempt preempt;

    // ─── preempt ────────────────────────────────────────────────────────────

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class Preempt {
        private List<String> list;
        private List<String> mode;
        private SlurmUint32NoValDTO exemptTime;
    }

    // ─── limits ─────────────────────────────────────────────────────────────

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class Limits {
        private Integer graceTime;
        private SlurmFloat64NoValDTO factor;
        private Max max;
        private Min min;

        @Data
        @NoArgsConstructor
        @JsonIgnoreProperties(ignoreUnknown = true)
        @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
        public static class Max {
            private ActiveJobs activeJobs;
            private Jobs jobs;
            private Accruing accruing;
            private Tres tres;
            private WallClock wallClock;

            @Data
            @NoArgsConstructor
            @JsonIgnoreProperties(ignoreUnknown = true)
            public static class ActiveJobs {
                private SlurmUint32NoValDTO accruing;
                private SlurmUint32NoValDTO count;
            }

            @Data
            @NoArgsConstructor
            @JsonIgnoreProperties(ignoreUnknown = true)
            @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
            public static class Jobs {
                private ActiveJobsPer activeJobs;
                private PerAccountUser per;

                @Data
                @NoArgsConstructor
                @JsonIgnoreProperties(ignoreUnknown = true)
                public static class ActiveJobsPer {
                    private PerAccountUser per;
                }

                @Data
                @NoArgsConstructor
                @JsonIgnoreProperties(ignoreUnknown = true)
                public static class PerAccountUser {
                    private SlurmUint32NoValDTO account;
                    private SlurmUint32NoValDTO user;
                }
            }

            @Data
            @NoArgsConstructor
            @JsonIgnoreProperties(ignoreUnknown = true)
            public static class Accruing {
                private PerAccountUser per;

                @Data
                @NoArgsConstructor
                @JsonIgnoreProperties(ignoreUnknown = true)
                public static class PerAccountUser {
                    private SlurmUint32NoValDTO account;
                    private SlurmUint32NoValDTO user;
                }
            }

            @Data
            @NoArgsConstructor
            @JsonIgnoreProperties(ignoreUnknown = true)
            @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
            public static class Tres {
                private List<SlurmTresDTO> total;
                private Minutes minutes;
                private PerTres per;

                @Data
                @NoArgsConstructor
                @JsonIgnoreProperties(ignoreUnknown = true)
                public static class Minutes {
                    private PerTres per;
                }

                @Data
                @NoArgsConstructor
                @JsonIgnoreProperties(ignoreUnknown = true)
                public static class PerTres {
                    private List<SlurmTresDTO> qos;
                    private List<SlurmTresDTO> job;
                    private List<SlurmTresDTO> account;
                    private List<SlurmTresDTO> user;
                    private List<SlurmTresDTO> node;
                }
            }

            @Data
            @NoArgsConstructor
            @JsonIgnoreProperties(ignoreUnknown = true)
            public static class WallClock {
                private PerQosJob per;

                @Data
                @NoArgsConstructor
                @JsonIgnoreProperties(ignoreUnknown = true)
                public static class PerQosJob {
                    private SlurmUint32NoValDTO qos;
                    private SlurmUint32NoValDTO job;
                }
            }
        }

        @Data
        @NoArgsConstructor
        @JsonIgnoreProperties(ignoreUnknown = true)
        @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
        public static class Min {
            private SlurmUint32NoValDTO priorityThreshold;
            private MinTres tres;

            @Data
            @NoArgsConstructor
            @JsonIgnoreProperties(ignoreUnknown = true)
            public static class MinTres {
                private PerJob per;

                @Data
                @NoArgsConstructor
                @JsonIgnoreProperties(ignoreUnknown = true)
                public static class PerJob {
                    private List<SlurmTresDTO> job;
                }
            }
        }
    }
}