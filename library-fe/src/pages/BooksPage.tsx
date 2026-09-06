import { useCallback, useEffect, useState } from "react";
import { deleteBook, listBooks } from "../api/books";
import { ApiError } from "../api/client";
import type { Book, PaginatedData } from "../api/types";
import BookFormModal from "../components/BookFormModal";
import ConfirmDialog from "../components/ConfirmDialog";
import DataState from "../components/DataState";
import Pagination from "../components/Pagination";

export default function BooksPage() {
  const [data, setData] = useState<PaginatedData<Book> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  const [editing, setEditing] = useState<Book | null | "new">(null);
  const [deleting, setDeleting] = useState<Book | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listBooks({ page, limit: 10, search: search || undefined, category: category || undefined });
      setData(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load books.");
    } finally {
      setLoading(false);
    }
  }, [page, search, category]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteBook(deleting.id);
      setDeleting(null);
      await fetchBooks();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Failed to delete book.");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Books</h1>
        <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
          + Add Book
        </button>
      </div>

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Search by title, author or ISBN…"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <input
          className="search-input"
          placeholder="Filter by category…"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setPage(1);
          }}
        />
      </div>

      <DataState loading={loading} error={error} isEmpty={!!data && data.items.length === 0} onRetry={fetchBooks} emptyMessage="No books found.">
        {data && (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>ISBN</th>
                    <th>Category</th>
                    <th>Copies</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((book) => (
                    <tr key={book.id}>
                      <td>{book.title}</td>
                      <td>{book.author}</td>
                      <td>{book.isbn}</td>
                      <td>{book.category}</td>
                      <td>
                        {book.available_copies} / {book.total_copies}
                      </td>
                      <td className="table-actions">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(book)}>
                          Edit
                        </button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleting(book)}>
                          Delete
                        </button>
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

      {editing !== null && (
        <BookFormModal
          book={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            fetchBooks();
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete Book"
          message={
            deleteError ?? `Are you sure you want to delete "${deleting.title}"? This cannot be undone.`
          }
          busy={deleteBusy}
          onConfirm={confirmDelete}
          onCancel={() => {
            setDeleting(null);
            setDeleteError(null);
          }}
        />
      )}
    </div>
  );
}
