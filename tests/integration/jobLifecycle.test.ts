import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { createApp } from '../../src/api/app';
import { migrate } from '../../src/database/migrate';
import { closePool } from '../../src/database/connection';
import { closeRedis } from '../../src/queue/redis';
import { registerHandler } from '../../src/workers/handlers';
import { clearAll, processJobFromQueue, waitForJobStatus } from './helpers';

const app = createApp();

describe('job lifecycle integration', () => {
  beforeAll(async () => {
    process.env.MAX_RETRIES = '5';
    await migrate();

    registerHandler('testSuccess', async () => {
      /* always succeeds */
    });
  });

  afterAll(async () => {
    await closeRedis();
    await closePool();
  });

  beforeEach(async () => {
    await clearAll();
  });

  it('creates a job via POST /api/jobs', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .send({
        type: 'testSuccess',
        payload: { reportId: '123' },
        idempotencyKey: uuidv4(),
      });

    expect(res.status).toBe(201);
    expect(res.body.jobId).toBeDefined();
    expect(res.body.status).toBe('PENDING');
  });

  it('returns job details via GET /api/jobs/:id', async () => {
    const createRes = await request(app)
      .post('/api/jobs')
      .send({
        type: 'testSuccess',
        payload: { to: 'user@example.com' },
        idempotencyKey: uuidv4(),
      });

    const getRes = await request(app).get(`/api/jobs/${createRes.body.jobId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.id).toBe(createRes.body.jobId);
    expect(getRes.body.type).toBe('testSuccess');
    expect(getRes.body.attempts).toEqual([]);
  });

  it('processes a job to COMPLETED', async () => {
    const createRes = await request(app)
      .post('/api/jobs')
      .send({
        type: 'testSuccess',
        payload: { data: 'test' },
        idempotencyKey: uuidv4(),
      });

    const jobId = createRes.body.jobId;
    await processJobFromQueue();
    await waitForJobStatus(jobId, 'COMPLETED');

    const getRes = await request(app).get(`/api/jobs/${jobId}`);
    expect(getRes.body.status).toBe('COMPLETED');
    expect(getRes.body.attempts.length).toBe(1);
    expect(getRes.body.attempts[0].status).toBe('COMPLETED');
  });
});
