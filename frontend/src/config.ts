export const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

export const demoConfig = {
  minDelayMs: 500,
  maxDelayMs: 1000,
  pollIntervalMs: 5000,
} as const;
