import type { ReactNode } from "react";

interface DataStateProps {
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  emptyMessage?: string;
  onRetry?: () => void;
  children: ReactNode;
}

/** Wraps a data-driven view and renders the loading / error / empty / success state consistently. */
export default function DataState({
  loading,
  error,
  isEmpty,
  emptyMessage = "Nothing to show yet.",
  onRetry,
  children,
}: DataStateProps) {
  if (loading) {
    return <div className="state-panel state-loading">Loading…</div>;
  }

  if (error) {
    return (
      <div className="state-panel state-error">
        <p>{error}</p>
        {onRetry && (
          <button type="button" className="btn btn-secondary" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return <div className="state-panel state-empty">{emptyMessage}</div>;
  }

  return <>{children}</>;
}
