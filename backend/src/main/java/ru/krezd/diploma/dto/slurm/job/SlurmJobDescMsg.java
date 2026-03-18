package ru.krezd.diploma.dto.slurm.job;

import com.fasterxml.jackson.annotation.JsonInclude;
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
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class SlurmJobDescMsg {

    // ── Идентификация ──────────────────────────────────────────────────────────

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

    /** Произвольный комментарий к заданию. */
    private String comment;

    // ── Ресурсы ───────────────────────────────────────────────────────────────

    /** Количество задач (процессов MPI). */
    private Integer tasks;

    /** Количество CPU на задачу. */
    private Integer cpusPerTask;

    /** Минимальное число узлов. */
    private Integer minimumNodes;

    /** Максимальное число узлов. */
    private Integer maximumNodes;

    /** Минимальное число CPU (общее). */
    private Integer minimumCpus;

    /** Максимальное число CPU (общее). */
    private Integer maximumCpus;

    /** Минимальное число CPU на узел. */
    private Integer minimumCpusPerNode;

    /** Оперативная память на узел (МБ). */
    private SlurmUint64 memoryPerNode;

    /** Оперативная память на CPU (МБ). */
    private SlurmUint64 memoryPerCpu;

    /** Временный дисковый ресурс на узел (МБ). */
    private Integer temporaryDiskPerNode;

    /** Лимит времени выполнения (минуты). */
    private SlurmUint32 timeLimit;

    /** Минимальный лимит времени (минуты). */
    private SlurmUint32 timeMinimum;

    /** Смещение nice (приоритет: -10000..10000). */
    private Integer nice;

    // ── Топология / CPU / сокеты ──────────────────────────────────────────────

    /** Потоков на ядро. */
    private Integer threadsPerCore;

    /** Задач на узел. */
    private Integer tasksPerNode;

    /** Задач на сокет. */
    private Integer tasksPerSocket;

    /** Задач на ядро. */
    private Integer tasksPerCore;

    /** Количество сокетов на узел. */
    private Integer socketsPerNode;

    /** Количество задач на TRES-ресурс. */
    private Integer ntasksPerTres;

    // ── Узлы ──────────────────────────────────────────────────────────────────

    /** Конкретные узлы для выполнения (CSV или range). */
    private List<String> requiredNodes;

    /** Узлы, которые нельзя использовать (CSV или range). */
    private List<String> excludedNodes;

    /** Требования к характеристикам узлов (features). */
    private String constraints;

    /** Требование непрерывного размещения задач. */
    private Boolean contiguous;

    // ── TRES ──────────────────────────────────────────────────────────────────

    /** TRES на задание (например: cpu=32,gres/gpu=2). */
    private String tresPerJob;

    /** TRES на узел. */
    private String tresPerNode;

    /** TRES на сокет. */
    private String tresPerSocket;

    /** TRES на задачу. */
    private String tresPerTask;

    /** Привязка TRES. */
    private String tresBind;

    /** Частота TRES. */
    private String tresFreq;

    // ── Планирование ──────────────────────────────────────────────────────────

    /**
     * Job array — строка вида "1-10" или "1,3,5-9%2".
     * Создаёт несколько связанных заданий.
     */
    private String array;

    /** Зависимости от других заданий (синтаксис: afterok:123). */
    private String dependency;

    /** Резервация для выполнения задания. */
    private String reservation;

    /** Время начала (unix timestamp). */
    private Long beginTime;

    /** Дедлайн (unix timestamp). */
    private Long deadline;

    /**
     * Эксклюзивное использование узла: true, false, user, mcs.
     */
    private List<String> exclusive;

    /**
     * Режим разделения узла: none, oversubscribe, user, mcs.
     */
    private List<String> shared;

    /** Переподписка CPU. */
    private Boolean oversubscribe;

    /** Распределение задач по узлам (block, cyclic, plane и др.). */
    private String distribution;

    /** Минимальное число коммутаторов. */
    private SlurmUint32 requiredSwitches;

    /** Максимальное время ожидания нужного числа коммутаторов (секунды). */
    private Integer waitForSwitch;

    // ── Поведение ─────────────────────────────────────────────────────────────

    /** Поставить задание в режим hold (не запускать). */
    private Boolean hold;

    /** Повторить задание при сбое. */
    private Boolean requeue;

    /** Ждать пока все узлы не будут готовы перед запуском. */
    private Boolean waitAllNodes;

    /** Завершить задание если узел упал. */
    private Boolean killOnNodeFail;

    // ── Лицензии и сеть ───────────────────────────────────────────────────────

    /** Лицензии, необходимые заданию (licenses=matlab:2). */
    private String licenses;

    /** Тип сети (Ethernet, InfiniBand и т.д.). */
    private String network;

    // ── Почта ─────────────────────────────────────────────────────────────────

    /**
     * Когда отправлять уведомления: BEGIN, END, FAIL, REQUEUE, TIME=90% и др.
     */
    private List<String> mailType;

    /** Email-адрес для уведомлений. */
    private String mailUser;

    // ── Файлы и рабочая директория ────────────────────────────────────────────

    /** Рабочая директория задания. */
    private String currentWorkingDirectory;

    /** Путь к файлу стандартного ввода. */
    private String standardInput;

    /** Путь к файлу стандартного вывода. */
    private String standardOutput;

    /** Путь к файлу стандартного вывода ошибок. */
    private String standardError;

    /**
     * Режим открытия файлов вывода: APPEND или TRUNCATE.
     */
    private List<String> openMode;

    // ── Окружение ─────────────────────────────────────────────────────────────

    /** Переменные окружения в формате KEY=VALUE. */
    private List<String> environment;
}
