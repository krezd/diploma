/**
 * TypeScript типы для SLURM Jobs.
 * Соответствуют DTO бэкенда (snake_case — формат JSON-ответа slurmrestd).
 */

// ── Базовые типы slurmrestd ────────────────────────────────────────────────

/** Целое число с флагами set/infinite (v0.0.40_uint32_no_val / uint64_no_val). */
export interface SlurmNoVal {
  set: boolean;
  infinite: boolean;
  number: number | null;
}

/** Число с плавающей точкой с флагами (v0.0.40_float64_no_val). */
export interface SlurmFloat64NoVal {
  set: boolean;
  infinite: boolean;
  number: number | null;
}

// ── Статусы заданий ────────────────────────────────────────────────────────

export type JobState =
  | 'PENDING'
  | 'RUNNING'
  | 'SUSPENDED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED'
  | 'TIMEOUT'
  | 'NODE_FAIL'
  | 'PREEMPTED'
  | 'BOOT_FAIL'
  | 'DEADLINE'
  | 'OUT_OF_MEMORY'
  | 'LAUNCH_FAILED'
  | 'UPDATE_DB'
  | 'REQUEUED'
  | 'REQUEUE_HOLD'
  | 'SPECIAL_EXIT'
  | 'RESIZING'
  | 'CONFIGURING'
  | 'COMPLETING'
  | 'STOPPED'
  | 'RECONFIG_FAIL'
  | 'POWER_UP_NODE'
  | 'REVOKED'
  | 'REQUEUE_FED'
  | 'RESV_DEL_HOLD'
  | 'SIGNALING'
  | 'STAGE_OUT';

/** Активные статусы (задача ещё в работе или ждёт). */
export const ACTIVE_JOB_STATES: JobState[] = [
  'PENDING',
  'RUNNING',
  'SUSPENDED',
  'CONFIGURING',
  'COMPLETING',
  'RESIZING',
  'SIGNALING',
  'STAGE_OUT',
  'POWER_UP_NODE',
];

/** Завершённые статусы. */
export const FINISHED_JOB_STATES: JobState[] = [
  'COMPLETED',
  'CANCELLED',
  'FAILED',
  'TIMEOUT',
  'NODE_FAIL',
  'PREEMPTED',
  'BOOT_FAIL',
  'DEADLINE',
  'OUT_OF_MEMORY',
  'LAUNCH_FAILED',
  'STOPPED',
  'REVOKED',
];

// ── Код завершения процесса (v0.0.40_process_exit_code_verbose) ────────────

export type ExitStatus =
  | 'INVALID'
  | 'PENDING'
  | 'SUCCESS'
  | 'ERROR'
  | 'SIGNALED'
  | 'CORE_DUMPED';

export interface SlurmProcessExitCode {
  status?: ExitStatus[];
  return_code?: SlurmNoVal;
  signal?: {
    id?: SlurmNoVal;
    name?: string;
  };
}

// ── Ресурсы задания (v0.0.40_job_res) ─────────────────────────────────────

export interface SlurmJobRes {
  nodes?: string;
  allocated_cores?: number;
  allocated_cpus?: number;
  allocated_hosts?: number;
  allocated_nodes?: unknown[];
}

// ── Активное задание (v0.0.40_job_info -> SlurmJobDTO) ────────────────────

export interface SlurmJobInfo {
  // Идентификация
  job_id?: number;
  name?: string;
  account?: string;
  cluster?: string;
  partition?: string;
  qos?: string;
  wckey?: string;

  // Пользователь / группа
  user_id?: number;
  user_name?: string;
  group_id?: number;
  group_name?: string;

  // Состояние
  job_state?: JobState[];
  state_description?: string;
  state_reason?: string;
  flags?: string[];

  // Временны́е метки
  submit_time?: SlurmNoVal;
  eligible_time?: SlurmNoVal;
  accrue_time?: SlurmNoVal;
  start_time?: SlurmNoVal;
  end_time?: SlurmNoVal;
  deadline?: SlurmNoVal;
  suspend_time?: SlurmNoVal;
  preempt_time?: SlurmNoVal;
  preemptable_time?: SlurmNoVal;
  pre_sus_time?: SlurmNoVal;
  resize_time?: SlurmNoVal;
  last_sched_evaluation?: SlurmNoVal;

