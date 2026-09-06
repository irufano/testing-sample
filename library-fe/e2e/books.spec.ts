import { expect, test } from "@playwright/test";
import { apiCreateBook, apiCreateBorrowing, apiCreateMember, unique } from "./api-helpers";

test.describe("Books", () => {
  test("redirects \"/\" to /books and lists the seeded catalog", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/books$/);
    await expect(page.getByRole("heading", { name: "Books" })).toBeVisible();
    await expect(page.getByRole("row", { name: /Clean Code/ })).toBeVisible();
  });

  test("searches by title and narrows the list", async ({ page, request }) => {
    const book = await apiCreateBook(request, { title: unique("Dune Chronicles") });
    await page.goto("/books");
    await expect(page.getByRole("row", { name: /Clean Code/ })).toBeVisible();

    await page.getByPlaceholder("Search by title, author or ISBN…").fill(book.title);
    await expect(page.getByRole("row", { name: new RegExp(book.title) })).toBeVisible();
    await expect(page.getByRole("row", { name: /Clean Code/ })).not.toBeVisible();
  });

  test("filters by category", async ({ page }) => {
    await page.goto("/books");
    await page.getByPlaceholder("Filter by category…").fill("Programming");

    await expect(page.getByRole("row", { name: /Clean Code/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /Refactoring/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /Design Patterns/ })).not.toBeVisible();

    await page.getByPlaceholder("Filter by category…").fill(unique("no-such-category"));
    await expect(page.getByText("No books found.")).toBeVisible();
  });

  test("creates a book through the modal", async ({ page }) => {
    const title = unique("The Hobbit E2E");
    await page.goto("/books");

    await page.getByRole("button", { name: "+ Add Book" }).click();
    await expect(page.getByRole("heading", { name: "Add Book" })).toBeVisible();
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Author").fill("J.R.R. Tolkien");
    await page.getByLabel("ISBN").fill(unique("978-e2e"));
    await page.getByLabel("Category").fill("Fantasy");
    await page.getByLabel("Total copies").fill("2");
    await page.getByRole("button", { name: "Create book" }).click();

    await expect(page.getByRole("heading", { name: "Add Book" })).not.toBeVisible();
    await page.getByPlaceholder("Search by title, author or ISBN…").fill(title);
    await expect(page.getByRole("row", { name: new RegExp(title) })).toBeVisible();
  });

  test("shows a conflict error for a duplicate ISBN and keeps the modal open", async ({ page, request }) => {
    const existing = await apiCreateBook(request);
    await page.goto("/books");

    await page.getByRole("button", { name: "+ Add Book" }).click();
    await page.getByLabel("Title").fill(unique("Another Title"));
    await page.getByLabel("Author").fill("Someone");
    await page.getByLabel("ISBN").fill(existing.isbn);
    await page.getByLabel("Category").fill("Fiction");
    await page.getByLabel("Total copies").fill("1");
    await page.getByRole("button", { name: "Create book" }).click();

    await expect(page.getByText("ISBN already exists")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Add Book" })).toBeVisible();
  });

  test("edits a book and the row reflects the change", async ({ page, request }) => {
    const book = await apiCreateBook(request, { title: unique("Old Title") });
    const newTitle = unique("Updated Title");
    await page.goto("/books");
    await page.getByPlaceholder("Search by title, author or ISBN…").fill(book.title);

    const row = page.getByRole("row", { name: new RegExp(book.title) });
    await row.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByRole("heading", { name: "Edit Book" })).toBeVisible();

    const titleInput = page.getByLabel("Title");
    await titleInput.fill(newTitle);
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByRole("heading", { name: "Edit Book" })).not.toBeVisible();
    await page.getByPlaceholder("Search by title, author or ISBN…").fill(newTitle);
    await expect(page.getByRole("row", { name: new RegExp(newTitle) })).toBeVisible();
  });

  test("deletes a book after confirmation", async ({ page, request }) => {
    const book = await apiCreateBook(request, { title: unique("Disposable Book") });
    await page.goto("/books");
    await page.getByPlaceholder("Search by title, author or ISBN…").fill(book.title);

    const row = page.getByRole("row", { name: new RegExp(book.title) });
    await row.getByRole("button", { name: "Delete" }).click();

    const dialog = page.locator(".modal-panel", { has: page.getByRole("heading", { name: "Delete Book" }) });
    await expect(dialog.getByText(new RegExp(`delete "${book.title}"`))).toBeVisible();
    await dialog.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByRole("heading", { name: "Delete Book" })).not.toBeVisible();
    await expect(page.getByText("No books found.")).toBeVisible();
  });

  test("blocks deleting a book with an active borrowing", async ({ page, request }) => {
    const book = await apiCreateBook(request, { title: unique("On Loan Book") });
    const member = await apiCreateMember(request);
    await apiCreateBorrowing(request, book.id, member.id);

    await page.goto("/books");
    await page.getByPlaceholder("Search by title, author or ISBN…").fill(book.title);
    const row = page.getByRole("row", { name: new RegExp(book.title) });
    await row.getByRole("button", { name: "Delete" }).click();

    const dialog = page.locator(".modal-panel", { has: page.getByRole("heading", { name: "Delete Book" }) });
    await dialog.getByRole("button", { name: "Delete" }).click();

    await expect(dialog.getByText("Cannot delete a book with active borrowings")).toBeVisible();
  });

  test("renders a book title containing markup as inert text, never as HTML", async ({ page, request }) => {
    const marker = unique("xss-book");
    const maliciousTitle = `${marker} <img src=x onerror="window.__e2ePwned = true">`;
    await apiCreateBook(request, { title: maliciousTitle });

    await page.goto("/books");
    await page.getByPlaceholder("Search by title, author or ISBN…").fill(marker);

    const cell = page.getByText(maliciousTitle, { exact: true });
    await expect(cell).toBeVisible();
    await expect(page.locator("img[src='x']")).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __e2ePwned?: boolean }).__e2ePwned)).toBeUndefined();
  });
});
