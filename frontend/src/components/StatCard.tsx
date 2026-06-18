interface StatCardProps {
  label: string;
  value: number | string;
  accent?: string;
}

export default function StatCard({ label, value, accent = 'text-white' }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-surface-raised p-5">
      <p className="text-sm font-medium text-gray-400">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tabular-nums ${accent}`}>{value}</p>
    </div>
  );
}
