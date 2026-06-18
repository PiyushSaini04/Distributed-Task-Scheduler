import { getRedis } from './redis';
import { QUEUE_KEYS } from '../types';

const BRPOP_TIMEOUT = 30;

export async function brpop(): Promise<string | null> {
  const result = await getRedis().brpop(QUEUE_KEYS.pending, BRPOP_TIMEOUT);
  if (!result) return null;
  return result[1];
}

export async function moveToProcessing(jobId: string): Promise<void> {
  await getRedis().zadd(QUEUE_KEYS.processing, Date.now(), jobId);
}

export async function claimJob(): Promise<string | null> {
  const jobId = await brpop();
  if (!jobId) return null;
  await moveToProcessing(jobId);
  return jobId;
}
