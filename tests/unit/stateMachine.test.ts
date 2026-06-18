import {
  assertValidTransition,
  InvalidStateTransitionError,
  getValidTransitions,
} from '../../src/state/stateMachine';
import { JobStatus } from '../../src/types';

describe('stateMachine', () => {
  const validPairs: [JobStatus, JobStatus][] = [
    ['PENDING', 'PROCESSING'],
    ['PROCESSING', 'COMPLETED'],
    ['PROCESSING', 'FAILED'],
    ['FAILED', 'RETRYING'],
    ['FAILED', 'DEAD_LETTER'],
    ['RETRYING', 'PENDING'],
    ['DEAD_LETTER', 'PENDING'],
  ];

  it.each(validPairs)('allows %s → %s', (from, to) => {
    expect(() => assertValidTransition(from, to)).not.toThrow();
  });

  const invalidPairs: [JobStatus, JobStatus][] = [
    ['COMPLETED', 'PROCESSING'],
    ['PENDING', 'COMPLETED'],
    ['PROCESSING', 'RETRYING'],
    ['COMPLETED', 'FAILED'],
  ];

  it.each(invalidPairs)('throws on %s → %s', (from, to) => {
    expect(() => assertValidTransition(from, to)).toThrow(InvalidStateTransitionError);
  });

  it('COMPLETED has no valid transitions', () => {
    expect(getValidTransitions('COMPLETED')).toEqual([]);
  });
});
