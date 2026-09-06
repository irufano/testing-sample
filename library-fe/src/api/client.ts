import type { BaseResponse } from "./types";

export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

/**
 * Raised whenever the API responds with `status: "error"` (or the request
 * fails outright). Carries the same `code`/`message` the backend returned so
 * the UI can surface `info.message` directly (never `stacktrace`).
 */
export class ApiError extends Error {
  code: number;

  constructor(message: string, code: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  // Left as `object` (rather than Record<string, ...>) so callers can pass their own
  // narrowly-typed params interfaces (e.g. ListBooksParams) without an index signature.
  params?: object;
}

function buildUrl(path: string, params?: object): string {
  const url = new URL(API_BASE_URL.replace(/\/$/, "") + path);
  if (params) {
    for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, params } = options;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Unable to reach the server. Please check your connection.", 0);
  }

  let payload: BaseResponse<T> | null = null;
  try {
    payload = await response.json();
  } catch {
    // fall through with payload = null
  }

  if (!payload) {
    throw new ApiError("Received an unexpected response from the server.", response.status);
  }

  if (payload.status === "error") {
    throw new ApiError(payload.info.message, payload.info.code);
  }

  return payload.data as T;
}
