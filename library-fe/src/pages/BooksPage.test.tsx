import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { API_BASE_URL, fail, makeBook, ok, paginated } from "../test/fixtures";
import { server } from "../test/msw/server";
import BooksPage from "./BooksPage";

const BOOKS_URL = `${API_BASE_URL}/books`;

function mockBooksList(books = [makeBook()], overrides = {}) {
  server.use(http.get(BOOKS_URL, () => HttpResponse.json(ok(paginated(books, overrides)))));
}

describe("BooksPage", () => {
  it("shows a loading state, then the fetched books", async () => {
    mockBooksList([makeBook({ title: "Dune", author: "Frank Herbert" })]);
    render(<BooksPage />);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(await screen.findByText("Dune")).toBeInTheDocument();
    expect(screen.getByText("Frank Herbert")).toBeInTheDocument();
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
  });

  it("shows the empty state when there are no books", async () => {
    mockBooksList([]);
    render(<BooksPage />);
    expect(await screen.findByText("No books found.")).toBeInTheDocument();
  });

  it("shows the backend's error message (never a stacktrace) and recovers via Retry", async () => {
    let attempt = 0;
    server.use(
      http.get(BOOKS_URL, () => {
        attempt += 1;
        if (attempt === 1) {
          return HttpResponse.json(
            { status: "error", info: { code: 500, message: "Internal Server Error", stacktrace: "at db.query(...)" } },
            { status: 500 },
          );
        }
        return HttpResponse.json(ok(paginated([makeBook({ title: "Dune" })])));
      }),
    );

    render(<BooksPage />);
    expect(await screen.findByText("Internal Server Error")).toBeInTheDocument();
    expect(screen.queryByText(/at db\.query/)).not.toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Dune")).toBeInTheDocument();
  });

  it("renders a book title containing markup as inert text, never as HTML", async () => {
    const maliciousTitle = '<img src=x onerror="window.__pwned = true">';
    mockBooksList([makeBook({ title: maliciousTitle })]);
    render(<BooksPage />);

    const cell = await screen.findByText(maliciousTitle);
    expect(cell.tagName).toBe("TD");
    expect(cell.querySelector("img")).toBeNull();
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined();
  });

  it("debounces search input and sends it as a query param, resetting to page 1", async () => {
    const user = userEvent.setup();
    let capturedUrl: URL | undefined;
    let requestCount = 0;
    server.use(
      http.get(BOOKS_URL, ({ request }) => {
        requestCount += 1;
        capturedUrl = new URL(request.url);
        return HttpResponse.json(ok(paginated([makeBook()])));
      }),
    );

    render(<BooksPage />);
    await waitFor(() => expect(requestCount).toBe(1));

    await user.type(screen.getByPlaceholderText("Search by title, author or ISBN…"), "dune");
    // Still just the one mount-time request — the 350ms debounce hasn't elapsed yet.
    expect(requestCount).toBe(1);

    await waitFor(() => expect(capturedUrl?.searchParams.get("search")).toBe("dune"), { timeout: 2000 });
    expect(capturedUrl?.searchParams.get("page")).toBe("1");
  });

  it("sends the category filter and resets to page 1", async () => {
    let capturedUrl: URL | undefined;
    server.use(
      http.get(BOOKS_URL, ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json(ok(paginated([makeBook()])));
      }),
    );

    render(<BooksPage />);
    await screen.findByText(makeBook().title);

    await userEvent.setup().type(screen.getByPlaceholderText("Filter by category…"), "Sci-Fi");
    await waitFor(() => expect(capturedUrl?.searchParams.get("category")).toBe("Sci-Fi"));
  });

  it("requests the next page when Next is clicked", async () => {
    const user = userEvent.setup();
    let capturedUrl: URL | undefined;
    server.use(
      http.get(BOOKS_URL, ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json(ok(paginated([makeBook()], { page: 1, total: 25, total_pages: 3 })));
      }),
    );

    render(<BooksPage />);
    await screen.findByText("Page 1 of 3 (25 total)");

    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(capturedUrl?.searchParams.get("page")).toBe("2"));
  });

  it("deletes a book after confirmation and refreshes the list", async () => {
    const user = userEvent.setup();
    const book = makeBook({ id: 7, title: "Dune" });
    let deleteCalled = false;
    server.use(
      http.get(BOOKS_URL, () =>
        HttpResponse.json(ok(paginated(deleteCalled ? [] : [book]))),
      ),
      http.delete(`${BOOKS_URL}/7`, () => {
        deleteCalled = true;
        return HttpResponse.json(ok(null));
      }),
    );

    render(<BooksPage />);
    await screen.findByText("Dune");

    await user.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("heading", { name: "Delete Book" }).closest(".modal-panel") as HTMLElement;
    expect(within(dialog).getByText(/Are you sure you want to delete "Dune"/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("heading", { name: "Delete Book" })).not.toBeInTheDocument());
    expect(await screen.findByText("No books found.")).toBeInTheDocument();
  });

  it("shows a delete-guard error inside the dialog and keeps it open", async () => {
    const user = userEvent.setup();
    const book = makeBook({ id: 7, title: "Dune" });
    server.use(
      http.get(BOOKS_URL, () => HttpResponse.json(ok(paginated([book])))),
      http.delete(`${BOOKS_URL}/7`, () =>
        HttpResponse.json(fail("Cannot delete a book with borrowing history.", 409), { status: 409 }),
      ),
    );

    render(<BooksPage />);
    await screen.findByText("Dune");
    await user.click(screen.getByRole("button", { name: "Delete" }));

    const dialog = screen.getByRole("heading", { name: "Delete Book" }).closest(".modal-panel") as HTMLElement;
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(await within(dialog).findByText("Cannot delete a book with borrowing history.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Delete Book" })).toBeInTheDocument();
  });

  it("creates a book through the Add Book modal and refreshes the list", async () => {
    const user = userEvent.setup();
    let created = false;
    server.use(
      http.get(BOOKS_URL, () =>
        HttpResponse.json(ok(paginated(created ? [makeBook({ title: "New Arrival" })] : []))),
      ),
      http.post(BOOKS_URL, async ({ request }) => {
        created = true;
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(ok(makeBook({ id: 42, title: body.title as string })), { status: 201 });
      }),
    );

    render(<BooksPage />);
    await screen.findByText("No books found.");

    await user.click(screen.getByRole("button", { name: "+ Add Book" }));
    await user.type(screen.getByLabelText("Title"), "New Arrival");
    await user.type(screen.getByLabelText("Author"), "Someone");
    await user.type(screen.getByLabelText("ISBN"), "123");
    await user.type(screen.getByLabelText("Category"), "Fiction");
    await user.click(screen.getByRole("button", { name: "Create book" }));

    await waitFor(() => expect(screen.queryByRole("heading", { name: "Add Book" })).not.toBeInTheDocument());
    expect(await screen.findByText("New Arrival")).toBeInTheDocument();
  });
});
