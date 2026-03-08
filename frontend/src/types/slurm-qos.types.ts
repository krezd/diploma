/**
 * Один TRES из GET /api/slurm/tres.
 * Пример: { type: "gres", name: "gpu", id: 1001 }
 */
export interface SlurmTresItem {
  type: string;  // cpu, mem, node, gres, license, energy, billing, etc.
  name?: string; // подтип: gpu, a100, licA — только для gres/license
  id?: number;
}

/**
 * Полное представление QOS (ответ GET /api/slurm/qos).
 * null = значение не задано в slurmdbd.
 * -1 = без ограничений (UNLIMITED).
 * TRES-поля: строка формата "cpu=100,gres/gpu=10".
 * Флаги: имена sacctmgr (DenyOnLimit, NoDecay, …).
 */
export interface SlurmQos {
  id?: number;
  name: string;
  description?: string;
  priority?: number | null;
  flags?: string[];

  // Коэффициенты и временные параметры
  usageFactor?: number | null;
  usageThreshold?: number | null;
  limitFactor?: number | null;
  /** GraceTime в секундах */
  graceTime?: number | null;
  minPrioThreshold?: number | null;

  // Групповые лимиты QOS (суммарно для всех пользователей)
  /** GrpJobs — макс. одновременно выполняющихся заданий для QOS */
  grpJobs?: number | null;
  /** GrpSubmitJobs — макс. поданных заданий (очередь+выполнение) для QOS */
  grpSubmitJobs?: number | null;
  /** GrpJobsAccrue */
  grpJobsAccrue?: number | null;
  /** GrpWall в минутах */
  grpWallMinutes?: number | null;
  /** GrpTRES: "cpu=100,gres/gpu=10" */
  grpTres?: string | null;
  /** GrpTRESMins: "cpu=1000" */
  grpTresMins?: string | null;
  /** GrpTRESRunMins: лимит TRES-минут для одновременно выполняющихся заданий */
  grpTresRunMins?: string | null;

  // Лимиты на пользователя
  /** MaxJobsPerUser — макс. одновременно выполняющихся заданий */
  maxJobsPerUser?: number | null;
  /** MaxSubmitJobsPerUser — макс. поданных (очередь + выполнение) заданий */
  maxSubmitJobsPerUser?: number | null;
  maxJobsAccruePerUser?: number | null;
  maxTresPerUser?: string | null;

  // Лимиты на аккаунт
  /** MaxJobsPerAccount — макс. одновременно выполняющихся заданий */
  maxJobsPerAccount?: number | null;
  /** MaxSubmitJobsPerAccount — макс. поданных заданий */
  maxSubmitJobsPerAccount?: number | null;
  maxJobsAccruePerAccount?: number | null;
  maxTresPerAccount?: string | null;

  // Лимиты на задание
  maxTresPerJob?: string | null;
  maxTresPerNode?: string | null;
  maxTresMinsPerJob?: string | null;
  /** MaxWallDurationPerJob в минутах */
  maxWallDurationPerJobMinutes?: number | null;

  // Минимальные лимиты
  minTresPerJob?: string | null;
}

export interface SlurmQosListResponse {
  qos: SlurmQos[];
}

/**
 * Тело запроса для создания / изменения QOS.
 * null = не изменять; -1 = UNLIMITED; 0 = снять лимит.
 * TRES-поля: строка "cpu=100,gres/gpu=10".
 * Флаги: имена sacctmgr.
 */
export interface CreateQosRequest {
  name: string;
  description?: string;
  priority?: number | null;
  flags?: string[];
  graceTime?: number | null;
  usageFactor?: number | null;
  usageThreshold?: number | null;
  limitFactor?: number | null;
  minPrioThreshold?: number | null;

  // Групповые лимиты QOS
  grpJobs?: number | null;
  grpJobsAccrue?: number | null;
  grpSubmitJobs?: number | null;
  grpWallMinutes?: number | null;
  grpTres?: string;
  grpTresMins?: string;
  grpTresRunMins?: string;

  // Лимиты на пользователя
  maxJobsPerUser?: number | null;
  maxJobsAccruePerUser?: number | null;
  maxSubmitJobsPerUser?: number | null;
  maxTresPerUser?: string;

  // Лимиты на аккаунт
  maxJobsPerAccount?: number | null;
  maxJobsAccruePerAccount?: number | null;
  maxSubmitJobsPerAccount?: number | null;
  maxTresPerAccount?: string;

  // Лимиты на задание
  maxTresPerJob?: string;
  maxTresPerNode?: string;
  maxTresMinsPerJob?: string;
  maxWallDurationPerJobMinutes?: number | null;

  // Минимальные лимиты
  minTresPerJob?: string;
}

export interface SetAssociationQosRequest {
  account: string;
  user?: string;
  qos?: string[];
  defaultQos?: string;
}

/**
 * Тело запроса для установки личных лимитов пользователя в ассоциации.
 * null = не изменять; -1 = UNLIMITED; 0 = снять лимит.
 */
export interface SetAssociationLimitsRequest {
  account: string;
  user?: string;

  // Индивидуальные лимиты
  maxJobs?: number | null;
  maxJobsAccrue?: number | null;
  maxSubmitJobs?: number | null;
  maxWallMinutes?: number | null;
  maxTresPerJob?: string;
  maxTresPerNode?: string;
  maxTresMinsPerJob?: string;

  // Прочее
  fairshare?: number | null;
}