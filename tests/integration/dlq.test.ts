import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { createApp } from '../../src/api/app';
import { migrate } from '../../src/database/migrate';
import { closePool, getPool } from '../../src/database/connection';
import { closeRedis } from '../../src/queue/redis';
import * as jobRepository from '../../src/repositories/jobRepository';
import { clearAll, processUntilDeadLetter } from './helpers';

const app = createApp();

describe('DLQ integration', () => {
  beforeAll(async () => {
    process.env.MAX_RETRIES = '5';
    process.env.BASE_DELAY_MS = '10';
    process.env.MAX_DELAY_MS = '100';
    await migrate();
  });

  afterAll(async () => {
    await closeRedis();
    await closePool();
  });

  beforeEach(async () => {
    await clearAll();
  });

  it('moves simulateFailure job to DEAD_LETTER after max retries', async () => {
    const createRes = await request(app)
      .post('/api/jobs')
      .send({
        type: 'simulateFailure',
        payload: {},
        idempotencyKey: uuidv4(),
      });

    const jobId = createRes.body.jobId;
    await processUntilDeadLetter(jobId);

    const job = await jobRepository.findById(jobId);
    expect(job?.status).toBe('DEAD_LETTER');

    const dlqResult = await getPool().query(
      'SELECT * FROM dead_letter_jobs WHERE job_id = $1',
      [jobId],
    );
    expect(dlqResult.rows.length).toBe(1);
    expect(dlqResult.rows[0].failure_reason).toContain('Deliberate failure');
    expect(dlqResult.rows[0].total_attempts).toBeGreaterThan(0);

    const attempts = await getPool().query(
      'SELECT * FROM job_attempts WHERE job_id = $1 ORDER BY attempt_number',
      [jobId],
    );
    expect(attempts.rows.length).toBeGreaterThanOrEqual(5);
  });
});
