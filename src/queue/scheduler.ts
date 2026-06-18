import { getRedis } from './redis';
import { QUEUE_KEYS } from '../types';
import { logger } from '../logger/logger';
import * as jobRepository from '../repositories/jobRepository';
import * as producer from './producer';

const POLL_INTERVAL_MS = 5000;

export async function pollDelayedQueue(): Promise<void> {
  const now = Date.now();
  const readyJobIds = await getRedis().zrangebyscore(QUEUE_KEYS.delayed, '-inf', now);

  for (const jobId of readyJobIds) {
    const removed = await getRedis().zrem(QUEUE_KEYS.delayed, jobId);
    if (removed === 0) continue;

    try {
      await jobRepository.transitionStatus(jobId, 'RETRYING', 'PENDING');
      await producer.enqueue(jobId);
      logger.info({ jobId, event: 'job_re_enqueued_from_delayed' });
    } catch (err) {
      logger.error({
        jobId,
        event: 'scheduler_reenqueue_failed',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

export async function runScheduler(): Promise<void> {
  logger.info({ event: 'scheduler_started' });

  const poll = async () => {
    try {
      await pollDelayedQueue();
    } catch (err) {
      logger.error({
        event: 'scheduler_poll_error',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  await poll();
  setInterval(poll, POLL_INTERVAL_MS);
}

if (require.main === module) {
  runScheduler().catch((err) => {
    logger.error({ event: 'scheduler_fatal', error: err.message, stack: err.stack });
    process.exit(1);
  });
}
