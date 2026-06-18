import { useDemo } from '../context/DemoContext';
import type { RecentEventType } from '../types';

const eventStyles: Record<RecentEventType, string> = {
  job_completed: 'text-green-400',
  worker_picked_job: 'text-blue-400',
  retry_scheduled: 'text-orange-400',
  job_moved_to_dlq: 'text-purple-400',
  worker_recovered: 'text-cyan-400',
  worker_crash: 'text-red-400',
  job_failed: 'text-red-300',
};

const eventLabels: Record<RecentEventType, string> = {
  job_completed: 'Completed',
  worker_picked_job: 'Picked',
  retry_scheduled: 'Retry',
  job_moved_to_dlq: 'DLQ',
  worker_recovered: 'Recovered',
  worker_crash: 'Crash',
  job_failed: 'Failed',
};

function formatTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  if (diff < 60000) return `${Math.max(1, Math.floor(diff / 1000))}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return new Date(timestamp).toLocaleTimeString();
}

export default function RecentEvents() {
  const { events, isDemoMode } = useDemo();

  if (!isDemoMode) return null;

  return (
    <div className="rounded-lg border border-border bg-surface-raised">
      <div className="border-b border-border px-5 py-4">
        <h3 className="text-sm font-semibold text-white">Recent Events</h3>
        <p className="mt-0.5 text-xs text-gray-500">Live system activity feed</p>
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-border">
        {events.length === 0 ? (
          <p className="p-5 text-sm text-gray-500">No events yet</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="flex items-start gap-3 px-5 py-3">
              <span
                className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${eventStyles[event.type]} bg-surface`}
              >
                {eventLabels[event.type]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-300">{event.message}</p>
                <p className="mt-0.5 text-xs text-gray-500">{formatTime(event.timestamp)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
