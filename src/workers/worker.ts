import * as consumer from '../queue/consumer';
import * as producer from '../queue/producer';
import * as jobRepository from '../repositories/jobRepository';
import * as attemptRepository from '../repositories/attemptRepository';
import * as workerRepository from '../repositories/workerRepository';
import { handleJobFailure } from '../services/dlqService';
import { getHandler } from './handlers';
import {
  setupGracefulShutdown,
  getIsRunning,
  setCurrentJobPromise,
} from './gracefulShutdown';
import { logger, logJobEvent, logJobError } from '../logger/logger';
import { metrics } from '../metrics/prometheus';
import { migrate } from '../database/migrate';

const WORKER_ID = process.env.WORKER_ID ?? `worker-${process.pid}`;

async function processJob(jobId: string): Promise<void> {
  const startTime = Date.now();
  let attemptId: string | null = null;

  try {
    const job = await jobRepository.findById(jobId);
    if (!job) {
      logger.warn({ jobId, event: 'job_not_found_in_db' });
      await producer.removeFromProcessing(jobId);
      return;
    }

    if (job.status !== 'PENDING' && job.status !== 'RETRYING') {
      logger.warn({
        jobId,
        event: 'job_skipped_invalid_status',
        status: job.status,
      });
      await producer.removeFromProcessing(jobId);
      return;
    }

    if (job.status === 'RETRYING') {
      await jobRepository.transitionStatus(jobId, 'RETRYING', 'PENDING');
    }

    await jobRepository.transitionStatus(jobId, 'PENDING', 'PROCESSING');

    const attemptNumber = job.retryCount + 1;
    const attempt = await attemptRepository.createAttempt(jobId, attemptNumber, WORKER_ID);
    attemptId = attempt.id;

    const handler = getHandler(job.type);
    await handler(job.payload);

    const durationMs = Date.now() - startTime;
    await producer.removeFromProcessing(jobId);
    await jobRepository.transitionStatus(jobId, 'PROCESSING', 'COMPLETED', {
      completedAt: new Date(),
    });
    await attemptRepository.completeAttempt(attemptId, 'COMPLETED', durationMs);
    await workerRepository.incrementJobsProcessed(WORKER_ID);

    metrics.jobsProcessedTotal.inc();
    metrics.processingTimeMs.observe(durationMs);

    logJobEvent('job_completed', {
      jobId,
      workerId: WORKER_ID,
      status: 'COMPLETED',
      attemptNumber,
      executionTimeMs: durationMs,
      jobType: job.type,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    const durationMs = Date.now() - startTime;

    await producer.removeFromProcessing(jobId);

    if (attemptId) {
      await attemptRepository.completeAttempt(attemptId, 'FAILED', durationMs, error.message);
    }

    const job = await jobRepository.findById(jobId);
    if (job) {
      await handleJobFailure(job, error.message);
    }

    logJobError('job_failed', error, {
      jobId,
      workerId: WORKER_ID,
      status: 'FAILED',
      executionTimeMs: durationMs,
    });
  }
}

async function run(): Promise<void> {
  await migrate();
  await workerRepository.register(WORKER_ID);
  setupGracefulShutdown(WORKER_ID, async () => {
    await workerRepository.deregister(WORKER_ID);
  });

  logger.info({ workerId: WORKER_ID, event: 'worker_started' });

  while (getIsRunning()) {
    const jobId = await consumer.claimJob();
    if (!jobId) {
      await workerRepository.heartbeat(WORKER_ID);
      continue;
    }

    const promise = processJob(jobId);
    setCurrentJobPromise(promise);
    await promise;
    setCurrentJobPromise(null);
    await workerRepository.heartbeat(WORKER_ID);
  }
}

if (require.main === module) {
  run().catch((err) => {
    logger.error({ event: 'worker_fatal', error: err.message, stack: err.stack });
    process.exit(1);
  });
}

export { run, processJob, WORKER_ID };
