CREATE TABLE dead_letter_jobs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id         UUID NOT NULL REFERENCES jobs(id),
  original_payload JSONB NOT NULL,
  failure_reason TEXT NOT NULL,
  retry_history  JSONB NOT NULL DEFAULT '[]',
  total_attempts INTEGER NOT NULL,
  moved_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  replayed_at    TIMESTAMPTZ,
  replay_job_id  UUID
);