  // Ресурсы
  cpus?: SlurmNoVal;
  node_count?: SlurmNoVal;
  tasks?: SlurmNoVal;
  time_limit?: SlurmNoVal;
  time_minimum?: SlurmNoVal;
  delay_boot?: SlurmNoVal;
  memory_per_cpu?: SlurmNoVal;
  memory_per_node?: SlurmNoVal;
  memory_per_tres?: string;
  max_cpus?: SlurmNoVal;
  max_nodes?: SlurmNoVal;
  billable_tres?: SlurmFloat64NoVal;

  // Топология / узлы
  nodes?: string;
  scheduled_nodes?: string;
  required_nodes?: string;
  excluded_nodes?: string;
  failed_node?: string;
  allocating_node?: string;
  batch_host?: string;

  // CPU / сокеты / потоки
  cpu_frequency_minimum?: SlurmNoVal;
  cpu_frequency_maximum?: SlurmNoVal;
  cpu_frequency_governor?: SlurmNoVal;
  priority?: SlurmNoVal;
  nice?: number;
  cores_per_socket?: SlurmNoVal;
  sockets_per_node?: SlurmNoVal;
  threads_per_core?: SlurmNoVal;
  tasks_per_core?: SlurmNoVal;
  tasks_per_node?: SlurmNoVal;
  tasks_per_socket?: SlurmNoVal;
  tasks_per_tres?: SlurmNoVal;
  tasks_per_board?: SlurmNoVal;
  minimum_cpus_per_node?: SlurmNoVal;
  minimum_tmp_disk_per_node?: SlurmNoVal;
  cpus_per_tres?: string;
  cpus_per_task?: SlurmNoVal;
  sockets_per_board?: number;
  core_spec?: number;
  thread_spec?: number;
  association_id?: number;

  // TRES-строки
  tres_bind?: string;
  tres_freq?: string;
  tres_per_job?: string;
  tres_per_node?: string;
  tres_per_socket?: string;
  tres_per_task?: string;
  tres_req_str?: string;
  tres_alloc_str?: string;

  // Файлы ввода/вывода
  standard_input?: string;
  standard_output?: string;
  standard_error?: string;
  current_working_directory?: string;
  command?: string;

  // Коды завершения
  exit_code?: SlurmProcessExitCode;
  derived_exit_code?: SlurmProcessExitCode;

  // Ресурсы задания
  job_resources?: SlurmJobRes;
  gres_detail?: string[];
  job_size_str?: string[];

  // Массивы заданий
  array_job_id?: SlurmNoVal;
  array_task_id?: SlurmNoVal;
  array_max_tasks?: SlurmNoVal;
  array_task_string?: string;

  // Гетерогенные задания
  het_job_id?: SlurmNoVal;
  het_job_id_set?: string;
  het_job_offset?: SlurmNoVal;

  // Почта
  mail_type?: string[];
  mail_user?: string;

  // Разное
  comment?: string;
  admin_comment?: string;
  system_comment?: string;
  extra?: string;
  dependency?: string;
  features?: string;
  prefer?: string;
  licenses?: string;
  network?: string;
  mcs_label?: string;
  selinux_context?: string;
  resv_name?: string;
  batch_features?: string;
  burst_buffer?: string;
  burst_buffer_state?: string;
  cluster_features?: string;
  container?: string;
  container_id?: string;
  cron?: string;
  federation_origin?: string;
  federation_siblings_active?: string;
  federation_siblings_viable?: string;

  batch_flag?: boolean;
  contiguous?: boolean;
  hold?: boolean;
  reboot?: boolean;
  requeue?: boolean;
  oversubscribe?: boolean;

  restart_cnt?: number;
  minimum_switches?: number;
  maximum_switch_wait_time?: number;

