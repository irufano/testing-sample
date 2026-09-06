import { request } from "./client";
import type { Book, BookInput, PaginatedData } from "./types";

export interface ListBooksParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}

export function listBooks(params: ListBooksParams = {}): Promise<PaginatedData<Book>> {
  return request<PaginatedData<Book>>("/books", { params });
}

export function getBook(id: number): Promise<Book> {
  return request<Book>(`/books/${id}`);
}

export function createBook(input: BookInput): Promise<Book> {
  return request<Book>("/books", { method: "POST", body: input });
}

export function updateBook(id: number, input: Partial<BookInput>): Promise<Book> {
  return request<Book>(`/books/${id}`, { method: "PUT", body: input });
}

export function deleteBook(id: number): Promise<null> {
  return request<null>(`/books/${id}`, { method: "DELETE" });
}
