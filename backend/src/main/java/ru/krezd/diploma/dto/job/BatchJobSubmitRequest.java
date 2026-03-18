package ru.krezd.diploma.dto.job;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import lombok.NoArgsConstructor;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

import java.util.List;

/**
 * Упрощённый запрос отправки задания через sbatch CLI.
 * Поля напрямую соответствуют флагам sbatch.
 */
@Data
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class BatchJobSubmitRequest {

    // ── Идентификация ────────────────────────────────────────────────────────

    /** --job-name: имя задания (до 64 символов). */
    private String name;

    /** --partition: раздел кластера для запуска. */
    private String partition;

    /** --account: аккаунт для биллинга ресурсов. */
    private String account;

    /** --qos: Quality of Service. */
    private String qos;

    /** --comment: комментарий к заданию. */
    private String comment;

    // ── Ресурсы ──────────────────────────────────────────────────────────────

    /** --nodes: количество узлов. */
    private Integer nodes;

    /** --ntasks: общее количество задач (MPI процессов). */
    private Integer ntasks;

    /** --ntasks-per-node: количество задач на каждый узел. */
    private Integer ntasksPerNode;

    /** --cpus-per-task: количество CPU на одну задачу (для OpenMP). */
    private Integer cpusPerTask;

    /** --time: лимит времени выполнения в минутах. */
    private Integer timeLimitMinutes;

    /** --mem: память на узел в мегабайтах (0 = вся доступная). */
    private Long memMbPerNode;

    /** --mem-per-cpu: память на CPU в мегабайтах. */
    private Long memMbPerCpu;

    /** --gres: Generic Resources, например "gpu:a100:2". */
    private String gres;

    // ── Планирование ──────────────────────────────────────────────────────────

    /** --dependency: зависимости от других заданий, например "afterok:123". */
    private String dependency;

    /** --array: массив заданий, например "0-15" или "1,3,5-9%2". */
    private String array;

    /** --reservation: имя резервации ресурсов. */
    private String reservation;

    /** --constraint: требования к узлам (feature constraints). */
    private String constraints;

    /** --exclusive: эксклюзивный доступ к узлам. */
    private Boolean exclusive;

    // ── Уведомления ──────────────────────────────────────────────────────────

    /** --mail-user: email для уведомлений. */
    private String mailUser;

    /** --mail-type: типы событий для уведомлений (BEGIN, END, FAIL и др.). */
    private List<String> mailType;

    // ── Исполнение ───────────────────────────────────────────────────────────

    /** Тело bash-скрипта (команды без #SBATCH директив). */
    private String scriptBody;

    /** --chdir: рабочая директория задания. */
    private String workingDirectory;

    /**
     * Если true — scriptBody является полным bash-скриптом (включая #SBATCH директивы)
     * и передаётся в sbatch как есть, без генерации заголовка.
     * Используется в режиме прямого ввода bash-скрипта.
     */
    private boolean rawMode;
}