  shared?: string[];
  exclusive?: string[];
  show_flags?: string[];
  profile?: string[];
  power?: { flags?: string[] };
}

/** Ответ на GET /slurm/jobs и GET /slurm/user/jobs. */
export interface SlurmJobsResponse {
  jobs: SlurmJobInfo[];
  last_backfill?: SlurmNoVal;
  last_update?: SlurmNoVal;
  errors?: unknown[];
  warnings?: unknown[];
}

// ── TRES (из slurmdbd) ────────────────────────────────────────────────────

export interface SlurmDbTres {
  type: string;
  name?: string;
  id?: number;
  count?: number;
}

// ── Архивное задание (v0.0.40_job -> SlurmDbJobDTO) ───────────────────────

export interface SlurmDbJob {
  job_id?: number;
  name?: string;
  account?: string;
  cluster?: string;
  partition?: string;
  qos?: string;
  user?: string;
  group?: string;
  nodes?: string;
  container?: string;
  constraints?: string;
  licenses?: string;
  script?: string;
  submit_line?: string;
  extra?: string;
  failed_node?: string;
  used_gres?: string;
  working_directory?: string;
  kill_request_user?: string;
  hold?: boolean;
  allocation_nodes?: number;

  association?: {
    account?: string;
    cluster?: string;
    partition?: string;
    user?: string;
    id?: number;
  };

  /** Временны́е метки — unix timestamp (секунды), elapsed в секундах. */
  time?: {
    elapsed?: number;
    eligible?: number;
    end?: number;
    start?: number;
    submission?: number;
    suspended?: number;
    limit?: SlurmNoVal;
    system?: { seconds?: number; microseconds?: number };
    total?: { seconds?: number; microseconds?: number };
    user?: { seconds?: number; microseconds?: number };
  };

  state?: {
    current?: JobState[];
    reason?: string;
  };

  exit_code?: SlurmProcessExitCode;
  derived_exit_code?: SlurmProcessExitCode;

  /** Флаги: NONE, CLEAR_SCHEDULING, STARTED_ON_SUBMIT, STARTED_ON_SCHEDULE и др. */
  flags?: string[];

  required?: {
    CPUs?: number;
    memory_per_cpu?: SlurmNoVal;
    memory_per_node?: SlurmNoVal;
  };

  priority?: SlurmNoVal;

  array?: {
    job_id?: number;
    task_id?: SlurmNoVal;
    task?: string;
    limits?: { max?: { running?: { tasks?: number } } };
  };

  het?: {
    job_id?: number;
    job_offset?: SlurmNoVal;
  };

  reservation?: { id?: number; name?: string };

  mcs?: { label?: string };

  wckey?: { wckey?: string; flags?: string[] };

  tres?: {
    allocated?: SlurmDbTres[];
    requested?: SlurmDbTres[];
  };

  steps?: SlurmDbJobStep[];
}

export interface SlurmDbJobStep {
  step?: { id?: string; name?: string };
  time?: {
    elapsed?: number;
    end?: SlurmNoVal;
    start?: SlurmNoVal;
    suspended?: number;
    system?: { seconds?: number; microseconds?: number };
    total?: { seconds?: number; microseconds?: number };
    user?: { seconds?: number; microseconds?: number };
  };
  exit_code?: SlurmProcessExitCode;
  nodes?: { count?: number; range?: string; list?: string[] };
  tasks?: { count?: number };
  state?: JobState[];
  pid?: string;
  kill_request_user?: string;
}

/** Ответ на GET /slurm/jobs/history и GET /slurm/user/jobs/history. */
export interface SlurmDbJobsResponse {
  jobs: SlurmDbJob[];
  errors?: unknown[];
  warnings?: unknown[];
}

// ── Отправка / обновление задания ─────────────────────────────────────────

/** Параметры задания (v0.0.40_job_desc_msg -> SlurmJobDescMsg). */
export interface SlurmJobDescMsg {
  // Идентификация
  name?: string;
  partition?: string;
  account?: string;
  qos?: string;
  wckey?: string;
  comment?: string;

