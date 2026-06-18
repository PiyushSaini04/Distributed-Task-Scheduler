import { useState } from 'react';
import { fetchJobs, replayJob, getErrorMessage } from '../services/api';
import { usePolling } from '../hooks/usePolling';
import { useDemo } from '../context/DemoContext';
import type { Job } from '../types';
import JobsTable from '../components/JobsTable';
import JobDetailModal from '../components/JobDetailModal';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import DemoControls from '../components/DemoControls';

export default function DeadLetterQueue() {
  const { refreshKey, isDemoMode, bump } = useDemo();
  const { data, loading, error, refresh } = usePolling(
    () => fetchJobs('DEAD_LETTER'),
    5000,
    true,
    [refreshKey],
  );
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleReplay = async (job: Job) => {
    setReplayingId(job.id);
    setActionError(null);
    setSuccessMessage(null);

    try {
      const result = await replayJob(job.id);
      setSuccessMessage(`Replayed as new job ${result.newJobId.slice(0, 8)}…`);
      if (isDemoMode) bump();
      refresh();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setReplayingId(null);
    }
  };

  if (loading && !data) return <LoadingSpinner />;
  if (error && !data) return <ErrorAlert message={error} onRetry={refresh} />;

  return (
    <div className="space-y-4">
      {isDemoMode && <DemoControls />}
      {error && <ErrorAlert message={error} onRetry={refresh} />}
      {actionError && <ErrorAlert message={actionError} />}
      {successMessage && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-300">
          {successMessage}
        </div>
      )}

      <p className="text-sm text-gray-400">
        Jobs that exhausted all retry attempts. Click replay to re-enqueue.
      </p>

      <JobsTable
        jobs={data?.jobs ?? []}
        onSelectJob={setSelectedJob}
        showFailureReason
        showRetryCount
        onReplay={handleReplay}
        replayingId={replayingId}
      />

      {selectedJob && (
        <JobDetailModal jobId={selectedJob.id} onClose={() => setSelectedJob(null)} />
      )}
    </div>
  );
}
