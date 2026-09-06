import { expect, test } from "@playwright/test";
import { apiCreateBook, apiCreateBorrowing, apiCreateMember, unique } from "./api-helpers";

test.describe("Members", () => {
  test("shows created members and an empty state for a non-matching search", async ({ page, request }) => {
    const member = await apiCreateMember(request, { name: unique("Ada Lovelace") });
    await page.goto("/members");

    await page.getByPlaceholder("Search by name or email…").fill(member.name);
    await expect(page.getByRole("row", { name: new RegExp(member.name) })).toBeVisible();

    await page.getByPlaceholder("Search by name or email…").fill(unique("no-such-member"));
    await expect(page.getByText("No members found.")).toBeVisible();
  });

  test("filters by status", async ({ page, request }) => {
    const active = await apiCreateMember(request, { name: unique("Active Member"), status: "active" });
    const suspended = await apiCreateMember(request, { name: unique("Suspended Member"), status: "suspended" });
    await page.goto("/members");

    // The status <select> has no accessible label of its own (see MembersPage.tsx); target it
    // structurally instead.
    await page.locator("select.search-input").selectOption("suspended");

    await expect(page.getByRole("row", { name: new RegExp(suspended.name) })).toBeVisible();
    await expect(page.getByRole("row", { name: new RegExp(active.name) })).not.toBeVisible();
  });

  test("creates a member through the modal", async ({ page }) => {
    const name = unique("Grace Hopper");
    const email = `${unique("grace")}@example.com`;
    await page.goto("/members");

    await page.getByRole("button", { name: "+ Add Member" }).click();
    await expect(page.getByRole("heading", { name: "Add Member" })).toBeVisible();
    await page.getByLabel("Name").fill(name);
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Create member" }).click();

    await expect(page.getByRole("heading", { name: "Add Member" })).not.toBeVisible();
    await page.getByPlaceholder("Search by name or email…").fill(name);
    await expect(page.getByRole("row", { name: new RegExp(name) })).toBeVisible();
  });

  test("shows a conflict error for a duplicate email and keeps the modal open", async ({ page, request }) => {
    const existing = await apiCreateMember(request);
    await page.goto("/members");

    await page.getByRole("button", { name: "+ Add Member" }).click();
    await page.getByLabel("Name").fill(unique("Someone Else"));
    await page.getByLabel("Email").fill(existing.email);
    await page.getByRole("button", { name: "Create member" }).click();

    await expect(page.getByText("Member email already exists")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Add Member" })).toBeVisible();
  });

  test("edits a member and the row reflects the change", async ({ page, request }) => {
    const member = await apiCreateMember(request, { name: unique("Old Name") });
    const newName = unique("New Name");
    await page.goto("/members");
    await page.getByPlaceholder("Search by name or email…").fill(member.name);

    const row = page.getByRole("row", { name: new RegExp(member.name) });
    await row.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByRole("heading", { name: "Edit Member" })).toBeVisible();

    await page.getByLabel("Name").fill(newName);
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByRole("heading", { name: "Edit Member" })).not.toBeVisible();
    await page.getByPlaceholder("Search by name or email…").fill(newName);
    await expect(page.getByRole("row", { name: new RegExp(newName) })).toBeVisible();
  });

  test("deletes a member after confirmation", async ({ page, request }) => {
    const member = await apiCreateMember(request, { name: unique("Disposable Member") });
    await page.goto("/members");
    await page.getByPlaceholder("Search by name or email…").fill(member.name);

    const row = page.getByRole("row", { name: new RegExp(member.name) });
    await row.getByRole("button", { name: "Delete" }).click();

    const dialog = page.locator(".modal-panel", { has: page.getByRole("heading", { name: "Delete Member" }) });
    await expect(dialog.getByText(new RegExp(`delete "${member.name}"`))).toBeVisible();
    await dialog.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByRole("heading", { name: "Delete Member" })).not.toBeVisible();
    await expect(page.getByText("No members found.")).toBeVisible();
  });

  test("blocks deleting a member with an active borrowing", async ({ page, request }) => {
    const member = await apiCreateMember(request, { name: unique("Busy Member") });
    const book = await apiCreateBook(request);
    await apiCreateBorrowing(request, book.id, member.id);

    await page.goto("/members");
    await page.getByPlaceholder("Search by name or email…").fill(member.name);
    const row = page.getByRole("row", { name: new RegExp(member.name) });
    await row.getByRole("button", { name: "Delete" }).click();

    const dialog = page.locator(".modal-panel", { has: page.getByRole("heading", { name: "Delete Member" }) });
    await dialog.getByRole("button", { name: "Delete" }).click();

    await expect(dialog.getByText("Cannot delete a member with active borrowings")).toBeVisible();
  });
});
