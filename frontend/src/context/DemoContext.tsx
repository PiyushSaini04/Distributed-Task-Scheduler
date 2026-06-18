import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { isDemoMode } from '../config';
import { mockStore } from '../mock/mockStore';
import type { RecentEvent, WorkerInfo } from '../types';

interface DemoContextValue {
  isDemoMode: boolean;
  refreshKey: number;
  events: RecentEvent[];
  workers: WorkerInfo[];
  bump: () => void;
  generateRandomJobs: () => void;
  simulateFailure: () => void;
  simulateWorkerCrash: () => void;
  clearDemoData: () => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [events, setEvents] = useState<RecentEvent[]>([]);
  const [workers, setWorkers] = useState<WorkerInfo[]>([]);

  const sync = useCallback(() => {
    if (!isDemoMode) return;
    setEvents(mockStore.getEvents());
    setWorkers(mockStore.getWorkers());
  }, []);

  const bump = useCallback(() => {
    sync();
    setRefreshKey((k) => k + 1);
  }, [sync]);

  useEffect(() => {
    if (!isDemoMode) return;
    sync();
    return mockStore.subscribe(sync);
  }, [sync]);

  const generateRandomJobs = useCallback(() => {
    mockStore.generateRandomJobs();
    bump();
  }, [bump]);

  const simulateFailure = useCallback(() => {
    mockStore.simulateFailure();
    bump();
  }, [bump]);

  const simulateWorkerCrash = useCallback(() => {
    mockStore.simulateWorkerCrash();
    bump();
  }, [bump]);

  const clearDemoData = useCallback(() => {
    mockStore.clearDemoData();
    bump();
  }, [bump]);

  return (
    <DemoContext.Provider
      value={{
        isDemoMode,
        refreshKey,
        events,
        workers,
        bump,
        generateRandomJobs,
        simulateFailure,
        simulateWorkerCrash,
        clearDemoData,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) {
    return {
      isDemoMode: false,
      refreshKey: 0,
      events: [],
      workers: [],
      bump: () => {},
      generateRandomJobs: () => {},
      simulateFailure: () => {},
      simulateWorkerCrash: () => {},
      clearDemoData: () => {},
    };
  }
  return ctx;
}
