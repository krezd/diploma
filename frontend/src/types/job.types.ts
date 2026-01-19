/**
 * TypeScript типы для SLURM Jobs
 * Соответствуют моделям в Spring Boot бэкенде
 */

export enum JobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  TIMEOUT = 'TIMEOUT',
}

export interface Job {
  id: string | number;
  name: string;
  userId: string;
  status: JobStatus;
  partition?: string;
  queue?: string;
  nodeList?: string;
  
  // Время
  submitTime: string;
  startTime?: string;
  endTime?: string;
  
  // Ресурсы
  cpus?: number;
  memory?: string; // например, "4G"
  gpus?: number;
  
  // SLURM специфичные
  jobId?: number; // SLURM job ID
  slurmStatus?: string;
  
  // Команда
  command?: string;
  script?: string;
  
  // Output/Error
  stdoutPath?: string;
  stderrPath?: string;
}

export interface JobSubmitRequest {
  name: string;
  partition?: string;
  cpus?: number;
  memory?: string;
  timeLimit?: string; // например, "01:00:00"
  command: string;
  script?: string;
  outputFile?: string;
  errorFile?: string;
}

export interface JobOutput {
  stdout: string;
  stderr: string;
}
