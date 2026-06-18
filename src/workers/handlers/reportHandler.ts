import { logger } from '../../logger/logger';
import { sleep } from '../../utils/sleep';

export async function reportHandler(payload: unknown): Promise<void> {
  await sleep(300);
  if (Math.random() < 0.1) {
    throw new Error('Report generation failed');
  }
  logger.info({ event: 'report_generated', payload, jobType: 'report' });
}
