export type JobStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'RETRYING'
  | 'DEAD_LETTER';

export interface Job {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  idempotencyKey: string | null;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
  nextRetryAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
}

export interface JobAttempt {
  id: string;
  jobId: string;
  attemptNumber: number;
  workerId: string;
  startedAt: Date;
  completedAt: Date | null;
  status: string;
  errorMessage: string | null;
  durationMs: number | null;
}

export interface CreateJobInput {
  type: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
}

export interface JobStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  retrying: number;
  deadLetter: number;
  throughputPerMinute: number;
  avgProcessingTimeMs: number;
}

export const QUEUE_KEYS = {
  pending: 'queue:pending',
  processing: 'queue:processing',
  delayed: 'queue:delayed',
  deadLetter: 'queue:dead_letter',
} as const;
