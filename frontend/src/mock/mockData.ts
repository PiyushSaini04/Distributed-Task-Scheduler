import type { JobDetail, JobStatus, JobType, RecentEvent, WorkerInfo } from '../types';

export const JOB_TYPES: JobType[] = [
  'email',
  'report',
  'notification',
  'data_sync',
  'image_processing',
];

export const WORKER_IDS = ['worker-1', 'worker-2', 'worker-3', 'worker-4'] as const;

export const FAILURE_REASONS = [
  'Redis timeout',
  'Database connection lost',
  'Invalid payload',
  'Worker crash',
  'External API failure',
] as const;

export const SEED_STATS = {
  totalJobs: 88,
  pending: 10,
  processing: 15,
  completed: 50,
  failed: 8,
  deadLetter: 5,
  queueDepth: 25,
  activeWorkers: 4,
  retrying: 0,
  throughputPerMinute: 87,
  avgProcessingTimeMs: 245,
} as const;

export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function randomInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export function randomProcessingTime(): number {
  return randomInt(85, 4200);
}

export function randomTimestampWithinHours(hours: number): string {
  const ms = Date.now() - Math.random() * hours * 3600000;
  return new Date(ms).toISOString();
}

export function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60000).toISOString();
}

export function secondsAgo(seconds: number): string {
  return new Date(Date.now() - seconds * 1000).toISOString();
}

function payloadForType(type: JobType): Record<string, unknown> {
  switch (type) {
    case 'email':
      return { to: `user${randomInt(1, 999)}@example.com`, subject: 'Account notification' };
    case 'report':
      return { reportId: `RPT-${randomInt(1000, 9999)}`, format: 'pdf' };
    case 'notification':
      return { userId: `usr_${randomInt(100, 999)}`, channel: 'push' };
    case 'data_sync':
      return { source: 'postgres', destination: 'warehouse', table: 'orders' };
    case 'image_processing':
      return { imageUrl: `https://cdn.example.com/img/${randomInt(1, 500)}.jpg`, operations: ['resize', 'compress'] };
  }
}

function pickWorker(index: number): string {
  return WORKER_IDS[index % WORKER_IDS.length];
}

function buildAttempts(
  status: JobStatus,
  workerId: string,
  retryCount: number,
  createdAt: string,
  processingTimeMs: number | null,
  errorMessage: string | null,
): JobDetail['attempts'] {
  const attempts: JobDetail['attempts'] = [];

  if (status === 'PENDING') return attempts;

  const totalAttempts =
    status === 'DEAD_LETTER'
      ? retryCount + 1
      : status === 'FAILED'
        ? retryCount + 1
        : Math.max(1, retryCount + (status === 'COMPLETED' ? 1 : 0));

  for (let i = 1; i <= totalAttempts; i++) {
    const isLast = i === totalAttempts;
    const startedAt = new Date(new Date(createdAt).getTime() + (i - 1) * 60000).toISOString();
    const duration = isLast && processingTimeMs ? processingTimeMs : randomProcessingTime();

    let attemptStatus = 'COMPLETED';
    let error: string | null = null;
    let completedAt: string | null = new Date(new Date(startedAt).getTime() + duration).toISOString();

    if (status === 'PROCESSING' && isLast) {
      attemptStatus = 'PROCESSING';
      completedAt = null;
    } else if (
      (status === 'FAILED' || status === 'DEAD_LETTER') &&
      isLast
    ) {
      attemptStatus = 'FAILED';
      error = errorMessage;
    } else if (status === 'DEAD_LETTER' && !isLast) {
      attemptStatus = 'FAILED';
      error = FAILURE_REASONS[(i - 1) % FAILURE_REASONS.length];
    } else if (status === 'COMPLETED' && i < totalAttempts) {
      attemptStatus = 'FAILED';
      error = 'Transient error — retrying';
    }

    attempts.push({
      attemptNumber: i,
      workerId: pickWorker(i + workerId.charCodeAt(workerId.length - 1)),
      status: attemptStatus,
      error,
      durationMs: completedAt ? duration : null,
      startedAt,
      completedAt,
    });
  }

  return attempts;
}

