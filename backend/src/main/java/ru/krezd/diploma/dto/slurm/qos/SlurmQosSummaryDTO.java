package ru.krezd.diploma.dto.slurm.qos;

import lombok.Data;
import lombok.NoArgsConstructor;
import ru.krezd.diploma.dto.slurm.config.SlurmDbQosDTO;
import ru.krezd.diploma.dto.slurm.config.SlurmFloat64NoValDTO;
import ru.krezd.diploma.dto.slurm.config.SlurmTresDTO;
import ru.krezd.diploma.dto.slurm.config.SlurmUint32NoValDTO;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Плоское представление QOS для ответа GET /api/slurm/qos.
 *
 * <p>null = значение не задано в slurmdbd.</p>
 * <p>-1L / -1.0 = без ограничений (UNLIMITED).</p>
 * <p>TRES-поля возвращаются строкой формата {@code cpu=100,gres/gpu=10}.</p>
 * <p>Флаги нормализованы к именам sacctmgr (DenyOnLimit, NoDecay, …).</p>
 */
@Data
@NoArgsConstructor
public class SlurmQosSummaryDTO {

    // ── Базовые поля ─────────────────────────────────────────────────────────

    private Integer      id;
    private String       name;
    private String       description;
    private Long         priority;
    private List<String> flags;

    // ── Коэффициенты и временные параметры ───────────────────────────────────

    private Double  usageFactor;
    private Double  usageThreshold;
    private Double  limitFactor;
    /** GraceTime в секундах. */
    private Integer graceTime;
    private Long    minPrioThreshold;

    // ── Групповые лимиты QOS (для всех пользователей суммарно) ───────────────

    /** GrpJobs — макс. одновременно ВЫПОЛНЯЮЩИХСЯ заданий для QOS. */
    private Long   grpJobs;
    /** GrpSubmitJobs — макс. поданных (очередь+выполнение) заданий для QOS. */
    private Long   grpSubmitJobs;
    /** GrpJobsAccrue — макс. заданий, накапливающих приоритет. */
    private Long   grpJobsAccrue;
    /** GrpWall — суммарное wall-time (минуты). */
    private Long   grpWallMinutes;
    /** GrpTRES — суммарный лимит TRES, напр. {@code cpu=100,gres/gpu=10}. */
    private String grpTres;
    /** GrpTRESMins — суммарные TRES-минуты. */
    private String grpTresMins;
    /** GrpTRESRunMins — суммарные текущие TRES-минуты (running). */
    private String grpTresRunMins;

    // ── Лимиты на пользователя ───────────────────────────────────────────────

    /** MaxJobsPerUser — макс. одновременно ВЫПОЛНЯЮЩИХСЯ заданий на пользователя. */
    private Long   maxJobsPerUser;
    /** MaxSubmitJobsPerUser — макс. поданных (очередь + выполнение) заданий на пользователя. */
    private Long   maxSubmitJobsPerUser;
    private Long   maxJobsAccruePerUser;
    private String maxTresPerUser;

    // ── Лимиты на аккаунт ───────────────────────────────────────────────────

    /** MaxJobsPerAccount — макс. одновременно ВЫПОЛНЯЮЩИХСЯ заданий на аккаунт. */
    private Long   maxJobsPerAccount;
    /** MaxSubmitJobsPerAccount — макс. поданных заданий на аккаунт. */
    private Long   maxSubmitJobsPerAccount;
    private Long   maxJobsAccruePerAccount;
    private String maxTresPerAccount;

    // ── Лимиты на задание ────────────────────────────────────────────────────

    private String maxTresPerJob;
    private String maxTresPerNode;
    private String maxTresMinsPerJob;
    /** MaxWallDurationPerJob в минутах. */
    private Long   maxWallDurationPerJobMinutes;

    // ── Минимальные лимиты ───────────────────────────────────────────────────

    private String minTresPerJob;

    // ── Маппинг из сырого DTO slurmrestd ─────────────────────────────────────

