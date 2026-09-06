import { request } from "./client";
import type { Borrowing, BorrowingInput, BorrowingStatus, PaginatedData } from "./types";

export interface ListBorrowingsParams {
  page?: number;
  limit?: number;
  status?: BorrowingStatus | "";
  member_id?: number;
  book_id?: number;
}

export function listBorrowings(params: ListBorrowingsParams = {}): Promise<PaginatedData<Borrowing>> {
  return request<PaginatedData<Borrowing>>("/borrowings", { params });
}

export function getBorrowing(id: number): Promise<Borrowing> {
  return request<Borrowing>(`/borrowings/${id}`);
}

export function createBorrowing(input: BorrowingInput): Promise<Borrowing> {
  return request<Borrowing>("/borrowings", { method: "POST", body: input });
}

export function returnBorrowing(id: number): Promise<Borrowing> {
  return request<Borrowing>(`/borrowings/${id}/return`, { method: "POST" });
}
