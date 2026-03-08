export interface SlurmAccount {
  name: string;
  description: string;
  organization: string;
}

export interface SlurmAccountsResponse {
  accounts: SlurmAccount[];
}

/** Плоские лимиты ассоциации, вычисляемые бэкендом из max-объекта slurmrestd. */
export interface AssocLimits {
  // Групповые лимиты (GRP*) — суммарные для всей ассоциации
  grpJobs?: number | null;
  grpJobsAccrue?: number | null;
  grpSubmitJobs?: number | null;
  /** GrpWall в минутах (max.per.account.wall_clock) */
  grpWallMinutes?: number | null;
  grpTres?: string | null;
  grpTresMins?: string | null;
  grpTresRunMins?: string | null;

  // Индивидуальные лимиты (Max*) — на пользователя / задание
  maxJobs?: number | null;
  maxJobsAccrue?: number | null;
  maxSubmitJobs?: number | null;
  /** MaxWall в минутах (max.jobs.per.wall_clock) */
  maxWallMinutes?: number | null;
  maxTresPerJob?: string | null;
  maxTresPerNode?: string | null;
  maxTresMinsPerJob?: string | null;

  fairshare?: number | null;
}

export interface SlurmAssociation {
  user?: string;
  account?: string;
  cluster?: string;
  partition?: string;
  /** Список разрешённых QOS для этой ассоциации */
  qos?: string[];
  /** Вложенный объект {"default": {"qos": "..."}} из ответа slurmrestd */
  default?: {
    qos?: string;
  };
  /** Плоские лимиты ассоциации (заполняются бэкендом) */
  limits?: AssocLimits;
}

export interface SlurmAssociationsResponse {
  associations: SlurmAssociation[];
}

export interface CreateAccountRequest {
  name: string;
  description?: string;
  organization?: string;
}

export interface AssociateUserRequest {
  username: string;
  accountName: string;
}
