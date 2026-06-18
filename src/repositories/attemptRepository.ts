import { query } from '../database/connection';
import { JobAttempt } from '../types';

interface AttemptRow {
  id: string;
  job_id: string;
  attempt_number: number;
  worker_id: string;
  started_at: Date;
  completed_at: Date | null;
  status: string;
  error_message: string | null;
  duration_ms: number | null;
}

function mapRow(row: AttemptRow): JobAttempt {
  return {
    id: row.id,
    jobId: row.job_id,
    attemptNumber: row.attempt_number,
    workerId: row.worker_id,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    status: row.status,
    errorMessage: row.error_message,
    durationMs: row.duration_ms,
  };
}

export async function createAttempt(
  jobId: string,
  attemptNumber: number,
  workerId: string,
): Promise<JobAttempt> {
  const result = await query<AttemptRow>(
    `INSERT INTO job_attempts (job_id, attempt_number, worker_id, status)
     VALUES ($1, $2, $3, 'PROCESSING')
     RETURNING *`,
    [jobId, attemptNumber, workerId],
  );
  return mapRow(result.rows[0]);
}

export async function completeAttempt(
  attemptId: string,
  status: string,
  durationMs: number,
  errorMessage?: string,
): Promise<void> {
  await query(
    `UPDATE job_attempts
     SET status = $2, completed_at = NOW(), duration_ms = $3, error_message = $4
     WHERE id = $1`,
    [attemptId, status, durationMs, errorMessage ?? null],
  );
}

export async function findByJobId(jobId: string): Promise<JobAttempt[]> {
  const result = await query<AttemptRow>(
    'SELECT * FROM job_attempts WHERE job_id = $1 ORDER BY attempt_number ASC',
    [jobId],
  );
  return result.rows.map(mapRow);
}

export async function getRetryHistory(jobId: string): Promise<
  Array<{
    attemptNumber: number;
    workerId: string;
    status: string;
    errorMessage: string | null;
    durationMs: number | null;
    startedAt: Date;
  }>
> {
  const attempts = await findByJobId(jobId);
  return attempts.map((a) => ({
    attemptNumber: a.attemptNumber,
    workerId: a.workerId,
    status: a.status,
    errorMessage: a.errorMessage,
    durationMs: a.durationMs,
    startedAt: a.startedAt,
  }));
}

export async function countCompletedAttempts(jobId: string): Promise<number> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM job_attempts WHERE job_id = $1 AND status = 'COMPLETED'`,
    [jobId],
  );
  return parseInt(result.rows[0]?.count ?? '0', 10);
}

export async function countByJobIds(jobIds: string[]): Promise<Map<string, number>> {
  if (jobIds.length === 0) return new Map();

  const result = await query<{ job_id: string; count: string }>(
    `SELECT job_id, COUNT(*)::text as count
     FROM job_attempts
     WHERE job_id = ANY($1)
     GROUP BY job_id`,
    [jobIds],
  );

  const map = new Map<string, number>();
  for (const row of result.rows) {
    map.set(row.job_id, parseInt(row.count, 10));
  }
  return map;
}
