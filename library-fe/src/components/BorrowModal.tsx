import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { listBooks } from "../api/books";
import { listMembers } from "../api/members";
import { createBorrowing } from "../api/borrowings";
import { ApiError } from "../api/client";
import type { Book, Borrowing, Member } from "../api/types";
import Modal from "./Modal";

interface BorrowModalProps {
  onClose: () => void;
  onBorrowed: (borrowing: Borrowing) => void;
}

export default function BorrowModal({ onClose, onBorrowed }: BorrowModalProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const [bookId, setBookId] = useState<string>("");
  const [memberId, setMemberId] = useState<string>("");
  const [dueAt, setDueAt] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      setLoadingOptions(true);
      setOptionsError(null);
      try {
        const [booksPage, membersPage] = await Promise.all([
          listBooks({ limit: 100 }),
          listMembers({ limit: 100, status: "active" }),
        ]);
        if (cancelled) return;
        setBooks(booksPage.items.filter((book) => book.available_copies > 0));
        setMembers(membersPage.items);
      } catch (err) {
        if (cancelled) return;
        setOptionsError(err instanceof ApiError ? err.message : "Failed to load books and members.");
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    }

    loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!bookId || !memberId) {
      setError("Please select both a book and a member.");
      return;
    }

    setSubmitting(true);
    try {
      const borrowing = await createBorrowing({
        book_id: Number(bookId),
        member_id: Number(memberId),
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
      });
      onBorrowed(borrowing);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Borrow a Book" onClose={onClose}>
      {loadingOptions ? (
        <p>Loading books and members…</p>
      ) : optionsError ? (
        <div className="form-error">{optionsError}</div>
      ) : (
        <form className="form" onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}

          <label className="field">
            <span>Book</span>
            <select value={bookId} onChange={(event) => setBookId(event.target.value)} required>
              <option value="" disabled>
                {books.length === 0 ? "No books available" : "Select a book"}
              </option>
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title} ({book.available_copies} available)
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Member</span>
            <select value={memberId} onChange={(event) => setMemberId(event.target.value)} required>
              <option value="" disabled>
                {members.length === 0 ? "No active members" : "Select a member"}
              </option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.email})
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Due date (optional, defaults to 14 days)</span>
            <input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
          </label>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting || books.length === 0 || members.length === 0}>
              {submitting ? "Borrowing…" : "Borrow"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
