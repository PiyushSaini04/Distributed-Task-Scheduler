import type { JobDetail, RecentEvent, Stats, WorkerInfo } from '../types';
import {
  createRandomJob,
  createSeedEvents,
  createSeedJobs,
  createSeedWorkers,
  FAILURE_REASONS,
  randomInt,
  randomProcessingTime,
  SEED_STATS,
  secondsAgo,
  uuid,
  WORKER_IDS,
} from './mockData';

type Listener = () => void;

class MockStore {
  private jobs = new Map<string, JobDetail>();
  private workers: WorkerInfo[] = [];
  private events: RecentEvent[] = [];
  private listeners = new Set<Listener>();
  private queueDepth: number = SEED_STATS.queueDepth;

  constructor() {
    this.reset();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  reset(): void {
    const seedJobs = createSeedJobs();
    this.jobs = new Map(seedJobs.map((j) => [j.id, j]));
    this.workers = createSeedWorkers();
    this.events = createSeedEvents(seedJobs);
    this.queueDepth = SEED_STATS.queueDepth;
    this.notify();
  }

  getJobs(): JobDetail[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  getJob(id: string): JobDetail | undefined {
    return this.jobs.get(id);
  }

  getWorkers(): WorkerInfo[] {
    return this.workers.map((w) => ({
      ...w,
      lastHeartbeat: secondsAgo(randomInt(1, 10)),
    }));
  }

  getEvents(): RecentEvent[] {
    return [...this.events].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  getStats(): Stats {
    const jobs = this.getJobs();
    const counts = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      retrying: 0,
      deadLetter: 0,
    };

    let totalProcessingTime = 0;
    let processingSamples = 0;

    for (const job of jobs) {
      switch (job.status) {
        case 'PENDING':
          counts.pending++;
          break;
        case 'PROCESSING':
          counts.processing++;
          break;
        case 'COMPLETED':
          counts.completed++;
          break;
        case 'FAILED':
          counts.failed++;
          break;
        case 'RETRYING':
          counts.retrying++;
          break;
        case 'DEAD_LETTER':
          counts.deadLetter++;
          break;
      }
      if (job.processingTimeMs) {
        totalProcessingTime += job.processingTimeMs;
        processingSamples++;
      }
    }

    const activeWorkers = this.workers.filter((w) => w.status === 'ACTIVE').length;

    return {
      totalJobs: jobs.length,
      pending: counts.pending,
      processing: counts.processing,
      completed: counts.completed,
      failed: counts.failed,
      retrying: counts.retrying,
      deadLetter: counts.deadLetter,
      queueDepth: this.queueDepth,
      activeWorkers,
      throughputPerMinute: SEED_STATS.throughputPerMinute + randomInt(-5, 8),
      avgProcessingTimeMs:
        processingSamples > 0
          ? Math.round(totalProcessingTime / processingSamples)
          : SEED_STATS.avgProcessingTimeMs,
    };
  }

  private addEvent(event: Omit<RecentEvent, 'id' | 'timestamp'>): void {
    this.events.unshift({
      ...event,
      id: uuid(),
      timestamp: new Date().toISOString(),
    });
    this.events = this.events.slice(0, 30);
  }

  /** Subtle background activity on each poll */
  tick(): void {
    this.workers = this.workers.map((w) => ({
      ...w,
      lastHeartbeat: w.status === 'ACTIVE' ? secondsAgo(randomInt(1, 6)) : w.lastHeartbeat,
    }));

    if (Math.random() < 0.25) {
      const pending = this.getJobs().filter((j) => j.status === 'PENDING');
      const processing = this.getJobs().filter((j) => j.status === 'PROCESSING');

      if (pending.length > 0 && processing.length < 20) {
        const job = pending[randomInt(0, pending.length - 1)];
        const worker = WORKER_IDS[randomInt(0, WORKER_IDS.length - 1)];
        this.updateJob(job.id, {
          status: 'PROCESSING',
          workerId: worker,
          updatedAt: new Date().toISOString(),
          processingTimeMs: randomProcessingTime(),
          attemptCount: 1,
        });
        this.queueDepth = Math.max(0, this.queueDepth - 1);
        this.addEvent({
          type: 'worker_picked_job',
          message: `${worker} picked ${job.type} job`,
          jobId: job.id,
          workerId: worker,
        });
      } else if (processing.length > 0 && Math.random() < 0.5) {
        const job = processing[randomInt(0, processing.length - 1)];
        const worker = this.workers.find((w) => w.id === job.workerId);
        if (worker) worker.jobsProcessed += 1;
        this.updateJob(job.id, {
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          processingTimeMs: randomProcessingTime(),
        });
        this.addEvent({
          type: 'job_completed',
          message: `${job.type} job completed on ${job.workerId}`,
          jobId: job.id,
          workerId: job.workerId ?? undefined,
        });
      }
    }

    this.notify();
  }

  private updateJob(id: string, patch: Partial<JobDetail>): void {
    const job = this.jobs.get(id);
    if (!job) return;
    this.jobs.set(id, { ...job, ...patch });
  }

  generateRandomJobs(count = randomInt(5, 10)): void {
    for (let i = 0; i < count; i++) {
      const job = createRandomJob();
      this.jobs.set(job.id, job);
      if (job.status === 'PENDING') this.queueDepth += 1;
      if (job.status === 'PROCESSING' && job.workerId) {
        this.addEvent({
          type: 'worker_picked_job',
          message: `${job.workerId} picked ${job.type} job`,
          jobId: job.id,
          workerId: job.workerId,
        });
      }
    }
    this.notify();
  }

  simulateFailure(): void {
    const processing = this.getJobs().filter((j) => j.status === 'PROCESSING');
    if (processing.length === 0) {
      const pending = this.getJobs().find((j) => j.status === 'PENDING');
      if (pending) {
        this.updateJob(pending.id, {
          status: 'PROCESSING',
          workerId: WORKER_IDS[0],
          processingTimeMs: randomProcessingTime(),
          attemptCount: 1,
        });
        processing.push(this.jobs.get(pending.id)!);
      } else return;
    }

    const job = processing[randomInt(0, processing.length - 1)];
    const reason = FAILURE_REASONS[randomInt(0, FAILURE_REASONS.length - 1)];
    const newRetryCount = job.retryCount + 1;

    if (newRetryCount >= job.maxRetries) {
      this.updateJob(job.id, {
        status: 'DEAD_LETTER',
        retryCount: newRetryCount,
        errorMessage: reason,
        updatedAt: new Date().toISOString(),
        attemptCount: (job.attemptCount ?? 0) + 1,
      });
      this.addEvent({
        type: 'job_moved_to_dlq',
        message: `${job.type} job moved to DLQ — ${reason}`,
        jobId: job.id,
      });
    } else {
      this.updateJob(job.id, {
        status: 'FAILED',
        retryCount: newRetryCount,
        errorMessage: reason,
        updatedAt: new Date().toISOString(),
        nextRetryAt: new Date(Date.now() + 30000).toISOString(),
        attemptCount: (job.attemptCount ?? 0) + 1,
      });
      this.addEvent({
        type: 'job_failed',
        message: `${job.type} job failed — ${reason}`,
        jobId: job.id,
        workerId: job.workerId ?? undefined,
      });
      this.addEvent({
        type: 'retry_scheduled',
        message: `Retry scheduled for ${job.type} job (attempt ${newRetryCount})`,
        jobId: job.id,
      });
    }

    this.notify();
  }

  simulateWorkerCrash(): void {
    const activeWorkers = this.workers.filter((w) => w.status === 'ACTIVE');
    if (activeWorkers.length === 0) return;

    const worker = activeWorkers[randomInt(0, activeWorkers.length - 1)];
    worker.status = 'RECOVERING';

    const workerJob = this.getJobs().find(
      (j) => j.status === 'PROCESSING' && j.workerId === worker.id,
    );

    if (workerJob) {
      this.updateJob(workerJob.id, {
        status: 'FAILED',
        errorMessage: 'Worker crash',
        retryCount: workerJob.retryCount + 1,
        updatedAt: new Date().toISOString(),
        nextRetryAt: new Date(Date.now() + 60000).toISOString(),
      });
      this.queueDepth += 1;
      this.addEvent({
        type: 'worker_crash',
        message: `${worker.id} crashed mid-processing`,
        workerId: worker.id,
        jobId: workerJob.id,
      });
      this.addEvent({
        type: 'retry_scheduled',
        message: `Retry scheduled after ${worker.id} crash`,
        jobId: workerJob.id,
        workerId: worker.id,
      });
    } else {
      this.addEvent({
        type: 'worker_crash',
        message: `${worker.id} crashed (no in-flight job)`,
        workerId: worker.id,
      });
    }

    setTimeout(() => {
      worker.status = 'ACTIVE';
      worker.lastHeartbeat = new Date().toISOString();
      this.addEvent({
        type: 'worker_recovered',
        message: `${worker.id} recovered and re-registered`,
        workerId: worker.id,
      });
      this.notify();
    }, 2000);

    this.notify();
  }

  clearDemoData(): void {
    this.reset();
  }

  replayJob(id: string): { newJobId: string; originalJobId: string } | null {
    const original = this.jobs.get(id);
    if (!original || original.status !== 'DEAD_LETTER') return null;

    const newJob = createRandomJob();
    newJob.status = 'PENDING';
    newJob.type = original.type;
    newJob.payload = { ...original.payload };
    newJob.retryCount = 0;
    newJob.errorMessage = null;
    newJob.workerId = null;
    newJob.attemptCount = 0;
    newJob.attempts = [];

    this.jobs.set(newJob.id, newJob);
    this.queueDepth += 1;

    this.addEvent({
      type: 'worker_picked_job',
      message: `Replay enqueued for ${original.type} job`,
      jobId: newJob.id,
      workerId: WORKER_IDS[0],
    });

    this.notify();
    return { newJobId: newJob.id, originalJobId: id };
  }
}

export const mockStore = new MockStore();
