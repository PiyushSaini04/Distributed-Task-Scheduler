CREATE TABLE job_attempts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  worker_id     VARCHAR(100) NOT NULL,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  status        VARCHAR(50) NOT NULL,
  error_message TEXT,
  duration_ms   INTEGER
);

CREATE INDEX idx_attempts_job_id ON job_attempts(job_id);
