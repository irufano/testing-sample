import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { API_BASE_URL, fail, makeMember, ok, paginated } from "../test/fixtures";
import { server } from "../test/msw/server";
import MembersPage from "./MembersPage";

const MEMBERS_URL = `${API_BASE_URL}/members`;

describe("MembersPage", () => {
  it("shows the fetched members with their status badge", async () => {
    server.use(
      http.get(MEMBERS_URL, () => HttpResponse.json(ok(paginated([makeMember({ name: "Ada Lovelace", status: "suspended" })])))),
    );
    render(<MembersPage />);

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("suspended")).toHaveClass("badge-bad");
  });

  it("shows — for a member with no phone number", async () => {
    server.use(http.get(MEMBERS_URL, () => HttpResponse.json(ok(paginated([makeMember({ phone: null })])))));
    render(<MembersPage />);
    await screen.findByText(makeMember().name);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("filters by status and resets to page 1", async () => {
    let capturedUrl: URL | undefined;
    server.use(
      http.get(MEMBERS_URL, ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json(ok(paginated([makeMember()])));
      }),
    );

    render(<MembersPage />);
    await screen.findByText(makeMember().name);

    await userEvent.setup().selectOptions(screen.getByDisplayValue("All statuses"), "suspended");
    await waitFor(() => expect(capturedUrl?.searchParams.get("status")).toBe("suspended"));
    expect(capturedUrl?.searchParams.get("page")).toBe("1");
  });

  it("debounces the search box and sends it as a query param", async () => {
    const user = userEvent.setup();
    let capturedUrl: URL | undefined;
    let requestCount = 0;
    server.use(
      http.get(MEMBERS_URL, ({ request }) => {
        requestCount += 1;
        capturedUrl = new URL(request.url);
        return HttpResponse.json(ok(paginated([makeMember()])));
      }),
    );

    render(<MembersPage />);
    await waitFor(() => expect(requestCount).toBe(1));

    await user.type(screen.getByPlaceholderText("Search by name or email…"), "ada");
    expect(requestCount).toBe(1);

    await waitFor(() => expect(capturedUrl?.searchParams.get("search")).toBe("ada"), { timeout: 2000 });
  });

  it("never renders a stacktrace even when the backend error includes one", async () => {
    server.use(
      http.get(MEMBERS_URL, () =>
        HttpResponse.json(
          { status: "error", info: { code: 500, message: "Internal Server Error", stacktrace: "File \"repo.py\", line 42" } },
          { status: 500 },
        ),
      ),
    );
    render(<MembersPage />);

    expect(await screen.findByText("Internal Server Error")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("repo.py");
  });

  it("edits a member and refreshes the row", async () => {
    const user = userEvent.setup();
    let member = makeMember({ id: 2, name: "Ada Lovelace" });
    server.use(
      http.get(MEMBERS_URL, () => HttpResponse.json(ok(paginated([member])))),
      http.put(`${MEMBERS_URL}/2`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        member = { ...member, name: body.name as string };
        return HttpResponse.json(ok(member));
      }),
    );

    render(<MembersPage />);
    await screen.findByText("Ada Lovelace");
    await user.click(screen.getByRole("button", { name: "Edit" }));

    const nameInput = screen.getByLabelText("Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Ada Byron");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(screen.queryByRole("heading", { name: "Edit Member" })).not.toBeInTheDocument());
    expect(await screen.findByText("Ada Byron")).toBeInTheDocument();
  });

  it("shows a delete-guard conflict from the API and keeps the dialog open", async () => {
    const user = userEvent.setup();
    const member = makeMember({ id: 2, name: "Ada Lovelace" });
    server.use(
      http.get(MEMBERS_URL, () => HttpResponse.json(ok(paginated([member])))),
      http.delete(`${MEMBERS_URL}/2`, () =>
        HttpResponse.json(fail("Cannot delete a member with borrowing history.", 409), { status: 409 }),
      ),
    );

    render(<MembersPage />);
    await screen.findByText("Ada Lovelace");
    await user.click(screen.getByRole("button", { name: "Delete" }));

    const dialog = screen.getByRole("heading", { name: "Delete Member" }).closest(".modal-panel") as HTMLElement;
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(await within(dialog).findByText("Cannot delete a member with borrowing history.")).toBeInTheDocument();
  });
});
