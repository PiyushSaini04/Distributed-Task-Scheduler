import { useDemo } from '../context/DemoContext';
import type { Page } from '../types';

const navItems: { id: Page; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '▣' },
  { id: 'jobs', label: 'Jobs', icon: '☰' },
  { id: 'dlq', label: 'Dead Letter Queue', icon: '⚠' },
  { id: 'health', label: 'Health', icon: '♥' },
];

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { isDemoMode } = useDemo();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface-raised">
      <div className="border-b border-border px-6 py-5">
        <h1 className="text-lg font-semibold text-white">Task Scheduler</h1>
        <p className="mt-1 text-xs text-gray-500">Monitoring Dashboard</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
              currentPage === item.id
                ? 'bg-blue-500/20 text-blue-300'
                : 'text-gray-400 hover:bg-surface-overlay hover:text-gray-200'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="border-t border-border p-4 space-y-2">
        {isDemoMode && (
          <span className="inline-block rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-300">
            Demo Mode
          </span>
        )}
        <p className="text-xs text-gray-500">Auto-refresh: 5s</p>
      </div>
    </aside>
  );
}
