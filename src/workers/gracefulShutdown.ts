let isRunning = true;
let currentJobPromise: Promise<void> | null = null;

export function getIsRunning(): boolean {
  return isRunning;
}

export function setIsRunning(value: boolean): void {
  isRunning = value;
}

export function getCurrentJobPromise(): Promise<void> | null {
  return currentJobPromise;
}

export function setCurrentJobPromise(promise: Promise<void> | null): void {
  currentJobPromise = promise;
}

export function setupGracefulShutdown(
  workerId: string,
  onShutdown: () => Promise<void>,
): void {
  const shutdown = async (signal: string) => {
    const { logger } = await import('../logger/logger');
    logger.info({ workerId, event: 'shutdown_initiated', signal });
    isRunning = false;

    if (currentJobPromise) {
      await currentJobPromise;
    }

    await onShutdown();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
