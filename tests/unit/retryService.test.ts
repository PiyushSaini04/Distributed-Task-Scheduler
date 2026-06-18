import { computeNextRetryDelay } from '../../src/services/retryService';

describe('computeNextRetryDelay', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, BASE_DELAY_MS: '1000', MAX_DELAY_MS: '300000' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('caps at MAX_DELAY_MS plus jitter', () => {
    const delay = computeNextRetryDelay(20);
    expect(delay).toBeLessThanOrEqual(300000 * 1.2);
    expect(delay).toBeGreaterThan(0);
  });

  it('delay grows with attempt number on average', () => {
    const delays1: number[] = [];
    const delays5: number[] = [];
    for (let i = 0; i < 50; i++) {
      delays1.push(computeNextRetryDelay(1));
      delays5.push(computeNextRetryDelay(5));
    }
    const avg1 = delays1.reduce((a, b) => a + b, 0) / delays1.length;
    const avg5 = delays5.reduce((a, b) => a + b, 0) / delays5.length;
    expect(avg5).toBeGreaterThan(avg1);
  });

  it('returns positive delay for attempt 0', () => {
    expect(computeNextRetryDelay(0)).toBeGreaterThan(0);
  });
});
