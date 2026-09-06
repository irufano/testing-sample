import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import { makeMember } from "../test/fixtures";
import MemberFormModal from "./MemberFormModal";

vi.mock("../api/members", () => ({
  createMember: vi.fn(),
  updateMember: vi.fn(),
}));

import { createMember, updateMember } from "../api/members";

const createMemberMock = vi.mocked(createMember);
const updateMemberMock = vi.mocked(updateMember);

describe("MemberFormModal", () => {
  beforeEach(() => {
    createMemberMock.mockReset();
    updateMemberMock.mockReset();
  });

  it("defaults a new member's status to active", () => {
    render(<MemberFormModal member={null} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByLabelText("Status")).toHaveValue("active");
  });

  it("pre-fills fields for an existing member and submits a trimmed update", async () => {
    const user = userEvent.setup();
    const member = makeMember({ id: 3, name: "Ada Lovelace", phone: " 555-0100 ", status: "suspended" });
    const onSaved = vi.fn();
    updateMemberMock.mockResolvedValue(member);

    render(<MemberFormModal member={member} onClose={vi.fn()} onSaved={onSaved} />);
    expect(screen.getByRole("heading", { name: "Edit Member" })).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toHaveValue("suspended");

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(updateMemberMock).toHaveBeenCalledTimes(1));
    expect(updateMemberMock).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ name: "Ada Lovelace", phone: "555-0100", status: "suspended" }),
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it("treats a blank optional phone as null on submit", async () => {
    const user = userEvent.setup();
    createMemberMock.mockResolvedValue(makeMember({ id: 4 }));

    render(<MemberFormModal member={null} onClose={vi.fn()} onSaved={vi.fn()} />);
    await user.type(screen.getByLabelText("Name"), "Grace Hopper");
    await user.type(screen.getByLabelText("Email"), "grace@example.com");
    await user.click(screen.getByRole("button", { name: "Create member" }));

    await waitFor(() => expect(createMemberMock).toHaveBeenCalledTimes(1));
    expect(createMemberMock).toHaveBeenCalledWith({
      name: "Grace Hopper",
      email: "grace@example.com",
      phone: null,
      status: "active",
    });
  });

  it("shows the API's error message on a duplicate email and does not call onSaved", async () => {
    const user = userEvent.setup();
    createMemberMock.mockRejectedValue(new ApiError("Email already registered.", 409));
    const onSaved = vi.fn();

    render(<MemberFormModal member={null} onClose={vi.fn()} onSaved={onSaved} />);
    await user.type(screen.getByLabelText("Name"), "Grace Hopper");
    await user.type(screen.getByLabelText("Email"), "grace@example.com");
    await user.click(screen.getByRole("button", { name: "Create member" }));

    expect(await screen.findByText("Email already registered.")).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
