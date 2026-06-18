import { useDemo } from '../context/DemoContext';

export default function DemoControls() {
  const {
    isDemoMode,
    generateRandomJobs,
    simulateFailure,
    simulateWorkerCrash,
    clearDemoData,
  } = useDemo();

  if (!isDemoMode) return null;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-amber-200">Demo Controls</h3>
          <p className="mt-0.5 text-xs text-amber-200/60">
            Simulate distributed system activity for demos
          </p>
        </div>
        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-300">
          DEMO MODE
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={generateRandomJobs}
          className="rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-500"
        >
          Generate Random Jobs
        </button>
        <button
          onClick={simulateFailure}
          className="rounded-md bg-red-600/80 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-red-500"
        >
          Simulate Failure
        </button>
        <button
          onClick={simulateWorkerCrash}
          className="rounded-md bg-orange-600/80 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-orange-500"
        >
          Simulate Worker Crash
        </button>
        <button
          onClick={clearDemoData}
          className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:text-white"
        >
          Clear Demo Data
        </button>
      </div>
    </div>
  );
}
