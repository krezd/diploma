package ru.krezd.diploma.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Тело запроса для установки личных лимитов пользователя в ассоциации (user + account).
 *
 * <p>Используется только для user-level ассоциаций ({@code user} обязателен).</p>
 * <p>Числовые поля: null = не изменять; -1 = UNLIMITED; 0 = снять лимит.</p>
 * <p>TRES-поля: строка в формате sacctmgr {@code cpu=32,gres/gpu=2,mem=64G}.</p>
 */
@Data
public class SetAssociationLimitsRequest {

    @NotBlank(message = "Имя аккаунта не может быть пустым")
    private String account;

    /** Имя пользователя. */
    private String user;

    // ── Индивидуальные лимиты ────────────────────────────────────────────────

    /** MaxJobs: макс. одновременно выполняющихся заданий. */
    private Long maxJobs;

    /** MaxJobsAccrue: макс. заданий, накапливающих приоритет. */
    private Long maxJobsAccrue;

    /** MaxSubmitJobs: макс. отправленных заданий. */
    private Long maxSubmitJobs;

    /** MaxWall: макс. wall-time задания (минуты). */
    private Long maxWallMinutes;

    /** MaxTRESPerJob: лимит TRES на задание, напр. {@code cpu=32,gres/gpu=2}. */
    private String maxTresPerJob;

    /** MaxTRESPerNode: лимит TRES на узел. */
    private String maxTresPerNode;

    /** MaxTRESMinsPerJob: TRES-минуты на задание. */
    private String maxTresMinsPerJob;

    // ── Прочее ───────────────────────────────────────────────────────────────

    /** Fairshare: вес пользователя в планировщике. */
    private Integer fairshare;
}