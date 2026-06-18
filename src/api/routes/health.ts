import { Router, Request, Response } from 'express';
import { checkConnection } from '../../database/connection';
import { checkRedisConnection } from '../../queue/redis';
import * as workerRepository from '../../repositories/workerRepository';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const postgresOk = await checkConnection();
  const redisOk = await checkRedisConnection();
  const workerCount = await workerRepository.countActive();

  const allOk = postgresOk && redisOk;

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    checks: {
      postgres: postgresOk ? 'ok' : 'error',
      redis: redisOk ? 'ok' : 'error',
      workerCount,
    },
  });
});

export default router;
