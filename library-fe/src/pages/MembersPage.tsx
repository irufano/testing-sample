import { useCallback, useEffect, useState } from "react";
import { deleteMember, listMembers } from "../api/members";
import { ApiError } from "../api/client";
import type { Member, MemberStatus, PaginatedData } from "../api/types";
import ConfirmDialog from "../components/ConfirmDialog";
import DataState from "../components/DataState";
import MemberFormModal from "../components/MemberFormModal";
import Pagination from "../components/Pagination";
import StatusBadge from "../components/StatusBadge";

export default function MembersPage() {
  const [data, setData] = useState<PaginatedData<Member> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<MemberStatus | "">("");

  const [editing, setEditing] = useState<Member | null | "new">(null);
  const [deleting, setDeleting] = useState<Member | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listMembers({ page, limit: 10, search: search || undefined, status });
      setData(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load members.");
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteMember(deleting.id);
      setDeleting(null);
      await fetchMembers();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Failed to delete member.");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Members</h1>
        <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
          + Add Member
        </button>
      </div>

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Search by name or email…"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <select
          className="search-input"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as MemberStatus | "");
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <DataState loading={loading} error={error} isEmpty={!!data && data.items.length === 0} onRetry={fetchMembers} emptyMessage="No members found.">
        {data && (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((member) => (
                    <tr key={member.id}>
                      <td>{member.name}</td>
                      <td>{member.email}</td>
                      <td>{member.phone ?? "—"}</td>
                      <td>
                        <StatusBadge status={member.status} />
                      </td>
                      <td className="table-actions">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(member)}>
                          Edit
                        </button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleting(member)}>
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
        <MemberFormModal
          member={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            fetchMembers();
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete Member"
          message={
            deleteError ?? `Are you sure you want to delete "${deleting.name}"? This cannot be undone.`
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
