import { logger } from '../../logger/logger';
import { sleep } from '../../utils/sleep';

export async function emailHandler(payload: unknown): Promise<void> {
  await sleep(Math.random() * 200 + 100);
  if (Math.random() < 0.2) {
    throw new Error('SMTP connection refused');
  }
  logger.info({ event: 'email_sent', payload, jobType: 'email' });
}
