import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { API_BASE_URL, fail, makeBook, makeBorrowing, makeMember, ok, paginated } from "../test/fixtures";
import { server } from "../test/msw/server";
import BorrowingsPage from "./BorrowingsPage";

const BORROWINGS_URL = `${API_BASE_URL}/borrowings`;
const BOOKS_URL = `${API_BASE_URL}/books`;
const MEMBERS_URL = `${API_BASE_URL}/members`;

function mockBorrowingsList(borrowings = [makeBorrowing()]) {
  server.use(http.get(BORROWINGS_URL, () => HttpResponse.json(ok(paginated(borrowings)))));
}

describe("BorrowingsPage", () => {
  it("lists borrowings with formatted dates, status badge, and Return only while borrowed", async () => {
    mockBorrowingsList([
      makeBorrowing({ id: 1, status: "borrowed", borrowed_at: "2026-01-05T00:00:00Z", due_at: "2026-01-19T00:00:00Z", returned_at: null }),
    ]);
    render(<BorrowingsPage />);

    expect(await screen.findByText("Jan 5, 2026")).toBeInTheDocument();
    expect(screen.getByText("Jan 19, 2026")).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(1); // returned_at
    expect(screen.getByRole("button", { name: "Return" })).toBeInTheDocument();
  });

  it("hides the Return button for an already-returned borrowing", async () => {
    mockBorrowingsList([makeBorrowing({ status: "returned", returned_at: "2026-01-10T00:00:00Z" })]);
    render(<BorrowingsPage />);
    await screen.findByText("Jan 10, 2026");
    expect(screen.queryByRole("button", { name: "Return" })).not.toBeInTheDocument();
  });

  it("filters by status", async () => {
    let capturedUrl: URL | undefined;
    server.use(
      http.get(BORROWINGS_URL, ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json(ok(paginated([makeBorrowing()])));
      }),
    );
    render(<BorrowingsPage />);
    await screen.findByText(makeBorrowing().book.title);

    await userEvent.setup().selectOptions(screen.getByDisplayValue("All statuses"), "overdue");
    await waitFor(() => expect(capturedUrl?.searchParams.get("status")).toBe("overdue"));
  });

  it("returns a book and refreshes the row to returned", async () => {
    const user = userEvent.setup();
    let returned = false;
    server.use(
      http.get(BORROWINGS_URL, () =>
        HttpResponse.json(
          ok(paginated([makeBorrowing({ id: 3, status: returned ? "returned" : "borrowed", returned_at: returned ? "2026-02-01T00:00:00Z" : null })])),
        ),
      ),
      http.post(`${BORROWINGS_URL}/3/return`, () => {
        returned = true;
        return HttpResponse.json(ok(makeBorrowing({ id: 3, status: "returned", returned_at: "2026-02-01T00:00:00Z" })));
      }),
    );

    render(<BorrowingsPage />);
    await screen.findByRole("button", { name: "Return" });
    await user.click(screen.getByRole("button", { name: "Return" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: "Return" })).not.toBeInTheDocument());
    expect(await screen.findByText("Feb 1, 2026")).toBeInTheDocument();
  });

  it("shows a return error banner and leaves the borrowing untouched", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(BORROWINGS_URL, () => HttpResponse.json(ok(paginated([makeBorrowing({ id: 3 })])))),
      http.post(`${BORROWINGS_URL}/3/return`, () =>
        HttpResponse.json(fail("Borrowing is already returned.", 409), { status: 409 }),
      ),
    );

    render(<BorrowingsPage />);
    await user.click(await screen.findByRole("button", { name: "Return" }));

    expect(await screen.findByText("Borrowing is already returned.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Return" })).toBeInTheDocument();
  });

  describe("Borrow a Book modal", () => {
    function mockOptions(books = [makeBook({ id: 1, available_copies: 2 })], members = [makeMember({ id: 1 })]) {
      server.use(
        http.get(BOOKS_URL, () => HttpResponse.json(ok(paginated(books)))),
        http.get(MEMBERS_URL, () => HttpResponse.json(ok(paginated(members)))),
      );
    }

    it("only offers books with copies available and disables submit when none qualify", async () => {
      const user = userEvent.setup();
      mockBorrowingsList([]);
      mockOptions([], []);

      render(<BorrowingsPage />);
      await screen.findByText("No borrowings found.");
      await user.click(screen.getByRole("button", { name: "+ Borrow a Book" }));

      expect(await screen.findByText("No books available")).toBeInTheDocument();
      expect(screen.getByText("No active members")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Borrow" })).toBeDisabled();
    });

    it("submits a borrow with the selected book/member and a null due date by default", async () => {
      const user = userEvent.setup();
      mockBorrowingsList([]);
      mockOptions();
      let capturedBody: Record<string, unknown> | undefined;
      server.use(
        http.post(BORROWINGS_URL, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(ok(makeBorrowing({ id: 9 })), { status: 201 });
        }),
      );

      render(<BorrowingsPage />);
      await user.click(await screen.findByRole("button", { name: "+ Borrow a Book" }));
      await screen.findByText(/Select a book/);

      await user.selectOptions(screen.getByLabelText("Book"), String(makeBook().id));
      await user.selectOptions(screen.getByLabelText("Member"), String(makeMember().id));
      await user.click(screen.getByRole("button", { name: "Borrow" }));

      await waitFor(() => expect(capturedBody).toBeDefined());
      expect(capturedBody).toEqual({ book_id: 1, member_id: 1, due_at: null });
      expect(screen.queryByRole("heading", { name: "Borrow a Book" })).not.toBeInTheDocument();
    });

    it("sends an explicit due date as an ISO string", async () => {
      const user = userEvent.setup();
      mockBorrowingsList([]);
      mockOptions();
      let capturedBody: Record<string, unknown> | undefined;
      server.use(
        http.post(BORROWINGS_URL, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(ok(makeBorrowing({ id: 9 })), { status: 201 });
        }),
      );

      render(<BorrowingsPage />);
      await user.click(await screen.findByRole("button", { name: "+ Borrow a Book" }));
      await screen.findByText(/Select a book/);

      await user.selectOptions(screen.getByLabelText("Book"), String(makeBook().id));
      await user.selectOptions(screen.getByLabelText("Member"), String(makeMember().id));
      await user.type(screen.getByLabelText(/Due date/), "2026-03-01");
      await user.click(screen.getByRole("button", { name: "Borrow" }));

      await waitFor(() => expect(capturedBody?.due_at).toBe("2026-03-01T00:00:00.000Z"));
    });

    it("shows the API's error when borrowing fails and keeps the modal open", async () => {
      const user = userEvent.setup();
      mockBorrowingsList([]);
      mockOptions();
      server.use(
        http.post(BORROWINGS_URL, () =>
          HttpResponse.json(fail("This book has no copies available.", 422), { status: 422 }),
        ),
      );

      render(<BorrowingsPage />);
      await user.click(await screen.findByRole("button", { name: "+ Borrow a Book" }));
      await screen.findByText(/Select a book/);

      await user.selectOptions(screen.getByLabelText("Book"), String(makeBook().id));
      await user.selectOptions(screen.getByLabelText("Member"), String(makeMember().id));
      await user.click(screen.getByRole("button", { name: "Borrow" }));

      expect(await screen.findByText("This book has no copies available.")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Borrow a Book" })).toBeInTheDocument();
    });

    it("shows the options-loading error when books/members fail to load", async () => {
      const user = userEvent.setup();
      mockBorrowingsList([]);
      server.use(
        http.get(BOOKS_URL, () => HttpResponse.json(fail("Failed to load books.", 500), { status: 500 })),
        http.get(MEMBERS_URL, () => HttpResponse.json(ok(paginated([])))),
      );

      render(<BorrowingsPage />);
      await user.click(await screen.findByRole("button", { name: "+ Borrow a Book" }));
      expect(await screen.findByText("Failed to load books.")).toBeInTheDocument();
    });
  });
});
