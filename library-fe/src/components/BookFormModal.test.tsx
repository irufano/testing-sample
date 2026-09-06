import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import { makeBook } from "../test/fixtures";
import BookFormModal from "./BookFormModal";

vi.mock("../api/books", () => ({
  createBook: vi.fn(),
  updateBook: vi.fn(),
}));

import { createBook, updateBook } from "../api/books";

const createBookMock = vi.mocked(createBook);
const updateBookMock = vi.mocked(updateBook);

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Title"), "Dune");
  await user.type(screen.getByLabelText("Author"), "Frank Herbert");
  await user.type(screen.getByLabelText("ISBN"), "978-0441013593");
  await user.type(screen.getByLabelText("Category"), "Sci-Fi");
}

describe("BookFormModal", () => {
  beforeEach(() => {
    createBookMock.mockReset();
    updateBookMock.mockReset();
  });

  it("pre-fills fields from the given book and submits an update with trimmed values", async () => {
    const user = userEvent.setup();
    const book = makeBook({ id: 5, title: "  Old Title  ", total_copies: 2 });
    const onSaved = vi.fn();
    updateBookMock.mockResolvedValue(makeBook({ id: 5, title: "Old Title" }));

    render(<BookFormModal book={book} onClose={vi.fn()} onSaved={onSaved} />);

    expect(screen.getByRole("heading", { name: "Edit Book" })).toBeInTheDocument();
    const titleInput = screen.getByLabelText("Title") as HTMLInputElement;
    expect(titleInput.value).toBe("  Old Title  ");

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(updateBookMock).toHaveBeenCalledTimes(1));
    expect(updateBookMock).toHaveBeenCalledWith(5, expect.objectContaining({ title: "Old Title" }));
    expect(onSaved).toHaveBeenCalled();
  });

  // These submit via `fireEvent.submit` on the <form> directly rather than clicking the submit
  // button: the field also carries native `min=0`/integer step constraints, so a real click would
  // be blocked by the browser's own constraint validation before React's handler ever runs. Firing
  // the `submit` event programmatically is the standard way to reach the app's own JS validation
  // for a value the native constraints would otherwise intercept first.
  it("rejects a non-integer total_copies without calling the API", async () => {
    const user = userEvent.setup();
    render(<BookFormModal book={null} onClose={vi.fn()} onSaved={vi.fn()} />);
    await fillRequiredFields(user);

    const totalCopies = screen.getByLabelText("Total copies");
    await user.clear(totalCopies);
    await user.type(totalCopies, "1.5");
    fireEvent.submit(totalCopies.closest("form")!);

    expect(await screen.findByText("Total copies must be a non-negative whole number.")).toBeInTheDocument();
    expect(createBookMock).not.toHaveBeenCalled();
  });

  it("rejects a negative total_copies without calling the API", async () => {
    const user = userEvent.setup();
    render(<BookFormModal book={null} onClose={vi.fn()} onSaved={vi.fn()} />);
    await fillRequiredFields(user);

    const totalCopies = screen.getByLabelText("Total copies");
    await user.clear(totalCopies);
    await user.type(totalCopies, "-1");
    fireEvent.submit(totalCopies.closest("form")!);

    expect(await screen.findByText("Total copies must be a non-negative whole number.")).toBeInTheDocument();
    expect(createBookMock).not.toHaveBeenCalled();
  });

  it("submits a trimmed create payload and treats a blank description as null", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    createBookMock.mockResolvedValue(makeBook({ id: 9 }));

    render(<BookFormModal book={null} onClose={vi.fn()} onSaved={onSaved} />);
    await user.type(screen.getByLabelText("Title"), "  Dune  ");
    await user.type(screen.getByLabelText("Author"), " Frank Herbert ");
    await user.type(screen.getByLabelText("ISBN"), " 978-0441013593 ");
    await user.type(screen.getByLabelText("Category"), " Sci-Fi ");

    await user.click(screen.getByRole("button", { name: "Create book" }));

    await waitFor(() => expect(createBookMock).toHaveBeenCalledTimes(1));
    expect(createBookMock).toHaveBeenCalledWith({
      title: "Dune",
      author: "Frank Herbert",
      isbn: "978-0441013593",
      category: "Sci-Fi",
      description: null,
      total_copies: 1,
    });
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 9 }));
  });

  it("shows the API's error message and keeps the modal open on failure", async () => {
    const user = userEvent.setup();
    createBookMock.mockRejectedValue(new ApiError("ISBN already exists.", 409));
    const onSaved = vi.fn();

    render(<BookFormModal book={null} onClose={vi.fn()} onSaved={onSaved} />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Create book" }));

    expect(await screen.findByText("ISBN already exists.")).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("calls onClose when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<BookFormModal book={null} onClose={onClose} onSaved={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
