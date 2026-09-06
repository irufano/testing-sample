import { useCallback, useEffect, useState } from "react";
import { listBorrowings, returnBorrowing } from "../api/borrowings";
import { ApiError } from "../api/client";
import type { Borrowing, BorrowingStatus, PaginatedData } from "../api/types";
import BorrowModal from "../components/BorrowModal";
import DataState from "../components/DataState";
import Pagination from "../components/Pagination";
import StatusBadge from "../components/StatusBadge";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function BorrowingsPage() {
  const [data, setData] = useState<PaginatedData<Borrowing> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<BorrowingStatus | "">("");

  const [borrowOpen, setBorrowOpen] = useState(false);
  const [returningId, setReturningId] = useState<number | null>(null);
  const [returnError, setReturnError] = useState<string | null>(null);

  const fetchBorrowings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listBorrowings({ page, limit: 10, status });
      setData(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load borrowings.");
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    fetchBorrowings();
  }, [fetchBorrowings]);

  async function handleReturn(borrowing: Borrowing) {
    setReturningId(borrowing.id);
    setReturnError(null);
    try {
      await returnBorrowing(borrowing.id);
      await fetchBorrowings();
    } catch (err) {
      setReturnError(err instanceof ApiError ? err.message : "Failed to return book.");
    } finally {
      setReturningId(null);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Borrowings</h1>
        <button type="button" className="btn btn-primary" onClick={() => setBorrowOpen(true)}>
          + Borrow a Book
        </button>
      </div>

      <div className="toolbar">
        <select
          className="search-input"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as BorrowingStatus | "");
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="borrowed">Borrowed</option>
          <option value="returned">Returned</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {returnError && <div className="form-error">{returnError}</div>}

      <DataState
        loading={loading}
        error={error}
        isEmpty={!!data && data.items.length === 0}
        onRetry={fetchBorrowings}
        emptyMessage="No borrowings found."
      >
        {data && (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Book</th>
                    <th>Member</th>
                    <th>Borrowed</th>
                    <th>Due</th>
                    <th>Returned</th>
                    <th>Status</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((borrowing) => (
                    <tr key={borrowing.id}>
                      <td>{borrowing.book.title}</td>
                      <td>{borrowing.member.name}</td>
                      <td>{formatDate(borrowing.borrowed_at)}</td>
                      <td>{formatDate(borrowing.due_at)}</td>
                      <td>{formatDate(borrowing.returned_at)}</td>
                      <td>
                        <StatusBadge status={borrowing.status} />
                      </td>
                      <td className="table-actions">
                        {borrowing.status === "borrowed" && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={returningId === borrowing.id}
                            onClick={() => handleReturn(borrowing)}
                          >
                            {returningId === borrowing.id ? "Returning…" : "Return"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={data.pagination} onPageChange={setPage} />
          </>
        )}
      </DataState>

      {borrowOpen && (
        <BorrowModal
          onClose={() => setBorrowOpen(false)}
          onBorrowed={() => {
            setBorrowOpen(false);
            fetchBorrowings();
          }}
        />
      )}
    </div>
  );
}
