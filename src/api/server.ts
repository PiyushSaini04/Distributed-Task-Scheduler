import { createApp } from './app';
import { registry, updateQueueMetrics } from '../metrics/prometheus';
import { migrate } from '../database/migrate';
import { logger } from '../logger/logger';
import express from 'express';

const API_PORT = parseInt(process.env.API_PORT ?? '3000', 10);
const METRICS_PORT = parseInt(process.env.METRICS_PORT ?? '9090', 10);

async function start(): Promise<void> {
  await migrate();

  const app = createApp();

  app.listen(API_PORT, () => {
    logger.info({ event: 'api_started', port: API_PORT });
  });

  const metricsApp = express();
  metricsApp.get('/metrics', async (_req, res) => {
    try {
      await updateQueueMetrics();
      res.set('Content-Type', registry.contentType);
      res.end(await registry.metrics());
    } catch {
      res.status(500).end();
    }
  });

  metricsApp.listen(METRICS_PORT, () => {
    logger.info({ event: 'metrics_started', port: METRICS_PORT });
  });

  setInterval(updateQueueMetrics, 10000);
}

if (require.main === module) {
  start().catch((err) => {
    logger.error({ event: 'api_fatal', error: err.message, stack: err.stack });
    process.exit(1);
  });
}

export { start };
