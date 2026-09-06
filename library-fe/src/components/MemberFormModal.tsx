import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { createMember, updateMember } from "../api/members";
import { ApiError } from "../api/client";
import type { Member, MemberInput, MemberStatus } from "../api/types";
import Modal from "./Modal";

interface MemberFormModalProps {
  member: Member | null;
  onClose: () => void;
  onSaved: (member: Member) => void;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  status: MemberStatus;
}

function toFormState(member: Member | null): FormState {
  return {
    name: member?.name ?? "",
    email: member?.email ?? "",
    phone: member?.phone ?? "",
    status: member?.status ?? "active",
  };
}

export default function MemberFormModal({ member, onClose, onSaved }: MemberFormModalProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(member));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = member !== null;

  const update =
    (field: "name" | "email" | "phone") => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const payload: MemberInput = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      status: form.status,
    };

    setSubmitting(true);
    try {
      const saved = isEdit ? await updateMember(member.id, payload) : await createMember(payload);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit Member" : "Add Member"} onClose={onClose}>
      <form className="form" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}

        <label className="field">
          <span>Name</span>
          <input value={form.name} onChange={update("name")} required maxLength={255} />
        </label>

        <label className="field">
          <span>Email</span>
          <input type="email" value={form.email} onChange={update("email")} required maxLength={255} />
        </label>

        <label className="field">
          <span>Phone (optional)</span>
          <input value={form.phone} onChange={update("phone")} maxLength={32} />
        </label>

        <label className="field">
          <span>Status</span>
          <select
            value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as MemberStatus }))}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </label>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Create member"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
