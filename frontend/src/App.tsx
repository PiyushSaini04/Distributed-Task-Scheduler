import { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import DeadLetterQueue from './pages/DeadLetterQueue';
import Health from './pages/Health';
import type { Page } from './types';

const pageTitles: Record<Page, string> = {
  dashboard: 'Dashboard',
  jobs: 'Jobs',
  dlq: 'Dead Letter Queue',
  health: 'System Health',
};

function renderPage(page: Page) {
  switch (page) {
    case 'dashboard':
      return <Dashboard />;
    case 'jobs':
      return <Jobs />;
    case 'dlq':
      return <DeadLetterQueue />;
    case 'health':
      return <Health />;
  }
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      title={pageTitles[currentPage]}
    >
      {renderPage(currentPage)}
    </Layout>
  );
}
