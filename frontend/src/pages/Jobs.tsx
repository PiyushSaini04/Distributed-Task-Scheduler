import { useState } from 'react';
import { fetchJobs } from '../services/api';
import { usePolling } from '../hooks/usePolling';
import { useDemo } from '../context/DemoContext';
import type { Job } from '../types';
import JobsTable from '../components/JobsTable';
import JobDetailModal from '../components/JobDetailModal';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import DemoControls from '../components/DemoControls';

export default function Jobs() {
  const { refreshKey, isDemoMode } = useDemo();
  const { data, loading, error, refresh } = usePolling(
    () => fetchJobs(),
    5000,
    true,
    [refreshKey],
  );
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  if (loading && !data) return <LoadingSpinner />;
  if (error && !data) return <ErrorAlert message={error} onRetry={refresh} />;

  return (
    <div className="space-y-4">
      {isDemoMode && <DemoControls />}
      {error && <ErrorAlert message={error} onRetry={refresh} />}

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{data?.jobs.length ?? 0} jobs loaded</p>
        <button
          onClick={refresh}
          className="rounded-md border border-border bg-surface-overlay px-3 py-1.5 text-sm text-gray-300 transition-colors hover:text-white"
        >
          Refresh
        </button>
      </div>

      <JobsTable jobs={data?.jobs ?? []} onSelectJob={setSelectedJob} showWorker />

      {selectedJob && (
        <JobDetailModal jobId={selectedJob.id} onClose={() => setSelectedJob(null)} />
      )}
    </div>
  );
}
