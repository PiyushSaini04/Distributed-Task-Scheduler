interface ErrorAlertProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorAlert({ message, onRetry }: ErrorAlertProps) {
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
      <p className="text-sm text-red-300">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-sm font-medium text-red-200 underline hover:text-white"
        >
          Retry
        </button>
      )}
    </div>
  );
}