    public static SlurmQosSummaryDTO from(SlurmDbQosDTO src) {
        SlurmQosSummaryDTO dto = new SlurmQosSummaryDTO();
        dto.setId(src.getId());
        dto.setName(src.getName());
        dto.setDescription(src.getDescription());
        dto.setPriority(resolveUint32(src.getPriority()));
        dto.setUsageFactor(resolveFloat64(src.getUsageFactor()));
        dto.setUsageThreshold(resolveFloat64(src.getUsageThreshold()));

        // Флаги: нормализуем к именам sacctmgr
        if (src.getFlags() != null) {
            dto.setFlags(
                src.getFlags().stream()
                    .map(SlurmQosSummaryDTO::apiToSacctmgrFlag)
                    .filter(f -> f != null && !f.isEmpty())
                    .distinct()
                    .collect(Collectors.toList())
            );
        }

        SlurmDbQosDTO.Limits limits = src.getLimits();
        if (limits == null) return dto;

        dto.setGraceTime(limits.getGraceTime());
        dto.setLimitFactor(resolveFloat64(limits.getFactor()));

        SlurmDbQosDTO.Limits.Min min = limits.getMin();
        if (min != null) {
            dto.setMinPrioThreshold(resolveUint32(min.getPriorityThreshold()));
            if (min.getTres() != null && min.getTres().getPer() != null) {
                dto.setMinTresPerJob(tresList(min.getTres().getPer().getJob()));
            }
        }

        SlurmDbQosDTO.Limits.Max max = limits.getMax();
        if (max == null) return dto;

        // GrpJobs (running) / GrpJobsAccrue
        // active_jobs.count = GrpJobs (выполняющихся), active_jobs.accruing = GrpJobsAccrue
        if (max.getActiveJobs() != null) {
            dto.setGrpJobs(resolveUint32(max.getActiveJobs().getCount()));
            dto.setGrpJobsAccrue(resolveUint32(max.getActiveJobs().getAccruing()));
        }
        // GrpSubmitJobs (submitted=очередь+выполнение) не экспонирован в v0.0.40 REST API

        if (max.getJobs() != null) {
            // MaxSubmitJobsPerUser/Account — limits.max.jobs.per (очередь + выполнение)
            if (max.getJobs().getPer() != null) {
                dto.setMaxSubmitJobsPerUser(resolveUint32(max.getJobs().getPer().getUser()));
                dto.setMaxSubmitJobsPerAccount(resolveUint32(max.getJobs().getPer().getAccount()));
            }
            // MaxJobsPerUser/Account — limits.max.jobs.active_jobs.per (только выполняющиеся)
            if (max.getJobs().getActiveJobs() != null && max.getJobs().getActiveJobs().getPer() != null) {
                dto.setMaxJobsPerUser(resolveUint32(max.getJobs().getActiveJobs().getPer().getUser()));
                dto.setMaxJobsPerAccount(resolveUint32(max.getJobs().getActiveJobs().getPer().getAccount()));
            }
        }

        // MaxJobsAccruePerUser / MaxJobsAccruePerAccount
        if (max.getAccruing() != null && max.getAccruing().getPer() != null) {
            dto.setMaxJobsAccruePerUser(resolveUint32(max.getAccruing().getPer().getUser()));
            dto.setMaxJobsAccruePerAccount(resolveUint32(max.getAccruing().getPer().getAccount()));
        }

        // GrpWall / MaxWallDurationPerJob
        if (max.getWallClock() != null && max.getWallClock().getPer() != null) {
            dto.setGrpWallMinutes(resolveUint32(max.getWallClock().getPer().getQos()));
            dto.setMaxWallDurationPerJobMinutes(resolveUint32(max.getWallClock().getPer().getJob()));
        }

        // TRES
        if (max.getTres() != null) {
            var tres = max.getTres();
            dto.setGrpTres(tresList(tres.getTotal()));

            if (tres.getMinutes() != null && tres.getMinutes().getPer() != null) {
                // per.qos = GrpTRESMins (суммарные TRES-минуты для QOS)
                // per.job = MaxTRESMinsPerJob (лимит TRES-минут на одно задание в данном QOS)
                dto.setGrpTresMins(tresList(tres.getMinutes().getPer().getQos()));
                dto.setMaxTresMinsPerJob(tresList(tres.getMinutes().getPer().getJob()));
            }

            if (tres.getPer() != null) {
                dto.setMaxTresPerJob(tresList(tres.getPer().getJob()));
                dto.setMaxTresPerNode(tresList(tres.getPer().getNode()));
                dto.setMaxTresPerUser(tresList(tres.getPer().getUser()));
                dto.setMaxTresPerAccount(tresList(tres.getPer().getAccount()));
            }
        }

        return dto;
    }

    // ── Вспомогательные методы ───────────────────────────────────────────────

    private static Long resolveUint32(SlurmUint32NoValDTO v) {
        if (v == null || !Boolean.TRUE.equals(v.getSet())) return null;
        if (Boolean.TRUE.equals(v.getInfinite())) return -1L;
        return v.getNumber();
    }

    private static Double resolveFloat64(SlurmFloat64NoValDTO v) {
        if (v == null || !Boolean.TRUE.equals(v.getSet())) return null;
        if (Boolean.TRUE.equals(v.getInfinite())) return -1.0;
        return v.getNumber();
    }

    /**
     * Преобразует список TRES-объектов в строку формата {@code cpu=100,gres/gpu=10}.
     * Возвращает null, если список пустой или все элементы без счётчика.
     */
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

    /**
     * Конвертирует имена флагов REST API (UPPER_SNAKE_CASE) в имена sacctmgr (PascalCase).
     * Возвращает null для служебных флагов NOT_SET / ADD / REMOVE.
     */
    private static String apiToSacctmgrFlag(String apiFlag) {
        if (apiFlag == null) return null;
        return switch (apiFlag) {
            case "DENY_LIMIT"                -> "DenyOnLimit";
            case "ENFORCE_USAGE_THRESHOLD"   -> "EnforceUsageThreshold";
            case "NO_DECAY"                  -> "NoDecay";
            case "NO_RESERVE"                -> "NoReserve";
            case "OVERRIDE_PARTITION_QOS"    -> "OverPartQOS";
            case "PARTITION_MAXIMUM_NODE"    -> "PartitionMaxNodes";
            case "PARTITION_MINIMUM_NODE"    -> "PartitionMinNodes";
            case "PARTITION_TIME_LIMIT"      -> "PartitionTimeLimit";
            case "RELATIVE"                  -> "Relative";
            case "REQUIRED_RESERVATION"      -> "RequiresReservation";
            case "USAGE_FACTOR_SAFE"         -> "UsageFactorSafe";
            case "NOT_SET", "ADD", "REMOVE"  -> null;
            default                          -> apiFlag;
        };
    }
}