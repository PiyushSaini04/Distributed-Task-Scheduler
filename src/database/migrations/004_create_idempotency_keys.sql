CREATE TABLE idempotency_keys (
  key         VARCHAR(255) PRIMARY KEY,
  job_id      UUID NOT NULL REFERENCES jobs(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
);
