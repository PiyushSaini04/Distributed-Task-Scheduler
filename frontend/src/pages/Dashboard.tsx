import { fetchStats } from '../services/api';
import { usePolling } from '../hooks/usePolling';
import { useDemo } from '../context/DemoContext';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import DemoControls from '../components/DemoControls';
import RecentEvents from '../components/RecentEvents';

export default function Dashboard() {
  const { refreshKey, isDemoMode } = useDemo();
  const { data: stats, loading, error, refresh } = usePolling(
    fetchStats,
    5000,
    true,
    [refreshKey],
  );

  if (loading && !stats) return <LoadingSpinner />;
  if (error && !stats) return <ErrorAlert message={error} onRetry={refresh} />;

  return (
    <div className="space-y-6">
      {isDemoMode && <DemoControls />}
      {error && <ErrorAlert message={error} onRetry={refresh} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Jobs" value={stats?.totalJobs ?? 0} accent="text-white" />
        <StatCard label="Queue Depth" value={stats?.queueDepth ?? 0} accent="text-cyan-400" />
        <StatCard
          label="Active Workers"
          value={stats?.activeWorkers ?? 0}
          accent="text-emerald-400"
        />
        <StatCard
          label="Throughput / min"
          value={stats?.throughputPerMinute ?? 0}
          accent="text-blue-400"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Pending" value={stats?.pending ?? 0} accent="text-yellow-400" />
        <StatCard label="Processing" value={stats?.processing ?? 0} accent="text-blue-400" />
        <StatCard label="Completed" value={stats?.completed ?? 0} accent="text-green-400" />
        <StatCard label="Failed" value={stats?.failed ?? 0} accent="text-red-400" />
        <StatCard label="Retrying" value={stats?.retrying ?? 0} accent="text-orange-400" />
        <StatCard label="Dead Letter" value={stats?.deadLetter ?? 0} accent="text-purple-400" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StatCard
          label="Avg Processing Time"
          value={`${stats?.avgProcessingTimeMs ?? 0}ms`}
          accent="text-gray-300"
        />
        {isDemoMode ? (
          <RecentEvents />
        ) : (
          <div className="rounded-lg border border-border bg-surface-raised p-5">
            <p className="text-sm text-gray-500">
              Enable demo mode to view the live activity feed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
