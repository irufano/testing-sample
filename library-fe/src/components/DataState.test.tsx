import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DataState from "./DataState";

describe("DataState", () => {
  it("shows the loading panel and nothing else while loading", () => {
    render(
      <DataState loading error={null} isEmpty={false}>
        <p>content</p>
      </DataState>,
    );
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("content")).not.toBeInTheDocument();
  });

  it("prioritizes the error panel over empty/content state, with a working Retry button", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <DataState loading={false} error="Failed to load books." isEmpty onRetry={onRetry}>
        <p>content</p>
      </DataState>,
    );

    expect(screen.getByText("Failed to load books.")).toBeInTheDocument();
    expect(screen.queryByText("content")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("omits the Retry button when onRetry is not provided", () => {
    render(
      <DataState loading={false} error="Failed to load books." isEmpty={false}>
        <p>content</p>
      </DataState>,
    );
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("shows the empty message when there is no error and no data", () => {
    render(
      <DataState loading={false} error={null} isEmpty emptyMessage="No books found.">
        <p>content</p>
      </DataState>,
    );
    expect(screen.getByText("No books found.")).toBeInTheDocument();
    expect(screen.queryByText("content")).not.toBeInTheDocument();
  });

  it("renders children once loaded, non-empty and error-free", () => {
    render(
      <DataState loading={false} error={null} isEmpty={false}>
        <p>content</p>
      </DataState>,
    );
    expect(screen.getByText("content")).toBeInTheDocument();
  });
});
