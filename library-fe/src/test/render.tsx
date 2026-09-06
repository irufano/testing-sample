import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/** Renders a tree that needs router context (NavLink/useNavigate/etc.) without a full BrowserRouter. */
export function renderWithRouter(ui: ReactElement, initialEntries: string[] = ["/"]) {
  return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);
}
