import { fetchHealth } from '../services/api';
import { usePolling } from '../hooks/usePolling';
import { useDemo } from '../context/DemoContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import DemoControls from '../components/DemoControls';
import WorkersPanel from '../components/WorkersPanel';

interface HealthCheckProps {
  label: string;
  status: 'ok' | 'error' | number;
  isCount?: boolean;
}

function HealthCheck({ label, status, isCount = false }: HealthCheckProps) {
  const isHealthy = isCount ? (status as number) > 0 : status === 'ok';

  return (
    <div className="rounded-lg border border-border bg-surface-raised p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {isCount ? status : status === 'ok' ? 'Healthy' : 'Unhealthy'}
          </p>
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full text-xl ${
            isHealthy
              ? 'bg-green-500/20 text-green-400'
              : isCount
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-red-500/20 text-red-400'
          }`}
        >
          {isHealthy ? '✓' : isCount ? '!' : '✕'}
        </div>
      </div>
    </div>
  );
}

export default function Health() {
  const { refreshKey, isDemoMode } = useDemo();
  const { data: health, loading, error, refresh } = usePolling(
    fetchHealth,
    5000,
    true,
    [refreshKey],
  );

  if (loading && !health) return <LoadingSpinner />;
  if (error && !health) return <ErrorAlert message={error} onRetry={refresh} />;

  const overallHealthy = health?.status === 'ok';

  return (
    <div className="space-y-6">
      {isDemoMode && <DemoControls />}

      {error && <ErrorAlert message={error} onRetry={refresh} />}

      <div
        className={`rounded-lg border p-6 ${
          overallHealthy
            ? 'border-green-500/30 bg-green-500/10'
            : 'border-yellow-500/30 bg-yellow-500/10'
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
              overallHealthy ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
            }`}
          >
            {overallHealthy ? '✓' : '!'}
          </div>
          <div>
            <p className="text-lg font-semibold text-white">
              System {overallHealthy ? 'Operational' : 'Degraded'}
            </p>
            <p className="text-sm text-gray-400">
              API status: <span className="uppercase">{health?.status}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <HealthCheck label="API" status={health?.status === 'ok' ? 'ok' : 'error'} />
        <HealthCheck label="PostgreSQL" status={health?.checks.postgres ?? 'error'} />
        <HealthCheck label="Redis" status={health?.checks.redis ?? 'error'} />
        <HealthCheck
          label="Active Workers"
          status={health?.checks.workerCount ?? 0}
          isCount
        />
      </div>

      <WorkersPanel />
    </div>
  );
}
