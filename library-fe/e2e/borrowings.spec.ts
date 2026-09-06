import { expect, test } from "@playwright/test";
import { apiCreateBook, apiCreateBorrowing, apiCreateMember, apiReturnBorrowing, unique } from "./api-helpers";

test.describe("Borrowings", () => {
  test("lists a freshly created borrowing with a Return action", async ({ page, request }) => {
    const book = await apiCreateBook(request, { title: unique("Borrowings List Book") });
    const member = await apiCreateMember(request, { name: unique("Borrowings List Member") });
    await apiCreateBorrowing(request, book.id, member.id);

    await page.goto("/borrowings");
    const row = page.getByRole("row", { name: new RegExp(book.title) });
    await expect(row).toBeVisible();
    await expect(row).toContainText(member.name);
    await expect(row.getByRole("button", { name: "Return" })).toBeVisible();
  });

  test("filters by status", async ({ page, request }) => {
    const activeBook = await apiCreateBook(request, { title: unique("Still Borrowed Book") });
    const activeMember = await apiCreateMember(request, { name: unique("Still Borrowed Member") });
    await apiCreateBorrowing(request, activeBook.id, activeMember.id);

    const returnedBook = await apiCreateBook(request, { title: unique("Returned Book") });
    const returnedMember = await apiCreateMember(request, { name: unique("Returned Member") });
    const returnedBorrowing = await apiCreateBorrowing(request, returnedBook.id, returnedMember.id);
    await apiReturnBorrowing(request, returnedBorrowing.id);

    await page.goto("/borrowings");
    await page.locator("select.search-input").selectOption("returned");
    await expect(page.getByRole("row", { name: new RegExp(returnedBook.title) })).toBeVisible();
    await expect(page.getByRole("row", { name: new RegExp(activeBook.title) })).not.toBeVisible();

    await page.locator("select.search-input").selectOption("borrowed");
    await expect(page.getByRole("row", { name: new RegExp(activeBook.title) })).toBeVisible();
    await expect(page.getByRole("row", { name: new RegExp(returnedBook.title) })).not.toBeVisible();
  });

  test("returns a book from the list and the row updates", async ({ page, request }) => {
    const book = await apiCreateBook(request, { title: unique("Return Me Book") });
    const member = await apiCreateMember(request, { name: unique("Return Me Member") });
    await apiCreateBorrowing(request, book.id, member.id);

    await page.goto("/borrowings");
    const row = page.getByRole("row", { name: new RegExp(book.title) });
    await row.getByRole("button", { name: "Return" }).click();

    await expect(row.getByRole("button", { name: "Return" })).not.toBeVisible();
    await expect(row.getByText("returned")).toBeVisible();
  });

  test("Borrow a Book modal excludes an out-of-stock book and a non-active member", async ({ page, request }) => {
    const outOfStock = await apiCreateBook(request, { title: unique("Out Of Stock Book"), total_copies: 0 });
    const inStock = await apiCreateBook(request, { title: unique("In Stock Book"), total_copies: 1 });
    const inactiveMember = await apiCreateMember(request, { name: unique("Inactive Member"), status: "inactive" });
    const activeMember = await apiCreateMember(request, { name: unique("Eligible Member"), status: "active" });

    await page.goto("/borrowings");
    await page.getByRole("button", { name: "+ Borrow a Book" }).click();
    await expect(page.getByRole("heading", { name: "Borrow a Book" })).toBeVisible();

    const bookSelect = page.getByLabel("Book");
    const memberSelect = page.getByLabel("Member");
    await expect(bookSelect.locator("option", { hasText: inStock.title })).toHaveCount(1);
    await expect(bookSelect.locator("option", { hasText: outOfStock.title })).toHaveCount(0);
    await expect(memberSelect.locator("option", { hasText: activeMember.name })).toHaveCount(1);
    await expect(memberSelect.locator("option", { hasText: inactiveMember.name })).toHaveCount(0);
  });

  test("borrows a book with an explicit due date and it appears in the list", async ({ page, request }) => {
    const book = await apiCreateBook(request, { title: unique("Borrow Flow Book"), total_copies: 1 });
    const member = await apiCreateMember(request, { name: unique("Borrow Flow Member") });

    await page.goto("/borrowings");
    await page.getByRole("button", { name: "+ Borrow a Book" }).click();
    await expect(page.getByRole("heading", { name: "Borrow a Book" })).toBeVisible();

    await page.getByLabel("Book").selectOption(String(book.id));
    await page.getByLabel("Member").selectOption(String(member.id));
    await page.getByLabel(/Due date/).fill("2027-01-15");
    await page.getByRole("button", { name: "Borrow", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Borrow a Book" })).not.toBeVisible();
    const row = page.getByRole("row", { name: new RegExp(book.title) });
    await expect(row).toBeVisible();
    await expect(row).toContainText(member.name);
    await expect(row).toContainText("Jan 15, 2027");
  });
});
