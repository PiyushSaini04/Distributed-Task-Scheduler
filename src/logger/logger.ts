import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'task-scheduler' },
  transports: [new winston.transports.Console()],
});

export function logJobEvent(
  event: string,
  fields: Record<string, unknown> = {},
): void {
  logger.info({ event, ...fields });
}

export function logJobError(
  event: string,
  error: Error,
  fields: Record<string, unknown> = {},
): void {
  logger.error({
    event,
    error: error.message,
    stack: error.stack,
    ...fields,
  });
}