function createJob(
  status: JobStatus,
  index: number,
  options: {
    type?: JobType;
    failureReason?: string;
    forceRetryCount?: number;
  } = {},
): JobDetail {
  const type = options.type ?? JOB_TYPES[index % JOB_TYPES.length];
  const workerId = pickWorker(index);
  const createdAt = randomTimestampWithinHours(24);
  const updatedAt = minutesAgo(randomInt(1, 120));
  const processingTimeMs =
    status === 'PENDING' ? null : status === 'PROCESSING' ? randomProcessingTime() : randomProcessingTime();

  let retryCount = options.forceRetryCount ?? 0;
  let errorMessage: string | null = null;
  let nextRetryAt: string | null = null;
  let completedAt: string | null = null;

  if (status === 'FAILED') {
    retryCount = randomInt(1, 3);
    errorMessage = FAILURE_REASONS[index % FAILURE_REASONS.length];
    nextRetryAt = minutesAgo(-randomInt(1, 5));
  }

  if (status === 'DEAD_LETTER') {
    retryCount = 5;
    errorMessage = options.failureReason ?? FAILURE_REASONS[index % FAILURE_REASONS.length];
  }

  if (status === 'COMPLETED') {
    retryCount = index % 7 === 0 ? randomInt(1, 2) : 0;
    completedAt = updatedAt;
  }

  if (status === 'PROCESSING') {
    retryCount = index % 5 === 0 ? 1 : 0;
  }

  const attempts = buildAttempts(
    status,
    workerId,
    retryCount,
    createdAt,
    processingTimeMs,
    errorMessage,
  );

  return {
    id: uuid(),
    type,
    payload: payloadForType(type),
    status,
    idempotencyKey: uuid(),
    retryCount,
    maxRetries: 5,
    createdAt,
    updatedAt,
    nextRetryAt,
    completedAt,
    errorMessage,
    attemptCount: attempts.length,
    workerId: status === 'PENDING' ? null : workerId,
    processingTimeMs,
    attempts,
  };
}

export function createSeedJobs(): JobDetail[] {
  const jobs: JobDetail[] = [];
  const counts: { status: JobStatus; count: number }[] = [
    { status: 'COMPLETED', count: 50 },
    { status: 'PROCESSING', count: 15 },
    { status: 'PENDING', count: 10 },
    { status: 'FAILED', count: 8 },
    { status: 'DEAD_LETTER', count: 5 },
  ];

  let index = 0;
  for (const { status, count } of counts) {
    for (let i = 0; i < count; i++) {
      jobs.push(
        createJob(status, index, {
          failureReason: status === 'DEAD_LETTER' ? FAILURE_REASONS[i % FAILURE_REASONS.length] : undefined,
        }),
      );
      index++;
    }
  }

  return jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function createSeedWorkers(): WorkerInfo[] {
  const baseProcessed = [142, 128, 156, 119];
  const uptimeHours = [18.5, 16.2, 19.1, 14.8];

  return WORKER_IDS.map((id, i) => ({
    id,
    status: 'ACTIVE' as const,
    jobsProcessed: baseProcessed[i],
    uptimeMs: Math.round(uptimeHours[i] * 3600000),
    lastHeartbeat: secondsAgo(randomInt(1, 8)),
    startedAt: randomTimestampWithinHours(24),
  }));
}

export function createSeedEvents(jobs: JobDetail[]): RecentEvent[] {
  const templates: Omit<RecentEvent, 'id' | 'timestamp'>[] = [];

  for (const job of jobs.slice(0, 12)) {
    if (job.status === 'COMPLETED' && job.workerId) {
      templates.push({
        type: 'job_completed',
        message: `${job.type} job completed on ${job.workerId}`,
        jobId: job.id,
        workerId: job.workerId,
      });
    }
    if (job.status === 'PROCESSING' && job.workerId) {
      templates.push({
        type: 'worker_picked_job',
        message: `${job.workerId} picked ${job.type} job`,
        jobId: job.id,
        workerId: job.workerId,
      });
    }
    if (job.status === 'FAILED') {
      templates.push({
        type: 'retry_scheduled',
        message: `Retry scheduled for ${job.type} job (attempt ${job.retryCount})`,
        jobId: job.id,
      });
    }
    if (job.status === 'DEAD_LETTER') {
      templates.push({
        type: 'job_moved_to_dlq',
        message: `${job.type} job moved to DLQ — ${job.errorMessage}`,
        jobId: job.id,
      });
    }
  }

  templates.push({
    type: 'worker_recovered',
    message: 'worker-3 recovered after reaper reassigned stuck job',
    workerId: 'worker-3',
  });

  return templates
    .map((t, i) => ({
      ...t,
      id: uuid(),
      timestamp: minutesAgo(i * 3 + 1),
    }))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20);
}

export function createRandomJob(): JobDetail {
  const statuses: JobStatus[] = ['PENDING', 'PENDING', 'PROCESSING', 'COMPLETED'];
  const status = statuses[randomInt(0, statuses.length - 1)];
  return createJob(status, randomInt(0, 100), { type: JOB_TYPES[randomInt(0, JOB_TYPES.length - 1)] });
}
