// Factories + envelope helpers for tests. Keep these dumb (no business logic)
// so tests assert against the app's behavior, not a re-implementation of it.
import type {
  ApiInfo,
  BaseResponse,
  Book,
  Borrowing,
  Member,
  PaginatedData,
  Pagination,
} from "../api/types";

export const API_BASE_URL = "http://localhost:8000/api/v1";

export function ok<T>(data: T, code = 200): BaseResponse<T> {
  return { status: "success", info: { code, message: "OK", stacktrace: null }, data };
}

export function fail(message: string, code = 400): BaseResponse<null> {
  const info: ApiInfo = { code, message, stacktrace: null };
  return { status: "error", info, data: null };
}

export function pagination(overrides: Partial<Pagination> = {}): Pagination {
  return { page: 1, limit: 10, total: 1, total_pages: 1, ...overrides };
}

export function paginated<T>(items: T[], overrides: Partial<Pagination> = {}): PaginatedData<T> {
  return { items, pagination: pagination({ total: items.length, ...overrides }) };
}

export function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 1,
    title: "The Pragmatic Programmer",
    author: "David Thomas",
    isbn: "978-0135957059",
    category: "Software Engineering",
    description: "From journeyman to master.",
    total_copies: 3,
    available_copies: 2,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 1,
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: null,
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeBorrowing(overrides: Partial<Borrowing> = {}): Borrowing {
  const book = overrides.book ?? makeBook();
  const member = overrides.member ?? makeMember();
  return {
    id: 1,
    book_id: book.id,
    member_id: member.id,
    borrowed_at: "2026-01-01T00:00:00Z",
    due_at: "2026-01-15T00:00:00Z",
    returned_at: null,
    status: "borrowed",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    book,
    member,
    ...overrides,
  };
}
