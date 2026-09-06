import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import StatusBadge from "./StatusBadge";

describe("StatusBadge", () => {
  it.each([
    ["active", "badge-good"],
    ["borrowed", "badge-warn"],
    ["returned", "badge-good"],
    ["overdue", "badge-bad"],
    ["inactive", "badge-neutral"],
    ["suspended", "badge-bad"],
  ])("maps status %s to tone class %s", (status, toneClass) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(status)).toHaveClass(toneClass);
  });

  it("falls back to a neutral tone for an unrecognized status", () => {
    render(<StatusBadge status="unknown-status" />);
    expect(screen.getByText("unknown-status")).toHaveClass("badge-neutral");
  });
});
