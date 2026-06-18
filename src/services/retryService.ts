export function computeNextRetryDelay(attempt: number): number {
  const BASE_DELAY_MS = parseInt(process.env.BASE_DELAY_MS ?? '1000', 10);
  const MAX_DELAY_MS = parseInt(process.env.MAX_DELAY_MS ?? '300000', 10);

  const exponential = BASE_DELAY_MS * Math.pow(2, attempt);
  const capped = Math.min(exponential, MAX_DELAY_MS);

  const jitter = capped * 0.2 * (Math.random() * 2 - 1);

  return Math.round(capped + jitter);
}

export function getMaxRetries(): number {
  return parseInt(process.env.MAX_RETRIES ?? '5', 10);
}
