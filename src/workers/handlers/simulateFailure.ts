export async function simulateFailureHandler(): Promise<void> {
  throw new Error('Deliberate failure — use this job type for testing retry/DLQ');
}
