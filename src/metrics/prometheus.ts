import { Counter, Gauge, Histogram, Registry } from 'prom-client';

export const registry = new Registry();

export const metrics = {
  jobsProcessedTotal: new Counter({
    name: 'jobs_processed_total',
    help: 'Total jobs completed successfully',
    registers: [registry],
  }),
  jobsFailedTotal: new Counter({
    name: 'jobs_failed_total',
    help: 'Total jobs that reached FAILED state',
    registers: [registry],
  }),
  jobsRetriedTotal: new Counter({
    name: 'jobs_retried_total',
    help: 'Total retry attempts',
    registers: [registry],
  }),
  reapedJobsTotal: new Counter({
    name: 'reaped_jobs_total',
    help: 'Total stuck jobs recovered by reaper',
    registers: [registry],
  }),
  queueDepth: new Gauge({
    name: 'queue_depth',
    help: 'Current pending queue depth',
    registers: [registry],
  }),
  dlqDepth: new Gauge({
    name: 'dlq_depth',
    help: 'Current dead letter queue depth',
    registers: [registry],
  }),
  activeWorkers: new Gauge({
    name: 'active_workers',
    help: 'Number of active workers',
    registers: [registry],
  }),
  processingTimeMs: new Histogram({
    name: 'job_processing_duration_ms',
    help: 'Job processing time in milliseconds',
    buckets: [50, 100, 250, 500, 1000, 2500, 5000],
    registers: [registry],
  }),
};

export async function updateQueueMetrics(): Promise<void> {
  const { getPendingDepth, getDlqDepth } = await import('../queue/producer');
  const workerRepository = await import('../repositories/workerRepository');

  metrics.queueDepth.set(await getPendingDepth());
  metrics.dlqDepth.set(await getDlqDepth());
  metrics.activeWorkers.set(await workerRepository.countActive());
}
