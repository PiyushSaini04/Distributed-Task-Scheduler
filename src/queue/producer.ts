import { getRedis } from './redis';
import { QUEUE_KEYS } from '../types';

export async function enqueue(jobId: string): Promise<void> {
  await getRedis().lpush(QUEUE_KEYS.pending, jobId);
}

export async function enqueueToDeadLetter(jobId: string): Promise<void> {
  await getRedis().lpush(QUEUE_KEYS.deadLetter, jobId);
}

export async function addToDelayed(jobId: string, scoreMs: number): Promise<void> {
  await getRedis().zadd(QUEUE_KEYS.delayed, scoreMs, jobId);
}

export async function removeFromProcessing(jobId: string): Promise<void> {
  await getRedis().zrem(QUEUE_KEYS.processing, jobId);
}

export async function getPendingDepth(): Promise<number> {
  return getRedis().llen(QUEUE_KEYS.pending);
}

export async function getDlqDepth(): Promise<number> {
  return getRedis().llen(QUEUE_KEYS.deadLetter);
}

export async function getProcessingCount(): Promise<number> {
  return getRedis().zcard(QUEUE_KEYS.processing);
}
