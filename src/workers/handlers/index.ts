import { emailHandler } from './emailHandler';
import { reportHandler } from './reportHandler';
import { simulateFailureHandler } from './simulateFailure';

type JobHandler = (payload: unknown) => Promise<void>;

const handlers: Record<string, JobHandler> = {
  email: emailHandler,
  report: reportHandler,
  simulateFailure: simulateFailureHandler,
};

export function getHandler(type: string): JobHandler {
  const handler = handlers[type];
  if (!handler) {
    throw new Error(`Unknown job type: ${type}`);
  }
  return handler;
}

export function registerHandler(type: string, handler: JobHandler): void {
  handlers[type] = handler;
}
