import { JobStatus } from '../types';

export class InvalidStateTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStateTransitionError';
  }
}

const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  PENDING: ['PROCESSING'],
  PROCESSING: ['COMPLETED', 'FAILED'],
  FAILED: ['RETRYING', 'DEAD_LETTER'],
  RETRYING: ['PENDING'],
  DEAD_LETTER: ['PENDING'],
  COMPLETED: [],
};

export function assertValidTransition(from: JobStatus, to: JobStatus): void {
  if (!VALID_TRANSITIONS[from]?.includes(to)) {
    throw new InvalidStateTransitionError(`Illegal transition: ${from} → ${to}`);
  }
}

export function getValidTransitions(from: JobStatus): JobStatus[] {
  return VALID_TRANSITIONS[from] ?? [];
}
