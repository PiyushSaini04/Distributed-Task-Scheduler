export type JobStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'RETRYING'
  | 'DEAD_LETTER';

export type JobType = 'email' | 'report' | 'notification' | 'data_sync' | 'image_processing';

export interface Job {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  idempotencyKey: string | null;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
  nextRetryAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  attemptCount?: number;
  workerId?: string | null;
  processingTimeMs?: number | null;
}

export interface JobAttempt {
  attemptNumber: number;
  workerId: string;
  status: string;
  error: string | null;
  durationMs: number | null;
  startedAt: string;
  completedAt: string | null;
}

export interface JobDetail extends Job {
  attempts: JobAttempt[];
}

export interface JobsResponse {
  jobs: Job[];
  limit: number;
  offset: number;
}

export interface Stats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  retrying: number;
  deadLetter: number;
  queueDepth: number;
  totalJobs: number;
  throughputPerMinute: number;
  avgProcessingTimeMs: number;
  activeWorkers?: number;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  checks: {
    postgres: 'ok' | 'error';
    redis: 'ok' | 'error';
    workerCount: number;
  };
}

export interface ReplayResponse {
  newJobId: string;
  originalJobId: string;
}

export type WorkerStatus = 'ACTIVE' | 'RECOVERING' | 'INACTIVE';

export interface WorkerInfo {
  id: string;
  status: WorkerStatus;
  jobsProcessed: number;
  uptimeMs: number;
  lastHeartbeat: string;
  startedAt: string;
}

export type RecentEventType =
  | 'job_completed'
  | 'worker_picked_job'
  | 'retry_scheduled'
  | 'job_moved_to_dlq'
  | 'worker_recovered'
  | 'worker_crash'
  | 'job_failed';

export interface RecentEvent {
  id: string;
  type: RecentEventType;
  message: string;
  timestamp: string;
  jobId?: string;
  workerId?: string;
}

export type Page = 'dashboard' | 'jobs' | 'dlq' | 'health';
