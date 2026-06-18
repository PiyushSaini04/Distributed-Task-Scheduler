import { useEffect, useState } from 'react';
import { fetchJob, getErrorMessage } from '../services/api';
import type { JobDetail } from '../types';
import StatusBadge from './StatusBadge';
import LoadingSpinner from './LoadingSpinner';
import ErrorAlert from './ErrorAlert';

interface JobDetailModalProps {
  jobId: string;
  onClose: () => void;
}

function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleString();
}

export default function JobDetailModal({ jobId, onClose }: JobDetailModalProps) {
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchJob(jobId)
      .then(setJob)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [jobId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-surface-raised shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-lg font-semibold text-white">Job Details</h3>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-gray-400 transition-colors hover:bg-surface-overlay hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {loading && <LoadingSpinner />}
          {error && <ErrorAlert message={error} />}
          {job && (
            <div className="space-y-6">
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-500">Job ID</dt>
                  <dd className="mt-1 break-all font-mono text-xs text-gray-200">{job.id}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Type</dt>
                  <dd className="mt-1 text-gray-200">{job.type}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Status</dt>
                  <dd className="mt-1">
                    <StatusBadge status={job.status} />
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Retries</dt>
                  <dd className="mt-1 text-gray-200">
                    {job.retryCount} / {job.maxRetries}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Worker</dt>
                  <dd className="mt-1 font-mono text-xs text-gray-200">{job.workerId ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Processing Time</dt>
                  <dd className="mt-1 text-gray-200">
                    {job.processingTimeMs != null ? `${job.processingTimeMs}ms` : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Created</dt>
                  <dd className="mt-1 text-gray-200">{formatDate(job.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Updated</dt>
                  <dd className="mt-1 text-gray-200">{formatDate(job.updatedAt)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Next Retry</dt>
                  <dd className="mt-1 text-gray-200">{formatDate(job.nextRetryAt)}</dd>
                </div>
              </dl>

              {job.errorMessage && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                  <p className="text-xs font-medium uppercase text-red-400">Error</p>
                  <p className="mt-1 text-sm text-red-200">{job.errorMessage}</p>
                </div>
              )}

              <div>
                <p className="mb-2 text-xs font-medium uppercase text-gray-500">Payload</p>
                <pre className="overflow-x-auto rounded-lg bg-surface p-4 text-xs text-gray-300">
                  {JSON.stringify(job.payload, null, 2)}
                </pre>
              </div>

              <div>
                <p className="mb-3 text-xs font-medium uppercase text-gray-500">
                  Attempts ({job.attempts.length})
                </p>
                {job.attempts.length === 0 ? (
                  <p className="text-sm text-gray-500">No attempts yet</p>
                ) : (
                  <div className="space-y-2">
                    {job.attempts.map((attempt) => (
                      <div
                        key={attempt.attemptNumber}
                        className="rounded-lg border border-border bg-surface p-3 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-200">
                            Attempt #{attempt.attemptNumber}
                          </span>
                          <StatusBadge status={attempt.status} />
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-400">
                          <span>Worker: {attempt.workerId}</span>
                          <span>Duration: {attempt.durationMs ?? '—'}ms</span>
                          <span>Started: {formatDate(attempt.startedAt)}</span>
                          <span>Completed: {formatDate(attempt.completedAt)}</span>
                        </div>
                        {attempt.error && (
                          <p className="mt-2 text-xs text-red-300">{attempt.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
