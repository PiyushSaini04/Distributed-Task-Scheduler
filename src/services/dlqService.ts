import * as jobRepository from '../repositories/jobRepository';
import * as attemptRepository from '../repositories/attemptRepository';
import * as dlqRepository from '../repositories/dlqRepository';
import * as producer from '../queue/producer';
import { computeNextRetryDelay } from './retryService';
import { Job } from '../types';
import { logger } from '../logger/logger';
import { metrics } from '../metrics/prometheus';

export async function moveToDeadLetter(
  job: Job,
  failureReason: string,
): Promise<void> {
  const retryHistory = await attemptRepository.getRetryHistory(job.id);

  await jobRepository.transitionStatus(job.id, 'FAILED', 'DEAD_LETTER', {
    errorMessage: failureReason,
  });

  await dlqRepository.create(
    job.id,
    job.payload,
    failureReason,
    retryHistory,
    job.retryCount + 1,
  );

  await producer.enqueueToDeadLetter(job.id);
  metrics.jobsFailedTotal.inc();
  logger.warn({
    jobId: job.id,
    event: 'job_moved_to_dlq',
    failureReason,
    retryCount: job.retryCount,
  });
}

export async function scheduleRetry(job: Job, errorMessage: string): Promise<void> {
  const newRetryCount = job.retryCount + 1;
  const delayMs = computeNextRetryDelay(newRetryCount);
  const nextRetryAt = new Date(Date.now() + delayMs);

  await jobRepository.transitionStatus(job.id, 'PROCESSING', 'FAILED', {
    errorMessage,
  });

  await jobRepository.transitionStatus(job.id, 'FAILED', 'RETRYING', {
    retryCount: newRetryCount,
    nextRetryAt,
  });

  await producer.addToDelayed(job.id, nextRetryAt.getTime());
  metrics.jobsRetriedTotal.inc();

  logger.info({
    jobId: job.id,
    event: 'job_scheduled_for_retry',
    retryCount: newRetryCount,
    delayMs,
    nextRetryAt: nextRetryAt.toISOString(),
  });
}

export async function handleJobFailure(
  job: Job,
  errorMessage: string,
): Promise<void> {
  if (job.retryCount < job.maxRetries) {
    await scheduleRetry(job, errorMessage);
  } else {
    await jobRepository.transitionStatus(job.id, 'PROCESSING', 'FAILED', {
      errorMessage,
      retryCount: job.retryCount,
    });
    await moveToDeadLetter(
      { ...job, retryCount: job.retryCount },
      errorMessage,
    );
  }
}

export async function replayFromDlq(
  jobId: string,
  newJobId: string,
): Promise<void> {
  const dlqEntry = await dlqRepository.findByJobId(jobId);
  if (dlqEntry) {
    await dlqRepository.markReplayed(dlqEntry.id, newJobId);
  }
}
