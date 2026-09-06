import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Pagination from "./Pagination";

describe("Pagination", () => {
  it("renders nothing when there is only one page", () => {
    const { container } = render(
      <Pagination pagination={{ page: 1, limit: 10, total: 3, total_pages: 1 }} onPageChange={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("disables Previous on the first page and Next on the last page", () => {
    render(<Pagination pagination={{ page: 1, limit: 10, total: 30, total_pages: 3 }} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  });

  it("enables both buttons on a middle page and disables Next on the last page", () => {
    const { rerender } = render(
      <Pagination pagination={{ page: 2, limit: 10, total: 30, total_pages: 3 }} onPageChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();

    rerender(<Pagination pagination={{ page: 3, limit: 10, total: 30, total_pages: 3 }} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("calls onPageChange with page ± 1 when Previous/Next are clicked", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination pagination={{ page: 2, limit: 10, total: 30, total_pages: 3 }} onPageChange={onPageChange} />);

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenCalledWith(3);

    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("shows the current page, total pages and total count", () => {
    render(<Pagination pagination={{ page: 2, limit: 10, total: 25, total_pages: 3 }} onPageChange={vi.fn()} />);
    expect(screen.getByText("Page 2 of 3 (25 total)")).toBeInTheDocument();
  });
});
