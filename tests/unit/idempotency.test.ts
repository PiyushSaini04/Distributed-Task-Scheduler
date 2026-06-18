import { v4 as uuidv4 } from 'uuid';
import { migrate } from '../../src/database/migrate';
import { closePool, getPool } from '../../src/database/connection';
import { closeRedis } from '../../src/queue/redis';
import * as jobService from '../../src/services/jobService';
import { getRedis } from '../../src/queue/redis';
import { QUEUE_KEYS } from '../../src/types';

describe('idempotency', () => {
  beforeAll(async () => {
    await migrate();
  });

  afterAll(async () => {
    await closeRedis();
    await closePool();
  });

  beforeEach(async () => {
    await getPool().query('TRUNCATE jobs, idempotency_keys CASCADE');
    await getRedis().del(QUEUE_KEYS.pending);
  });

  it('returns existing job for duplicate idempotency key', async () => {
    const key = uuidv4();
    const input = {
      type: 'email',
      payload: { to: 'test@example.com' },
      idempotencyKey: key,
    };

    const first = await jobService.createJob(input);
    expect(first.deduplicated).toBe(false);

    const second = await jobService.createJob(input);
    expect(second.deduplicated).toBe(true);
    expect(second.job.id).toBe(first.job.id);
  });

  it('creates only one job row for concurrent duplicate submissions', async () => {
    const key = uuidv4();
    const input = {
      type: 'email',
      payload: { to: 'concurrent@example.com' },
      idempotencyKey: key,
    };

    const results = await Promise.all([
      jobService.createJob(input),
      jobService.createJob(input),
      jobService.createJob(input),
    ]);

    const jobIds = new Set(results.map((r) => r.job.id));
    expect(jobIds.size).toBe(1);

    const count = await getPool().query('SELECT COUNT(*) FROM jobs');
    expect(parseInt(count.rows[0].count, 10)).toBe(1);

    const deduplicatedCount = results.filter((r) => r.deduplicated).length;
    expect(deduplicatedCount).toBeGreaterThanOrEqual(1);
  });

  it('enqueues only once for duplicate keys', async () => {
    const key = uuidv4();
    const input = {
      type: 'email',
      payload: { to: 'enqueue@example.com' },
      idempotencyKey: key,
    };

    await jobService.createJob(input);
    await jobService.createJob(input);

    const depth = await getRedis().llen(QUEUE_KEYS.pending);
    expect(depth).toBe(1);
  });
});
