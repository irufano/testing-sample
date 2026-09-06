import type { Pagination as PaginationInfo } from "../api/types";

interface PaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
}

export default function Pagination({ pagination, onPageChange }: PaginationProps) {
  const { page, total_pages, total } = pagination;

  if (total_pages <= 1) return null;

  return (
    <div className="pagination">
      <button type="button" className="btn btn-secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Previous
      </button>
      <span className="pagination-info">
        Page {page} of {total_pages} ({total} total)
      </span>
      <button
        type="button"
        className="btn btn-secondary"
        disabled={page >= total_pages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
