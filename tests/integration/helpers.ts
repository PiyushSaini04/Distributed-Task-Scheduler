import { pollDelayedQueue } from '../../src/queue/scheduler';
import { processJob } from '../../src/workers/worker';
import { getRedis } from '../../src/queue/redis';
import { QUEUE_KEYS } from '../../src/types';
import * as jobRepository from '../../src/repositories/jobRepository';
import { getPool } from '../../src/database/connection';

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function clearAll(): Promise<void> {
  await getPool().query(
    'TRUNCATE jobs, job_attempts, dead_letter_jobs, idempotency_keys, workers CASCADE',
  );
  const redis = getRedis();
  await redis.del(
    QUEUE_KEYS.pending,
    QUEUE_KEYS.processing,
    QUEUE_KEYS.delayed,
    QUEUE_KEYS.deadLetter,
  );
}

export async function waitForJobStatus(
  jobId: string,
  status: string,
  timeoutMs = 15000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const job = await jobRepository.findById(jobId);
    if (job?.status === status) return;
    await sleep(100);
  }
  const job = await jobRepository.findById(jobId);
  throw new Error(`Job ${jobId} did not reach ${status}, got ${job?.status}`);
}

export async function drainDelayedAndProcess(maxRounds = 20): Promise<void> {
  for (let i = 0; i < maxRounds; i++) {
    await pollDelayedQueue();
    const jobId = await getRedis().rpop(QUEUE_KEYS.pending);
    if (!jobId) {
      await sleep(50);
      continue;
    }
    await getRedis().zadd(QUEUE_KEYS.processing, Date.now(), jobId);
    await processJob(jobId);
  }
}

export async function processJobFromQueue(): Promise<string | null> {
  const jobId = await getRedis().rpop(QUEUE_KEYS.pending);
  if (!jobId) return null;
  await getRedis().zadd(QUEUE_KEYS.processing, Date.now(), jobId);
  await processJob(jobId);
  return jobId;
}

export async function processUntilDeadLetter(jobId: string, maxAttempts = 15): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const job = await jobRepository.findById(jobId);
    if (job?.status === 'DEAD_LETTER') return;

    if (job?.status === 'RETRYING') {
      await getRedis().zadd(QUEUE_KEYS.delayed, 0, jobId);
    }

    await pollDelayedQueue();

    const pendingId = await getRedis().lindex(QUEUE_KEYS.pending, 0);
    if (pendingId === jobId || job?.status === 'PENDING') {
      if (pendingId === jobId) {
        await getRedis().lrem(QUEUE_KEYS.pending, 1, jobId);
      }
      await getRedis().zadd(QUEUE_KEYS.processing, Date.now(), jobId);
      await processJob(jobId);
    }

    await sleep(50);
  }

  await waitForJobStatus(jobId, 'DEAD_LETTER', 5000);
}
