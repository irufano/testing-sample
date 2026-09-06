// Direct-to-backend setup helpers used by e2e specs to seed data faster than
// driving the UI, and to reach states the UI alone can't (e.g. a borrowing
// history needed to exercise a delete guard). Specs still drive every
// user-facing assertion through the browser — these never replace that.
import type { APIRequestContext } from "@playwright/test";
import type { BaseResponse, Book, BookInput, Borrowing, Member, MemberInput } from "../src/api/types";

export const API_BASE_URL = "http://localhost:8000/api/v1";

/** A value unique to this call, so parallel test data never collides with seed data or other tests. */
export function unique(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function unwrap<T>(response: { json(): Promise<unknown>; ok(): boolean; status(): number }): Promise<T> {
  const body = (await response.json()) as BaseResponse<T>;
  if (body.status !== "success" || body.data === null) {
    throw new Error(`API setup call failed (${response.status()}): ${body.info.message}`);
  }
  return body.data;
}

export async function apiCreateBook(request: APIRequestContext, overrides: Partial<BookInput> = {}): Promise<Book> {
  const payload: BookInput = {
    title: unique("E2E Book"),
    author: "E2E Author",
    isbn: unique("978-E2E"),
    category: "E2E Fixtures",
    total_copies: 3,
    ...overrides,
  };
  const response = await request.post(`${API_BASE_URL}/books`, { data: payload });
  return unwrap<Book>(response);
}

export async function apiCreateMember(request: APIRequestContext, overrides: Partial<MemberInput> = {}): Promise<Member> {
  const payload: MemberInput = {
    name: unique("E2E Member"),
    email: `${unique("e2e")}@example.com`,
    status: "active",
    ...overrides,
  };
  const response = await request.post(`${API_BASE_URL}/members`, { data: payload });
  return unwrap<Member>(response);
}

export async function apiCreateBorrowing(request: APIRequestContext, bookId: number, memberId: number): Promise<Borrowing> {
  const response = await request.post(`${API_BASE_URL}/borrowings`, {
    data: { book_id: bookId, member_id: memberId },
  });
  return unwrap<Borrowing>(response);
}

export async function apiReturnBorrowing(request: APIRequestContext, borrowingId: number): Promise<Borrowing> {
  const response = await request.post(`${API_BASE_URL}/borrowings/${borrowingId}/return`);
  return unwrap<Borrowing>(response);
}
