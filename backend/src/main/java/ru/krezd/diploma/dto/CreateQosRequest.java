package ru.krezd.diploma.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

/**
 * Тело запроса для создания или изменения QOS.
 * При изменении поле name игнорируется (берётся из path variable).
 *
 * <p>Числовые поля: null = не изменять; -1 = без ограничений (UNLIMITED); 0 = снять лимит.</p>
 * <p>TRES-поля принимают строку в формате sacctmgr: {@code cpu=100,gres/gpu=4,mem=200G}</p>
 * <p>Флаги принимают имена sacctmgr: DenyOnLimit, NoDecay, OverPartQOS и т.д.</p>
 */
@Data
public class CreateQosRequest {

    @NotBlank(message = "Имя QOS не может быть пустым")
    private String name;

    private String description;

    // ── Основные параметры ───────────────────────────────────────────────────

    /** Приоритет QOS. */
    private Long priority;

    /** Флаги sacctmgr: DenyOnLimit, EnforceUsageThreshold, NoDecay, NoReserve,
     *  OverPartQOS, PartitionMaxNodes, PartitionMinNodes, PartitionTimeLimit,
     *  Relative, RequiresReservation, UsageFactorSafe */
    private List<String> flags;

    /** Время льготного периода в секундах (GraceTime). */
    private Integer graceTime;

    /** Коэффициент использования ресурсов (UsageFactor). */
    private Double usageFactor;

    /** Порог использования (UsageThreshold). */
    private Double usageThreshold;

    /** Коэффициент лимита (LimitFactor). */
    private Double limitFactor;

    /** Минимальный порог приоритета (MinPrioThreshold). */
    private Long minPrioThreshold;

    // ── Групповые лимиты QOS (суммарно для всех пользователей) ──────────────

    /** GrpJobs: макс. одновременно выполняющихся заданий для QOS. */
    private Long grpJobs;

    /** GrpJobsAccrue: макс. заданий, накапливающих приоритет. */
    private Long grpJobsAccrue;

    /** GrpSubmitJobs: макс. отправленных заданий для QOS. */
    private Long grpSubmitJobs;

    /** GrpWall: суммарное wall-time для QOS (минуты). */
    private Long grpWallMinutes;

    /** GrpTRES: суммарный лимит TRES, напр. {@code cpu=100,gres/gpu=10}. */
    private String grpTres;

    /** GrpTRESMins: суммарные TRES-минуты, напр. {@code cpu=1000}. */
    private String grpTresMins;

    /** GrpTRESRunMins: TRES-минуты выполняющихся заданий. */
    private String grpTresRunMins;

    // ── Лимиты на пользователя ───────────────────────────────────────────────

    /** MaxJobsPerUser: макс. одновременно выполняющихся заданий на пользователя. */
    private Long maxJobsPerUser;

    /** MaxJobsAccruePerUser: макс. заданий, накапливающих приоритет, на пользователя. */
    private Long maxJobsAccruePerUser;

    /** MaxSubmitJobsPerUser: макс. отправленных заданий на пользователя. */
    private Long maxSubmitJobsPerUser;

    /** MaxTRESPerUser: лимит TRES на пользователя, напр. {@code cpu=50,gres/gpu=2}. */
    private String maxTresPerUser;

    // ── Лимиты на аккаунт ───────────────────────────────────────────────────

    /** MaxJobsPerAccount: макс. одновременно выполняющихся заданий на аккаунт. */
    private Long maxJobsPerAccount;

    /** MaxJobsAccruePerAccount. */
    private Long maxJobsAccruePerAccount;

    /** MaxSubmitJobsPerAccount. */
    private Long maxSubmitJobsPerAccount;

    /** MaxTRESPerAccount: лимит TRES на аккаунт. */
    private String maxTresPerAccount;

    // ── Лимиты на задание ────────────────────────────────────────────────────

    /** MaxTRESPerJob: лимит TRES на задание, напр. {@code cpu=32,mem=64G,gres/gpu=4}. */
    private String maxTresPerJob;

    /** MaxTRESPerNode: лимит TRES на узел в задании, напр. {@code gres/gpu=4}. */
    private String maxTresPerNode;

    /** MaxTRESMinsPerJob: TRES-минуты на задание, напр. {@code cpu=3200}. */
    private String maxTresMinsPerJob;

    /** MaxWallDurationPerJob: макс. wall-time задания (минуты). */
    private Long maxWallDurationPerJobMinutes;

    // ── Минимальные лимиты ───────────────────────────────────────────────────

    /** MinTRESPerJob: минимальный TRES на задание, напр. {@code cpu=1}. */
    private String minTresPerJob;
}