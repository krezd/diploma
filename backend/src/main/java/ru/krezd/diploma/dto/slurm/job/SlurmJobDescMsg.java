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
 * Описание задания SLURM — используется как в запросе на отправку (job/submit),
 * так и в запросе на обновление (job/{id}).
 * Соответствует схеме v0.0.40_job_desc_msg.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmJobDescMsg {

    /** Имя задания. */
    private String name;

    /** Партиция для запуска. */
    private String partition;

    /** Аккаунт для биллинга. */
    private String account;

    /** Quality of Service. */
    private String qos;

    /** Workload characterization key. */
    private String wckey;

    // ── Ресурсы ──────────────────────────────────────────────────────────────

    /** Количество задач (процессов MPI). */
    private Integer tasks;

    /** Количество CPU на задачу. */
    private Integer cpusPerTask;

    /** Минимальное число узлов. */
    private Integer minimumNodes;

    /** Максимальное число узлов. */
    private Integer maximumNodes;

    /** Оперативная память на узел (МБ). */
    private SlurmUint64 memoryPerNode;

    /** Оперативная память на CPU (МБ). */
    private SlurmUint64 memoryPerCpu;

    /** Лимит времени выполнения (минуты). */
    private SlurmUint32 timeLimit;

    // ── Файлы и рабочая директория ────────────────────────────────────────────

    /** Рабочая директория задания. */
    private String currentWorkingDirectory;

    /** Путь к файлу стандартного ввода. */
    private String standardInput;

    /** Путь к файлу стандартного вывода. */
    private String standardOutput;

    /** Путь к файлу стандартного вывода ошибок. */
    private String standardError;

    // ── Зависимости и ограничения ─────────────────────────────────────────────

    /** Зависимости от других заданий (синтаксис: afterok:123). */
    private String dependency;

    /** Требования к узлам (features). */
    private String constraints;

    // ── Окружение и управление ────────────────────────────────────────────────

    /** Переменные окружения в формате KEY=VALUE. */
    private List<String> environment;

    /** Поставить задание в режим hold (не запускать). */
    private Boolean hold;

    /** Повторить задание при сбое. */
    private Boolean requeue;

    /** Произвольный комментарий к заданию. */
    private String comment;
}