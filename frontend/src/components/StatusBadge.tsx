import type { JobStatus } from '../types';

const statusStyles: Record<JobStatus, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  PROCESSING: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  COMPLETED: 'bg-green-500/20 text-green-300 border-green-500/30',
  FAILED: 'bg-red-500/20 text-red-300 border-red-500/30',
  RETRYING: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  DEAD_LETTER: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
};

interface StatusBadgeProps {
  status: JobStatus | string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const style =
    statusStyles[status as JobStatus] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/30';

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}
