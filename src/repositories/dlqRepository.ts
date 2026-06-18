import { query } from '../database/connection';

interface DlqRow {
  id: string;
  job_id: string;
  original_payload: Record<string, unknown>;
  failure_reason: string;
  retry_history: unknown[];
  total_attempts: number;
  moved_at: Date;
  replayed_at: Date | null;
  replay_job_id: string | null;
}

export interface DeadLetterJob {
  id: string;
  jobId: string;
  originalPayload: Record<string, unknown>;
  failureReason: string;
  retryHistory: unknown[];
  totalAttempts: number;
  movedAt: Date;
  replayedAt: Date | null;
  replayJobId: string | null;
}

function mapRow(row: DlqRow): DeadLetterJob {
  return {
    id: row.id,
    jobId: row.job_id,
    originalPayload: row.original_payload,
    failureReason: row.failure_reason,
    retryHistory: row.retry_history,
    totalAttempts: row.total_attempts,
    movedAt: row.moved_at,
    replayedAt: row.replayed_at,
    replayJobId: row.replay_job_id,
  };
}

export async function create(
  jobId: string,
  originalPayload: Record<string, unknown>,
  failureReason: string,
  retryHistory: unknown[],
  totalAttempts: number,
): Promise<DeadLetterJob> {
  const result = await query<DlqRow>(
    `INSERT INTO dead_letter_jobs (job_id, original_payload, failure_reason, retry_history, total_attempts)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [jobId, JSON.stringify(originalPayload), failureReason, JSON.stringify(retryHistory), totalAttempts],
  );
  return mapRow(result.rows[0]);
}

export async function findByJobId(jobId: string): Promise<DeadLetterJob | null> {
  const result = await query<DlqRow>(
    'SELECT * FROM dead_letter_jobs WHERE job_id = $1 ORDER BY moved_at DESC LIMIT 1',
    [jobId],
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function markReplayed(
  dlqId: string,
  replayJobId: string,
): Promise<void> {
  await query(
    'UPDATE dead_letter_jobs SET replayed_at = NOW(), replay_job_id = $2 WHERE id = $1',
    [dlqId, replayJobId],
  );
}
