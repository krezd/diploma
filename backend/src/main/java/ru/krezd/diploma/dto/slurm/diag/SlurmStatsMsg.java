package ru.krezd.diploma.dto.slurm.diag;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.krezd.diploma.dto.slurm.SlurmUint64;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

/**
 * Статистика планировщика SLURM.
 * Соответствует схеме v0.0.40_stats_msg.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmStatsMsg {

    // ── Общая информация ──────────────────────────────────────────────────────

    /** Количество потоков сервера slurmctld. */
    private Integer serverThreadCount;

    /** Количество упакованных партиций в последнем ответе. */
    private Integer partsPacked;

    /** Временная метка запроса. */
    private SlurmUint64 reqTime;

    // ── Статистика заданий ────────────────────────────────────────────────────

    /** Количество поданных заданий с момента запуска slurmctld. */
    private Integer jobsSubmitted;

    /** Количество запущенных заданий. */
    private Integer jobsStarted;

    /** Количество завершённых заданий. */
    private Integer jobsCompleted;

    /** Количество отменённых заданий. */
    private Integer jobsCanceled;

    /** Количество заданий завершившихся с ошибкой. */
    private Integer jobsFailed;

    /** Текущее количество заданий в очереди (PENDING). */
    private Integer jobsPending;

    /** Текущее количество выполняющихся заданий (RUNNING). */
    private Integer jobsRunning;

    // ── Планировщик (основной цикл) ───────────────────────────────────────────

    /** Максимальное время цикла планирования (мкс). */
    private Integer scheduleCycleMax;

    /** Время последнего цикла планирования (мкс). */
    private Integer scheduleCycleLast;

    /** Суммарное число циклов планирования. */
    private Integer scheduleCycleTotal;

    /** Среднее время цикла планирования (мкс). */
    private Long scheduleCycleMean;

    /** Длина очереди планирования. */
    private Integer scheduleQueueLength;

    // ── Backfill-планировщик ──────────────────────────────────────────────────

    /** Признак активности backfill-цикла в момент запроса. */
    private Boolean bfActive;

    /** Количество выполненных backfill-циклов. */
    private Integer bfCycleCounter;

    /** Время последнего backfill-цикла (мкс). */
    private Integer bfCycleLast;

    /** Среднее время backfill-цикла (мкс). */
    private Long bfCycleMean;

    /** Количество заданий, распланированных через backfill с момента запуска. */
    private Integer bfBackfilledJobs;

    /** Количество заданий, распланированных через backfill в последнем цикле. */
    private Integer bfLastBackfilledJobs;
}