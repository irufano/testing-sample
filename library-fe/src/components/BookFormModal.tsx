import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { createBook, updateBook } from "../api/books";
import { ApiError } from "../api/client";
import type { Book, BookInput } from "../api/types";
import Modal from "./Modal";

interface BookFormModalProps {
  book: Book | null;
  onClose: () => void;
  onSaved: (book: Book) => void;
}

interface FormState {
  title: string;
  author: string;
  isbn: string;
  category: string;
  description: string;
  total_copies: string;
}

function toFormState(book: Book | null): FormState {
  return {
    title: book?.title ?? "",
    author: book?.author ?? "",
    isbn: book?.isbn ?? "",
    category: book?.category ?? "",
    description: book?.description ?? "",
    total_copies: book ? String(book.total_copies) : "1",
  };
}

export default function BookFormModal({ book, onClose, onSaved }: BookFormModalProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(book));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = book !== null;

  const update = (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const totalCopies = Number(form.total_copies);
    if (!Number.isInteger(totalCopies) || totalCopies < 0) {
      setError("Total copies must be a non-negative whole number.");
      return;
    }

    const payload: BookInput = {
      title: form.title.trim(),
      author: form.author.trim(),
      isbn: form.isbn.trim(),
      category: form.category.trim(),
      description: form.description.trim() || null,
      total_copies: totalCopies,
    };

    setSubmitting(true);
    try {
      const saved = isEdit ? await updateBook(book.id, payload) : await createBook(payload);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit Book" : "Add Book"} onClose={onClose}>
      <form className="form" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}

        <label className="field">
          <span>Title</span>
          <input value={form.title} onChange={update("title")} required maxLength={255} />
        </label>

        <label className="field">
          <span>Author</span>
          <input value={form.author} onChange={update("author")} required maxLength={255} />
        </label>

        <label className="field">
          <span>ISBN</span>
          <input value={form.isbn} onChange={update("isbn")} required maxLength={32} />
        </label>

        <label className="field">
          <span>Category</span>
          <input value={form.category} onChange={update("category")} required maxLength={100} />
        </label>

        <label className="field">
          <span>Total copies</span>
          <input type="number" min={0} value={form.total_copies} onChange={update("total_copies")} required />
        </label>

        <label className="field">
          <span>Description (optional)</span>
          <textarea value={form.description} onChange={update("description")} rows={3} />
        </label>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Create book"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
