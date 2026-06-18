import Sidebar from './Sidebar';
import type { Page } from '../types';

interface LayoutProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  title: string;
  children: React.ReactNode;
}

export default function Layout({ currentPage, onNavigate, title, children }: LayoutProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />

      <main className="flex flex-1 flex-col overflow-auto">
        <header className="border-b border-border bg-surface-raised px-8 py-5">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
        </header>
        <div className="flex-1 p-8">{children}</div>
      </main>
    </div>
  );
}
