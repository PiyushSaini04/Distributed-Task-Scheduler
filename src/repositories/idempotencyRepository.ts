import { query } from '../database/connection';

export async function findJobIdByKey(key: string): Promise<string | null> {
  const result = await query<{ job_id: string }>(
    'SELECT job_id FROM idempotency_keys WHERE key = $1',
    [key],
  );
  return result.rows[0]?.job_id ?? null;
}

export async function create(key: string, jobId: string): Promise<void> {
  await query(
    `INSERT INTO idempotency_keys (key, job_id)
     VALUES ($1, $2)
     ON CONFLICT (key) DO NOTHING`,
    [key, jobId],
  );
}
