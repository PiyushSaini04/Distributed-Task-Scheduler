import { query } from '../database/connection';

export async function register(workerId: string): Promise<void> {
  await query(
    `INSERT INTO workers (id, status, last_seen, started_at)
     VALUES ($1, 'ACTIVE', NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE', last_seen = NOW()`,
    [workerId],
  );
}

export async function heartbeat(workerId: string): Promise<void> {
  await query('UPDATE workers SET last_seen = NOW() WHERE id = $1', [workerId]);
}

export async function incrementJobsProcessed(workerId: string): Promise<void> {
  await query(
    'UPDATE workers SET jobs_processed = jobs_processed + 1, last_seen = NOW() WHERE id = $1',
    [workerId],
  );
}

export async function deregister(workerId: string): Promise<void> {
  await query(
    "UPDATE workers SET status = 'INACTIVE', last_seen = NOW() WHERE id = $1",
    [workerId],
  );
}

export async function countActive(): Promise<number> {
  const result = await query<{ count: string }>(
    "SELECT COUNT(*) as count FROM workers WHERE status = 'ACTIVE' AND last_seen >= NOW() - INTERVAL '2 minutes'",
  );
  return parseInt(result.rows[0]?.count ?? '0', 10);
}
