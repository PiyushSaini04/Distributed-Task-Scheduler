import express from 'express';
import jobsRouter from './routes/jobs';
import statsRouter from './routes/stats';
import healthRouter from './routes/health';
import { requestLogger } from './middlewares/requestLogger';
import { errorHandler } from './middlewares/errorHandler';
import { registry, updateQueueMetrics } from '../metrics/prometheus';

export function createApp(): express.Application {
  const app = express();

  app.use((req, res, next) => {
    const origin = process.env.CORS_ORIGIN ?? '*';
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(express.json());
  app.use(requestLogger);

  app.use('/health', healthRouter);
  app.use('/api/jobs', jobsRouter);
  app.use('/api/stats', statsRouter);

  app.get('/metrics', async (_req, res) => {
    try {
      await updateQueueMetrics();
      res.set('Content-Type', registry.contentType);
      res.end(await registry.metrics());
    } catch {
      res.status(500).end();
    }
  });

  app.use(errorHandler);

  return app;
}

const app = createApp();
export default app;
