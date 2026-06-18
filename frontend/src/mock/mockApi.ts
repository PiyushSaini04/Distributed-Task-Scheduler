import { demoConfig } from '../config';
import type { HealthResponse, JobDetail, JobsResponse, ReplayResponse, Stats } from '../types';
import { mockStore } from './mockStore';

function simulateDelay(): Promise<void> {
  const ms =
    demoConfig.minDelayMs + Math.random() * (demoConfig.maxDelayMs - demoConfig.minDelayMs);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function mockFetchStats(): Promise<Stats> {
  await simulateDelay();
  mockStore.tick();
  return mockStore.getStats();
}

export async function mockFetchJobs(status?: string, limit = 100): Promise<JobsResponse> {
  await simulateDelay();
  let jobs = mockStore.getJobs();

  if (status) {
    jobs = jobs.filter((j) => j.status === status);
  }

  return {
    jobs: jobs.slice(0, limit).map(toJobSummary),
    limit,
    offset: 0,
  };
}

export async function mockFetchJob(id: string): Promise<JobDetail> {
  await simulateDelay();
  const job = mockStore.getJob(id);
  if (!job) throw new Error('Job not found');
  return job;
}

export async function mockReplayJob(id: string): Promise<ReplayResponse> {
  await simulateDelay();
  const result = mockStore.replayJob(id);
  if (!result) throw new Error('Job is not in DEAD_LETTER state');
  return result;
}

export async function mockFetchHealth(): Promise<HealthResponse> {
  await simulateDelay();
  const stats = mockStore.getStats();
  const workers = mockStore.getWorkers();
  const hasRecovering = workers.some((w) => w.status === 'RECOVERING');

  return {
    status: hasRecovering ? 'degraded' : 'ok',
    checks: {
      postgres: 'ok',
      redis: 'ok',
      workerCount: stats.activeWorkers ?? workers.filter((w) => w.status === 'ACTIVE').length,
    },
  };
}

export function mockFetchWorkers() {
  return mockStore.getWorkers();
}

export function mockFetchEvents() {
  return mockStore.getEvents();
}

function toJobSummary(job: JobDetail) {
  const { attempts: _attempts, ...summary } = job;
  return summary;
}

export {
  mockStore,
  mockStore as demoActions,
};
