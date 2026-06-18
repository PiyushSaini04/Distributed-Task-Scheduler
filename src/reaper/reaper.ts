import { getRedis } from '../queue/redis';
import { QUEUE_KEYS } from '../types';
import * as jobRepository from '../repositories/jobRepository';
import * as producer from '../queue/producer';
import { computeNextRetryDelay } from '../services/retryService';
import { logger } from '../logger/logger';
import { metrics } from '../metrics/prometheus';
import { migrate } from '../database/migrate';

const STUCK_TIMEOUT_MS = parseInt(process.env.STUCK_JOB_TIMEOUT_MS ?? '300000', 10);
const REAPER_INTERVAL_MS = parseInt(process.env.REAPER_INTERVAL_MS ?? '60000', 10);

async function reap(): Promise<void> {
  const cutoff = Date.now() - STUCK_TIMEOUT_MS;
  const redis = getRedis();

  const stuckJobIds = await redis.zrangebyscore(QUEUE_KEYS.processing, '-inf', cutoff);

  for (const jobId of stuckJobIds) {
    logger.warn({ jobId, event: 'stuck_job_detected' });

    await redis.zrem(QUEUE_KEYS.processing, jobId);

    const job = await jobRepository.findById(jobId);
    if (!job) {
      logger.warn({ jobId, event: 'stuck_job_not_in_db' });
      continue;
    }

    if (job.status !== 'PROCESSING') {
      logger.warn({ jobId, event: 'stuck_job_wrong_status', status: job.status });
      continue;
    }

    const newRetryCount = job.retryCount + 1;

    if (newRetryCount <= job.maxRetries) {
      const delayMs = computeNextRetryDelay(newRetryCount);
      const nextRetryAt = new Date(Date.now() + delayMs);

      await jobRepository.transitionStatus(jobId, 'PROCESSING', 'FAILED', {
        errorMessage: 'Worker timeout — job reaped',
      });
      await jobRepository.transitionStatus(jobId, 'FAILED', 'RETRYING', {
        retryCount: newRetryCount,
        nextRetryAt,
      });
      await producer.addToDelayed(jobId, nextRetryAt.getTime());
      metrics.jobsRetriedTotal.inc();
    } else {
      const { moveToDeadLetter } = await import('../services/dlqService');
      await jobRepository.transitionStatus(jobId, 'PROCESSING', 'FAILED', {
        errorMessage: 'Worker timeout — max retries exceeded',
        retryCount: job.retryCount,
      });
      const updatedJob = await jobRepository.findById(jobId);
      if (updatedJob) {
        await moveToDeadLetter(updatedJob, 'Worker timeout — max retries exceeded');
      }
    }

    metrics.reapedJobsTotal.inc();
    logger.info({ jobId, event: 'stuck_job_reaped', retryCount: newRetryCount });
  }
}

async function start(): Promise<void> {
  await migrate();
  logger.info({ event: 'reaper_started', intervalMs: REAPER_INTERVAL_MS });

  await reap();
  setInterval(reap, REAPER_INTERVAL_MS);
}

start().catch((err) => {
  logger.error({ event: 'reaper_fatal', error: err.message, stack: err.stack });
  process.exit(1);
});
