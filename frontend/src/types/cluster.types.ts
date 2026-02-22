/**
 * TypeScript типы для данных SLURM кластера.
 * Поля в snake_case соответствуют JSON-ответам бэкенда
 * (Spring Boot + @JsonNaming(SnakeCaseStrategy)).
 */

// ── Базовые числовые типы slurmrestd ─────────────────────────────────────────

export interface SlurmUint64 {
  set: boolean;
  infinite: boolean;
  number: number;
}

export interface SlurmUint32 {
  set: boolean;
  infinite: boolean;
  number: number;
}

// ── Ошибки и предупреждения ───────────────────────────────────────────────────

export interface SlurmApiError {
  description?: string;
  error_number?: number;
  error?: string;
  source?: string;
}

export interface SlurmApiWarning {
  description?: string;
  source?: string;
}

// ── Узлы ─────────────────────────────────────────────────────────────────────

export interface SlurmNode {
  name?: string;
  hostname?: string;
  address?: string;
  /** Состояние узла: IDLE, ALLOCATED, MIXED, DRAIN, DOWN, UNKNOWN и др. */
  state?: string[];
  cpus?: number;
  effective_cpus?: number;
  alloc_cpus?: number;
  alloc_idle_cpus?: number;
  /** Полный объём RAM в МБ */
  real_memory?: number;
  /** Занятая RAM в МБ */
  alloc_memory?: number;
  /** Нагрузка CPU * 100 (100 = load 1.00) */
  cpu_load?: number;
  gres?: string;
  gres_used?: string;
  /** Список партиций, в которых состоит узел */
  partitions?: string[];
  reason?: string;
  reason_set_by_user?: string;
  boot_time?: SlurmUint64;
  last_busy?: SlurmUint64;
}

export interface SlurmNodesResponse {
  nodes?: SlurmNode[];
  last_update?: SlurmUint64;
  errors?: SlurmApiError[];
  warnings?: SlurmApiWarning[];
}

// ── Партиции ──────────────────────────────────────────────────────────────────

export interface SlurmPartition {
  name?: string;
  cluster?: string;
  alternate?: string;
  node_sets?: string;
  grace_time?: number;
  suspend_time?: SlurmUint32;
  /** Вложенный объект "partition" → состояние UP/DOWN/DRAIN/INACTIVE */
  partition?: { state?: string[] };
  nodes?: {
    allowed_allocation?: string;
    configured?: string;
    total?: number;
  };
  accounts?: {
    allowed?: string;
    deny?: string;
  };
  groups?: {
    allowed?: string;
  };
  qos?: {
    allowed?: string;
    deny?: string;
    assigned?: string;
  };
  tres?: {
    billing_weights?: string;
    configured?: string;
  };
  cpus?: {
    task_binding?: number;
    total?: number;
  };
  defaults?: {
    /** plain int64, не SlurmUint64 */
    memory_per_cpu?: number;
    partition_memory_per_cpu?: SlurmUint64;
    partition_memory_per_node?: SlurmUint64;
    time?: SlurmUint32;
    job?: string;
  };
  maximums?: {
    cpus_per_node?: SlurmUint32;
    cpus_per_socket?: SlurmUint32;
    /** plain int64, не SlurmUint64 */
    memory_per_cpu?: number;
    partition_memory_per_cpu?: SlurmUint64;
    partition_memory_per_node?: SlurmUint64;
    nodes?: SlurmUint32;
    shares?: number;
    oversubscribe?: {
      jobs?: number;
      flags?: string[];
    };
    time?: SlurmUint32;
    over_time_limit?: SlurmUint32;
  };
  minimums?: {
    nodes?: number;
  };
  priority?: {
    job_factor?: number;
    tier?: number;
  };
  timeouts?: {
    resume?: SlurmUint32;
    suspend?: SlurmUint32;
  };
}

export interface SlurmPartitionsResponse {
  partitions?: SlurmPartition[];
  last_update?: SlurmUint64;
  errors?: SlurmApiError[];
  warnings?: SlurmApiWarning[];
}

// ── Диагностика ───────────────────────────────────────────────────────────────

export interface SlurmStats {
  server_thread_count?: number;
  parts_packed?: number;
  jobs_submitted?: number;
  jobs_started?: number;
  jobs_completed?: number;
  jobs_canceled?: number;
  jobs_failed?: number;
  jobs_pending?: number;
  jobs_running?: number;
  schedule_cycle_max?: number;
  schedule_cycle_last?: number;
  schedule_cycle_mean?: number;
  schedule_queue_length?: number;
  bf_active?: boolean;
  bf_cycle_counter?: number;
  bf_cycle_last?: number;
  bf_cycle_mean?: number;
  bf_backfilled_jobs?: number;
  bf_last_backfilled_jobs?: number;
}

export interface SlurmDiagResponse {
  statistics?: SlurmStats;
  errors?: SlurmApiError[];
}

// ── Ping ─────────────────────────────────────────────────────────────────────

export interface SlurmPingItem {
  hostname?: string;
  /** "UP" или "DOWN" */
  pinged?: string;
  latency?: number;
  /** "primary", "backup", "backup2" и т.д. */
  mode?: string;
}

export interface SlurmPingResponse {
  pings?: SlurmPingItem[];
  errors?: SlurmApiError[];
}

// ── Управление узлом (запрос) ────────────────────────────────────────────────

export interface UpdateNodeRequest {
  /** Новое состояние: ["DRAIN"], ["RESUME"], ["DOWN"] */
  state?: string[];
  /** Причина (обязательна при DRAIN и DOWN) */
  reason?: string;
  comment?: string;
}