  // Ресурсы
  tasks?: number;
  cpus_per_task?: number;
  minimum_nodes?: number;
  maximum_nodes?: number;
  minimum_cpus?: number;
  maximum_cpus?: number;
  minimum_cpus_per_node?: number;
  memory_per_node?: SlurmNoVal;
  memory_per_cpu?: SlurmNoVal;
  temporary_disk_per_node?: number;
  time_limit?: SlurmNoVal;
  time_minimum?: SlurmNoVal;
  nice?: number;

  // Топология
  threads_per_core?: number;
  tasks_per_node?: number;
  tasks_per_socket?: number;
  tasks_per_core?: number;
  sockets_per_node?: number;
  ntasks_per_tres?: number;

  // Узлы
  required_nodes?: string[];
  excluded_nodes?: string[];
  constraints?: string;
  contiguous?: boolean;

  // TRES
  tres_per_job?: string;
  tres_per_node?: string;
  tres_per_socket?: string;
  tres_per_task?: string;
  tres_bind?: string;
  tres_freq?: string;

  // Планирование
  array?: string;
  dependency?: string;
  reservation?: string;
  begin_time?: number;
  deadline?: number;
  exclusive?: string[];
  shared?: string[];
  oversubscribe?: boolean;
  distribution?: string;
  required_switches?: SlurmNoVal;
  wait_for_switch?: number;

  // Поведение
  hold?: boolean;
  requeue?: boolean;
  wait_all_nodes?: boolean;
  kill_on_node_fail?: boolean;

  // Лицензии и сеть
  licenses?: string;
  network?: string;

  // Почта
  mail_type?: string[];
  mail_user?: string;

  // Файлы и рабочая директория
  current_working_directory?: string;
  standard_input?: string;
  standard_output?: string;
  standard_error?: string;
  open_mode?: string[];

  // Окружение
  environment?: string[];
}

/** Тело запроса POST /slurm/job/submit. */
export interface SlurmJobSubmitRequest {
  /** Bash-скрипт задания (включая #SBATCH директивы). */
  script: string;
  /** Параметры задания — дополняют/переопределяют #SBATCH в скрипте. */
  job?: SlurmJobDescMsg;
}

/**
 * Упрощённый запрос отправки задания через sbatch CLI.
 * Поля соответствуют флагам sbatch.
 */
export interface BatchJobSubmitRequest {
  // Идентификация
  name?: string;
  partition?: string;
  account?: string;
  qos?: string;
  comment?: string;

  // Ресурсы
  nodes?: number;
  nodelist?: string;
  ntasks?: number;
  ntasks_per_node?: number;
  cpus_per_task?: number;
  time_limit_minutes?: number;
  mem_mb_per_node?: number;
  mem_mb_per_cpu?: number;
  gres?: string;

  // Планирование
  dependency?: string;
  array?: string;
  reservation?: string;
  constraints?: string;
  exclusive?: boolean;

  // Уведомления
  mail_user?: string;
  mail_type?: string[];

  // Исполнение
  script_body: string;
  working_directory?: string;

  /**
   * Если true — script_body является полным bash-скриптом (включая #SBATCH директивы).
   * Используется в режиме прямого ввода bash-скрипта.
   */
  raw_mode?: boolean;
}

/** Ответ на POST /slurm/job/submit. */
export interface SlurmJobSubmitResponse {
  job_id?: number;
  step_id?: string;
  job_submit_user_msg?: string;
  errors?: unknown[];
  warnings?: unknown[];
}

// ── Usage статистика ───────────────────────────────────────────────────────

/** Агрегированная usage-статистика (GET /slurm/jobs/usage). */
export interface JobUsageStats {
  period_start?: number;
  period_end?: number;
  total_jobs: number;
  jobs_by_status: Record<string, number>;
  total_cpu_hours: number;
  total_mem_gb_hours: number;
  avg_wait_time_seconds: number;
  avg_elapsed_seconds: number;
  failed_with_non_zero_exit: number;
}