import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { createApp } from '../../src/api/app';
import { migrate } from '../../src/database/migrate';
import { closePool } from '../../src/database/connection';
import { closeRedis } from '../../src/queue/redis';
import { registerHandler } from '../../src/workers/handlers';
import { clearAll, processJobFromQueue, processUntilDeadLetter, waitForJobStatus } from './helpers';

const app = createApp();

describe('replay integration', () => {
  beforeAll(async () => {
    process.env.MAX_RETRIES = '1';
    process.env.BASE_DELAY_MS = '10';
    process.env.MAX_DELAY_MS = '50';
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

  it('replays a DEAD_LETTER job to completion', async () => {
    const createRes = await request(app)
      .post('/api/jobs')
      .send({
        type: 'simulateFailure',
        payload: { test: true },
        idempotencyKey: uuidv4(),
      });

    const originalJobId = createRes.body.jobId;
    await processUntilDeadLetter(originalJobId);

    const replayRes = await request(app).post(`/api/jobs/${originalJobId}/replay`);
    expect(replayRes.status).toBe(201);
    expect(replayRes.body.newJobId).toBeDefined();
    expect(replayRes.body.originalJobId).toBe(originalJobId);

    const newJobId = replayRes.body.newJobId;

    registerHandler('simulateFailure', async () => {
      /* succeed on replay by overriding */
    });

    await processJobFromQueue();
    await waitForJobStatus(newJobId, 'COMPLETED', 10000);

    const getRes = await request(app).get(`/api/jobs/${newJobId}`);
    expect(getRes.body.status).toBe('COMPLETED');
  });

  it('returns 400 when replaying non-DLQ job', async () => {
    const createRes = await request(app)
      .post('/api/jobs')
      .send({
        type: 'testSuccess',
        payload: {},
        idempotencyKey: uuidv4(),
      });

    const replayRes = await request(app).post(`/api/jobs/${createRes.body.jobId}/replay`);
    expect(replayRes.status).toBe(400);
  });
});
