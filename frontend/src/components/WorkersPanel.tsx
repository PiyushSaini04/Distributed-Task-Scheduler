import { useDemo } from '../context/DemoContext';
import type { WorkerStatus } from '../types';

const statusStyles: Record<WorkerStatus, string> = {
  ACTIVE: 'bg-green-500/20 text-green-300 border-green-500/30',
  RECOVERING: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  INACTIVE: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

function formatUptime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

function formatHeartbeat(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  if (diff < 60000) return `${Math.max(1, Math.floor(diff / 1000))}s ago`;
  return `${Math.floor(diff / 60000)}m ago`;
}

export default function WorkersPanel() {
  const { workers, isDemoMode } = useDemo();

  if (!isDemoMode || workers.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-surface-raised">
      <div className="border-b border-border px-5 py-4">
        <h3 className="text-sm font-semibold text-white">Workers</h3>
        <p className="mt-0.5 text-xs text-gray-500">{workers.length} registered workers</p>
      </div>

      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        {workers.map((worker) => (
          <div
            key={worker.id}
            className="rounded-lg border border-border bg-surface p-4"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-medium text-white">{worker.id}</span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusStyles[worker.status]}`}
              >
                {worker.status}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-gray-500">Jobs processed</dt>
                <dd className="mt-0.5 font-medium tabular-nums text-gray-200">
                  {worker.jobsProcessed}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Uptime</dt>
                <dd className="mt-0.5 font-medium text-gray-200">
                  {formatUptime(worker.uptimeMs)}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-gray-500">Last heartbeat</dt>
                <dd className="mt-0.5 font-medium text-gray-200">
                  {formatHeartbeat(worker.lastHeartbeat)}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
