import type { Job } from '../types';
import StatusBadge from './StatusBadge';

function formatDate(date: string): string {
  return new Date(date).toLocaleString();
}

function truncateId(id: string): string {
  return `${id.slice(0, 8)}…`;
}

interface JobsTableProps {
  jobs: Job[];
  onSelectJob: (job: Job) => void;
  showFailureReason?: boolean;
  showRetryCount?: boolean;
  showWorker?: boolean;
  onReplay?: (job: Job) => void;
  replayingId?: string | null;
}

export default function JobsTable({
  jobs,
  onSelectJob,
  showFailureReason = false,
  showRetryCount = false,
  showWorker = false,
  onReplay,
  replayingId,
}: JobsTableProps) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface-raised p-8 text-center text-gray-500">
        No jobs found
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-raised">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-overlay text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3 font-medium">Job ID</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Attempts</th>
              {showWorker && <th className="px-4 py-3 font-medium">Worker</th>}
              {showRetryCount && <th className="px-4 py-3 font-medium">Retries</th>}
              <th className="px-4 py-3 font-medium">Processing</th>
              <th className="px-4 py-3 font-medium">Created At</th>
              {showFailureReason && <th className="px-4 py-3 font-medium">Failure Reason</th>}
              {onReplay && <th className="px-4 py-3 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {jobs.map((job) => (
              <tr
                key={job.id}
                onClick={() => onSelectJob(job)}
                className="cursor-pointer transition-colors hover:bg-surface-overlay/60"
              >
                <td className="px-4 py-3 font-mono text-xs text-gray-300" title={job.id}>
                  {truncateId(job.id)}
                </td>
                <td className="px-4 py-3 text-gray-200">{job.type}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={job.status} />
                </td>
                <td className="px-4 py-3 tabular-nums text-gray-300">
                  {job.attemptCount ?? job.retryCount}
                </td>
                {showWorker && (
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">
                    {job.workerId ?? '—'}
                  </td>
                )}
                {showRetryCount && (
                  <td className="px-4 py-3 tabular-nums text-gray-300">{job.retryCount}</td>
                )}
                <td className="px-4 py-3 tabular-nums text-gray-400">
                  {job.processingTimeMs != null ? `${job.processingTimeMs}ms` : '—'}
                </td>
                <td className="px-4 py-3 text-gray-400">{formatDate(job.createdAt)}</td>
                {showFailureReason && (
                  <td className="max-w-xs truncate px-4 py-3 text-red-300">
                    {job.errorMessage ?? '—'}
                  </td>
                )}
                {onReplay && (
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onReplay(job);
                      }}
                      disabled={replayingId === job.id}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {replayingId === job.id ? 'Replaying…' : 'Replay'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
