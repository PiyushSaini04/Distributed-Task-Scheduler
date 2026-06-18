import { CreateJobInput, Job, JobStats } from '../types';
import * as jobRepository from '../repositories/jobRepository';
import * as producer from '../queue/producer';
import { v4 as uuidv4 } from 'uuid';

export interface CreateJobResult {
  job: Job;
  deduplicated: boolean;
}

export async function createJob(input: CreateJobInput): Promise<CreateJobResult> {
  const { type, payload, idempotencyKey } = input;

  const { job, inserted } = await jobRepository.create(type, payload, idempotencyKey);

  if (!inserted) {
    const existing = await jobRepository.findByIdempotencyKey(idempotencyKey);
    if (!existing) {
      throw new Error(`Idempotency key exists but job not found: ${idempotencyKey}`);
    }
    return { job: existing, deduplicated: true };
  }

  await producer.enqueue(job!.id);

  return { job: job!, deduplicated: false };
}

export async function getJob(id: string): Promise<Job | null> {
  return jobRepository.findById(id);
}

export async function listJobs(
  status?: Job['status'],
  limit?: number,
  offset?: number,
): Promise<Job[]> {
  return jobRepository.findMany(status, limit, offset);
}

export async function getStats(): Promise<JobStats> {
  const counts = await jobRepository.getStatsCounts();
  const { throughputPerMinute, avgProcessingTimeMs } =
    await jobRepository.getThroughputAndAvgTime();

  return {
    pending: counts.pending ?? 0,
    processing: counts.processing ?? 0,
    completed: counts.completed ?? 0,
    failed: counts.failed ?? 0,
    retrying: counts.retrying ?? 0,
    deadLetter: counts.deadLetter ?? 0,
    throughputPerMinute,
    avgProcessingTimeMs,
  };
}

export async function replayDeadLetterJob(
  originalJobId: string,
): Promise<{ newJob: Job; originalJobId: string }> {
  const original = await jobRepository.findById(originalJobId);
  if (!original) {
    throw new Error(`Job not found: ${originalJobId}`);
  }
  if (original.status !== 'DEAD_LETTER') {
    throw new Error(`Job ${originalJobId} is not in DEAD_LETTER state`);
  }

  const newIdempotencyKey = `replay-${originalJobId}-${uuidv4()}`;
  const { job, inserted } = await jobRepository.create(
    original.type,
    original.payload,
    newIdempotencyKey,
    original.maxRetries,
  );

  if (!inserted || !job) {
    throw new Error('Failed to create replay job');
  }

  await producer.enqueue(job.id);

  const { replayFromDlq } = await import('./dlqService');
  await replayFromDlq(originalJobId, job.id);

  return { newJob: job, originalJobId };
}
