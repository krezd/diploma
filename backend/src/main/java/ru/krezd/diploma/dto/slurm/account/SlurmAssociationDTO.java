package ru.krezd.diploma.dto.slurm.account;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.krezd.diploma.dto.slurm.config.SlurmTresDTO;
import ru.krezd.diploma.dto.slurm.config.SlurmUint32NoValDTO;

import java.util.List;
import java.util.stream.Collectors;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SlurmAssociationDTO {

    private String user;
    private String account;
    private String cluster;
    private String partition;

    @JsonProperty("qos")
    private List<String> qos;

    @JsonProperty("default")
    private DefaultQos defaultData;

    /** Вложенный max-объект из v0.0.40_assoc — используется для вычисления limits. */
    @JsonProperty("max")
    private Max max;

    @JsonProperty("shares_raw")
    private Integer sharesRaw;

    /** Плоские лимиты, вычисляемые сервисом из max + sharesRaw и возвращаемые фронту. */
    private AssocLimits limits;

    // ── Вложенные классы ─────────────────────────────────────────────────────

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class DefaultQos {
        private String qos;
    }

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Max {
        private Jobs jobs;
        private Tres tres;
        /** max.per → содержит per.account.wall_clock = GrpWall */
        private Per per;

        /**
         * max.jobs:
         * - per.*   = индивидуальные лимиты (MaxJobs, MaxSubmitJobs, MaxJobsAccrue, MaxWall)
         * - active  = GrpJobs (суммарно активных заданий)
         * - total   = GrpSubmitJobs (суммарно поданных заданий)
         * - accruing = GrpJobsAccrue
         */
        @Data
        @NoArgsConstructor
        @JsonIgnoreProperties(ignoreUnknown = true)
        public static class Jobs {
            /** max.jobs.per.* = индивидуальные лимиты (Max*). */
            private Per per;
            /** max.jobs.active = GrpJobs. */
            private SlurmUint32NoValDTO active;
            /** max.jobs.total = GrpSubmitJobs. */
            private SlurmUint32NoValDTO total;
            /** max.jobs.accruing = GrpJobsAccrue. */
            private SlurmUint32NoValDTO accruing;

            @Data
            @NoArgsConstructor
            @JsonIgnoreProperties(ignoreUnknown = true)
            public static class Per {
                /** MaxJobs. */
                private SlurmUint32NoValDTO count;
                /** MaxJobsAccrue. */
                private SlurmUint32NoValDTO accruing;
                /** MaxSubmitJobs. */
                private SlurmUint32NoValDTO submitted;
                /** MaxWall (в минутах). */
                @JsonProperty("wall_clock")
                private SlurmUint32NoValDTO wallClock;
            }
        }

        /**
         * max.tres:
         * - total         = GrpTRES
         * - group.minutes = GrpTRESMins
         * - group.active  = GrpTRESRunMins
         * - per.job       = MaxTRESPerJob
         * - per.node      = MaxTRESPerNode
         * - minutes.per.job = MaxTRESMinsPerJob
         */
        @Data
        @NoArgsConstructor
        @JsonIgnoreProperties(ignoreUnknown = true)
        public static class Tres {
            private List<SlurmTresDTO> total;
            private Group group;
            private Minutes minutes;
            private Per per;

            @Data
            @NoArgsConstructor
            @JsonIgnoreProperties(ignoreUnknown = true)
            public static class Group {
                private List<SlurmTresDTO> minutes;
                private List<SlurmTresDTO> active;
            }

            @Data
            @NoArgsConstructor
            @JsonIgnoreProperties(ignoreUnknown = true)
            public static class Minutes {
                private Per per;

                @Data
                @NoArgsConstructor
                @JsonIgnoreProperties(ignoreUnknown = true)
                public static class Per {
                    private List<SlurmTresDTO> job;
                }
            }

            @Data
            @NoArgsConstructor
            @JsonIgnoreProperties(ignoreUnknown = true)
            public static class Per {
                private List<SlurmTresDTO> job;
                private List<SlurmTresDTO> node;
            }
        }

        /**
         * max.per.account.wall_clock = GrpWall (суммарное wall-time аккаунта, в минутах).
         */
        @Data
        @NoArgsConstructor
        @JsonIgnoreProperties(ignoreUnknown = true)
        public static class Per {
            private Account account;

            @Data
            @NoArgsConstructor
            @JsonIgnoreProperties(ignoreUnknown = true)
            public static class Account {
                @JsonProperty("wall_clock")
                private SlurmUint32NoValDTO wallClock;
            }
        }
    }

    /**
     * Плоское представление лимитов ассоциации, возвращаемое фронту.
     *
     * <p>Grp* = групповые лимиты (для всей ассоциации суммарно).
     * Max* = индивидуальные лимиты (на одно задание / пользователя).
     * null = не установлен.</p>
     */
    @Data
    @NoArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class AssocLimits {

        // ── Групповые лимиты (GRP*) ──────────────────────────────────────────
        /** GrpJobs — макс. одновременно выполняющихся заданий (max.jobs.active). */
        private Long grpJobs;
        /** GrpJobsAccrue — макс. накапливающих приоритет заданий (max.jobs.accruing). */
        private Long grpJobsAccrue;
        /** GrpSubmitJobs — макс. поданных заданий суммарно (max.jobs.total). */
        private Long grpSubmitJobs;
        /** GrpWall — суммарное wall-time аккаунта, в минутах (max.per.account.wall_clock). */
        private Long grpWallMinutes;
        private String grpTres;
        private String grpTresMins;
        private String grpTresRunMins;

        // ── Индивидуальные лимиты (Max*) ─────────────────────────────────────
        /** MaxJobs — макс. выполняющихся заданий на пользователя/аккаунт (max.jobs.per.count). */
        private Long maxJobs;
        /** MaxJobsAccrue (max.jobs.per.accruing). */
        private Long maxJobsAccrue;
        /** MaxSubmitJobs (max.jobs.per.submitted). */
        private Long maxSubmitJobs;
        /** MaxWall — макс. wall-time задания, в минутах (max.jobs.per.wall_clock). */
        private Long maxWallMinutes;
        private String maxTresPerJob;
        private String maxTresPerNode;
        private String maxTresMinsPerJob;

        // ── Прочее ───────────────────────────────────────────────────────────
        /** Fairshare-вес (shares_raw). */
        private Integer fairshare;

        boolean isEmpty() {
            return grpJobs == null && grpJobsAccrue == null && grpSubmitJobs == null
                    && grpWallMinutes == null && grpTres == null && grpTresMins == null
                    && grpTresRunMins == null
                    && maxJobs == null && maxJobsAccrue == null && maxSubmitJobs == null
                    && maxWallMinutes == null && maxTresPerJob == null && maxTresPerNode == null
                    && maxTresMinsPerJob == null
                    && (fairshare == null || fairshare == 0);
        }
    }

    // ── Вспомогательные методы ───────────────────────────────────────────────

    /** Convenience getter для default QOS. */
    public String getDefaultQos() {
        return defaultData != null ? defaultData.getQos() : null;
    }

    /**
     * Вычисляет плоские лимиты из вложенного объекта max и sharesRaw.
     * Вызывается в сервисе после десериализации ответа slurmrestd.
     *
     * @return null, если ни один лимит не установлен
     */
    public AssocLimits computeLimits() {
        if (max == null && (sharesRaw == null || sharesRaw == 0)) return null;
        AssocLimits l = new AssocLimits();

        if (max != null) {
            // ── Лимиты заданий ─────────────────────────────────────────────
            if (max.getJobs() != null) {
                var jobs = max.getJobs();

                // GRP-лимиты (суммарные) — из max.jobs.per.*
                if (jobs.getPer() != null) {
                    var per = jobs.getPer();
                    l.setGrpJobs(resolveUint32(per.getCount()));
                    l.setGrpJobsAccrue(resolveUint32(per.getAccruing()));
                    l.setGrpSubmitJobs(resolveUint32(per.getSubmitted()));
                    // wall_clock из slurmrestd приходит уже в минутах
                    l.setMaxWallMinutes(resolveUint32(per.getWallClock()));
                }

                // Max-лимиты (индивидуальные) — из max.jobs.active/total/accruing
                l.setMaxJobs(resolveUint32(jobs.getActive()));
                l.setMaxJobsAccrue(resolveUint32(jobs.getAccruing()));
                l.setMaxSubmitJobs(resolveUint32(jobs.getTotal()));
            }

            // GrpWall — max.per.account.wall_clock (уже в минутах)
            if (max.getPer() != null && max.getPer().getAccount() != null) {
                l.setGrpWallMinutes(resolveUint32(max.getPer().getAccount().getWallClock()));
            }

            // ── TRES-лимиты ────────────────────────────────────────────────
            if (max.getTres() != null) {
                var tres = max.getTres();
                l.setGrpTres(tresList(tres.getTotal()));
                if (tres.getGroup() != null) {
                    l.setGrpTresMins(tresList(tres.getGroup().getMinutes()));
                    l.setGrpTresRunMins(tresList(tres.getGroup().getActive()));
                }
                if (tres.getMinutes() != null && tres.getMinutes().getPer() != null) {
                    l.setMaxTresMinsPerJob(tresList(tres.getMinutes().getPer().getJob()));
                }
                if (tres.getPer() != null) {
                    l.setMaxTresPerJob(tresList(tres.getPer().getJob()));
                    l.setMaxTresPerNode(tresList(tres.getPer().getNode()));
                }
            }
        }

        if (sharesRaw != null && sharesRaw > 0) l.setFairshare(sharesRaw);
        return l.isEmpty() ? null : l;
    }

    private static Long resolveUint32(SlurmUint32NoValDTO v) {
        if (v == null || !Boolean.TRUE.equals(v.getSet())) return null;
        if (Boolean.TRUE.equals(v.getInfinite())) return -1L;
        return v.getNumber();
    }

    private static String tresList(List<SlurmTresDTO> list) {
        if (list == null || list.isEmpty()) return null;
        String s = list.stream()
                .map(t -> {
                    String key = t.getType() != null ? t.getType() : "";
                    if (t.getName() != null && !t.getName().isBlank()) {
                        key += "/" + t.getName();
                    }
                    String val = t.getCount() != null ? String.valueOf(t.getCount()) : "N";
                    return key + "=" + val;
                })
                .collect(Collectors.joining(","));
        return s.isBlank() ? null : s;
    }
}