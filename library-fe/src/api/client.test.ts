import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../test/msw/server";
import { fail, ok } from "../test/fixtures";
import { ApiError, request } from "./client";

const BASE = "http://localhost:8000/api/v1";

describe("request()", () => {
  it("resolves with `data` on a success envelope", async () => {
    server.use(http.get(`${BASE}/books/1`, () => HttpResponse.json(ok({ id: 1, title: "Dune" }))));

    await expect(request<{ id: number; title: string }>("/books/1")).resolves.toEqual({
      id: 1,
      title: "Dune",
    });
  });

  it("sends query params, dropping undefined/null/empty-string values", async () => {
    let capturedUrl: URL | undefined;
    server.use(
      http.get(`${BASE}/books`, ({ request: req }) => {
        capturedUrl = new URL(req.url);
        return HttpResponse.json(ok({ items: [] }));
      }),
    );

    await request("/books", {
      params: { search: "dune", category: undefined, status: null, extra: "" as unknown as string, page: 2 },
    });

    expect(capturedUrl?.searchParams.get("search")).toBe("dune");
    expect(capturedUrl?.searchParams.get("page")).toBe("2");
    expect(capturedUrl?.searchParams.has("category")).toBe(false);
    expect(capturedUrl?.searchParams.has("status")).toBe(false);
    expect(capturedUrl?.searchParams.has("extra")).toBe(false);
  });

  it("sends a JSON body and Content-Type header for mutating requests", async () => {
    let receivedBody: unknown;
    let receivedContentType: string | null = null;
    server.use(
      http.post(`${BASE}/books`, async ({ request: req }) => {
        receivedContentType = req.headers.get("content-type");
        receivedBody = await req.json();
        return HttpResponse.json(ok({ id: 9 }), { status: 201 });
      }),
    );

    await request("/books", { method: "POST", body: { title: "Dune" } });

    expect(receivedContentType).toBe("application/json");
    expect(receivedBody).toEqual({ title: "Dune" });
  });

  it("throws ApiError with the envelope's message/code on a business error", async () => {
    server.use(
      http.get(`${BASE}/books/999`, () => HttpResponse.json(fail("Book not found", 404), { status: 404 })),
    );

    const error = await request("/books/999").catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: "Book not found", code: 404 });
  });

  it("never surfaces stacktrace even when the backend includes one", async () => {
    server.use(
      http.get(`${BASE}/books/1`, () =>
        HttpResponse.json(
          { status: "error", info: { code: 500, message: "Internal Server Error", stacktrace: "Traceback…leaked secret" } },
          { status: 500 },
        ),
      ),
    );

    const error = (await request("/books/1").catch((err: unknown) => err)) as ApiError;
    expect(error.message).toBe("Internal Server Error");
    expect(error.message).not.toContain("Traceback");
  });

  it("throws a connectivity ApiError when the network request fails outright", async () => {
    server.use(http.get(`${BASE}/books`, () => HttpResponse.error()));

    const error = (await request("/books").catch((err: unknown) => err)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe("Unable to reach the server. Please check your connection.");
    expect(error.code).toBe(0);
  });

  it("throws a generic ApiError when the response body isn't valid JSON", async () => {
    server.use(http.get(`${BASE}/books`, () => new HttpResponse("<html>not json</html>", { status: 502 })));

    const error = (await request("/books").catch((err: unknown) => err)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe("Received an unexpected response from the server.");
    expect(error.code).toBe(502);
  });
});
