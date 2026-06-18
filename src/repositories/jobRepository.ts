import { query } from '../database/connection';
import { Job, JobStatus } from '../types';
import { assertValidTransition } from '../state/stateMachine';

interface JobRow {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  idempotency_key: string | null;
  retry_count: number;
  max_retries: number;
  created_at: Date;
  updated_at: Date;
  next_retry_at: Date | null;
  completed_at: Date | null;
  error_message: string | null;
}

function mapRow(row: JobRow): Job {
  return {
    id: row.id,
    type: row.type,
    payload: row.payload,
    status: row.status,
    idempotencyKey: row.idempotency_key,
    retryCount: row.retry_count,
    maxRetries: row.max_retries,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    nextRetryAt: row.next_retry_at,
    completedAt: row.completed_at,
    errorMessage: row.error_message,
  };
}

export async function create(
  type: string,
  payload: Record<string, unknown>,
  idempotencyKey: string,
  maxRetries?: number,
): Promise<{ job: Job | null; inserted: boolean }> {
  const retries = maxRetries ?? parseInt(process.env.MAX_RETRIES ?? '5', 10);

  const result = await query<JobRow>(
    `INSERT INTO jobs (type, payload, idempotency_key, max_retries)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (idempotency_key) DO NOTHING
     RETURNING *`,
    [type, JSON.stringify(payload), idempotencyKey, retries],
  );

  if (!result.rowCount || result.rowCount === 0) {
    return { job: null, inserted: false };
  }

  const job = mapRow(result.rows[0]);

  await query(
    `INSERT INTO idempotency_keys (key, job_id)
     VALUES ($1, $2)
     ON CONFLICT (key) DO NOTHING`,
    [idempotencyKey, job.id],
  );

  return { job, inserted: true };
}

export async function findById(id: string): Promise<Job | null> {
  const result = await query<JobRow>('SELECT * FROM jobs WHERE id = $1', [id]);
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function findByIdempotencyKey(key: string): Promise<Job | null> {
  const result = await query<JobRow>('SELECT * FROM jobs WHERE idempotency_key = $1', [key]);
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function findMany(
  status?: JobStatus,
  limit = 50,
  offset = 0,
): Promise<Job[]> {
  if (status) {
    const result = await query<JobRow>(
      'SELECT * FROM jobs WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [status, limit, offset],
    );
    return result.rows.map(mapRow);
  }

  const result = await query<JobRow>(
    'SELECT * FROM jobs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset],
  );
  return result.rows.map(mapRow);
}

export async function transitionStatus(
  id: string,
  from: JobStatus,
  to: JobStatus,
  extras: {
    retryCount?: number;
    nextRetryAt?: Date | null;
    completedAt?: Date | null;
    errorMessage?: string | null;
  } = {},
): Promise<Job> {
  assertValidTransition(from, to);

  const sets = ['status = $3', 'updated_at = NOW()'];
  const params: unknown[] = [id, from, to];
  let paramIdx = 4;

  if (extras.retryCount !== undefined) {
    sets.push(`retry_count = $${paramIdx++}`);
    params.push(extras.retryCount);
  }
  if (extras.nextRetryAt !== undefined) {
    sets.push(`next_retry_at = $${paramIdx++}`);
    params.push(extras.nextRetryAt);
  }
  if (extras.completedAt !== undefined) {
    sets.push(`completed_at = $${paramIdx++}`);
    params.push(extras.completedAt);
  }
  if (extras.errorMessage !== undefined) {
    sets.push(`error_message = $${paramIdx++}`);
    params.push(extras.errorMessage);
  }

  const result = await query<JobRow>(
    `UPDATE jobs SET ${sets.join(', ')} WHERE id = $1 AND status = $2 RETURNING *`,
    params,
  );

  if (!result.rows[0]) {
    const current = await findById(id);
    if (!current) throw new Error(`Job not found: ${id}`);
    throw new Error(
      `Cannot transition job ${id} from ${from} to ${to}, current status: ${current.status}`,
    );
  }

  return mapRow(result.rows[0]);
}

export async function getStatsCounts(): Promise<Record<string, number>> {
  const result = await query<{ status: JobStatus; count: string }>(
    'SELECT status, COUNT(*) as count FROM jobs GROUP BY status',
  );

  const counts: Record<string, number> = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    retrying: 0,
    deadLetter: 0,
  };

  for (const row of result.rows) {
    const key = row.status.toLowerCase().replace('_', '');
    if (row.status === 'DEAD_LETTER') {
      counts.deadLetter = parseInt(row.count, 10);
    } else {
      counts[key] = parseInt(row.count, 10);
    }
  }

  return counts;
}

export async function getThroughputAndAvgTime(): Promise<{
  throughputPerMinute: number;
  avgProcessingTimeMs: number;
}> {
  const throughputResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM jobs
     WHERE status = 'COMPLETED' AND completed_at >= NOW() - INTERVAL '1 minute'`,
  );

  const avgResult = await query<{ avg_ms: string | null }>(
    `SELECT AVG(duration_ms) as avg_ms FROM job_attempts
     WHERE status = 'COMPLETED' AND completed_at >= NOW() - INTERVAL '5 minutes'`,
  );

  return {
    throughputPerMinute: parseInt(throughputResult.rows[0]?.count ?? '0', 10),
    avgProcessingTimeMs: Math.round(parseFloat(avgResult.rows[0]?.avg_ms ?? '0') || 0),
  };
}
