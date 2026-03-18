package ru.krezd.diploma.dto.slurm.job;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

import java.util.Map;

/**
 * Агрегированная usage-статистика по заданиям за период.
 * Вычисляется бэкендом на основе данных из slurmdbd.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class JobUsageStatsDTO {

    /** Начало периода (unix timestamp), за который собрана статистика. */
    private Long periodStart;

    /** Конец периода (unix timestamp). */
    private Long periodEnd;

    /** Общее количество заданий за период. */
    private long totalJobs;

    /**
     * Количество заданий по статусам.
     * Ключ — статус (COMPLETED, FAILED, CANCELLED, TIMEOUT, NODE_FAIL, OUT_OF_MEMORY и др.),
     * значение — количество заданий.
     */
    private Map<String, Long> jobsByStatus;

    /**
     * Суммарное потреблённое CPU-время в часах.
     * Вычисляется как: sum(cpu_count * elapsed_seconds) / 3600
     * для каждого задания из tres.allocated[type=cpu].
     */
    private double totalCpuHours;

    /**
     * Суммарное потреблённое RAM в ГБ·часах.
     * Вычисляется как: sum(mem_mb * elapsed_seconds) / 3600 / 1024
     */
    private double totalMemGbHours;

    /**
     * Среднее время ожидания в очереди (в секундах).
     * Вычисляется как: avg(start_time - submit_time) для завершённых заданий,
     * у которых оба значения присутствуют.
     */
    private double avgWaitTimeSeconds;

    /**
     * Среднее время выполнения (в секундах).
     * Вычисляется как: avg(elapsed) из time.elapsed.
     */
    private double avgElapsedSeconds;

    /** Количество заданий с ненулевым кодом ошибки (exit_code != 0). */
    private long failedWithNonZeroExit;
}