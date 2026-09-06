// Shared envelope types matching library-api's BaseResponse<T> (see PRD section 24).

export type ResponseStatus = "success" | "error";

export interface ApiInfo {
  code: number;
  message: string;
  stacktrace: string | null;
}

export interface BaseResponse<T> {
  status: ResponseStatus;
  info: ApiInfo;
  data: T | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: Pagination;
}

// --- Domain models ---

export interface Book {
  id: number;
  title: string;
  author: string;
  isbn: string;
  category: string;
  description: string | null;
  total_copies: number;
  available_copies: number;
  created_at: string;
  updated_at: string;
}

export interface BookInput {
  title: string;
  author: string;
  isbn: string;
  category: string;
  description?: string | null;
  total_copies: number;
}

export type MemberStatus = "active" | "inactive" | "suspended";

export interface Member {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: MemberStatus;
  created_at: string;
  updated_at: string;
}

export interface MemberInput {
  name: string;
  email: string;
  phone?: string | null;
  status?: MemberStatus;
}

export type BorrowingStatus = "borrowed" | "returned" | "overdue";

export interface Borrowing {
  id: number;
  book_id: number;
  member_id: number;
  borrowed_at: string;
  due_at: string;
  returned_at: string | null;
  status: BorrowingStatus;
  created_at: string;
  updated_at: string;
  book: Book;
  member: Member;
}

export interface BorrowingInput {
  book_id: number;
  member_id: number;
  due_at?: string | null;
}
