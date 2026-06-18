CREATE TYPE job_status AS ENUM (
  'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING', 'DEAD_LETTER'
);

CREATE TABLE jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            VARCHAR(100) NOT NULL,
  payload         JSONB NOT NULL,
  status          job_status NOT NULL DEFAULT 'PENDING',
  idempotency_key VARCHAR(255) UNIQUE,
  retry_count     INTEGER NOT NULL DEFAULT 0,
  max_retries     INTEGER NOT NULL DEFAULT 5,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_retry_at   TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  error_message   TEXT
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
