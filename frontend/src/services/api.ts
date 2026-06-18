import { isDemoMode } from '../config';
import {
  mockFetchHealth,
  mockFetchJob,
  mockFetchJobs,
  mockFetchStats,
  mockReplayJob,
} from '../mock/mockApi';
import axios from 'axios';
import type { HealthResponse, JobDetail, JobsResponse, ReplayResponse, Stats } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  timeout: 10000,
});

export async function fetchStats(): Promise<Stats> {
  if (isDemoMode) return mockFetchStats();
  const { data } = await api.get<Stats>('/api/stats');
  return data;
}

export async function fetchJobs(status?: string, limit = 100): Promise<JobsResponse> {
  if (isDemoMode) return mockFetchJobs(status, limit);
  const { data } = await api.get<JobsResponse>('/api/jobs', {
    params: { status, limit },
  });
  return data;
}

export async function fetchJob(id: string): Promise<JobDetail> {
  if (isDemoMode) return mockFetchJob(id);
  const { data } = await api.get<JobDetail>(`/api/jobs/${id}`);
  return data;
}

export async function replayJob(id: string): Promise<ReplayResponse> {
  if (isDemoMode) return mockReplayJob(id);
  const { data } = await api.post<ReplayResponse>(`/api/jobs/${id}/replay`);
  return data;
}

export async function fetchHealth(): Promise<HealthResponse> {
  if (isDemoMode) return mockFetchHealth();
  const { data } = await api.get<HealthResponse>('/health');
  return data;
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error ?? error.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}

export { isDemoMode };
