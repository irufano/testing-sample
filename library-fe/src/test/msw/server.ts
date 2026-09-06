import { setupServer } from "msw/node";

// No default handlers: every test opts in via `server.use(...)` so a request
// nobody expected fails loudly (see `onUnhandledRequest: "error"` in setup.ts)
// instead of silently falling through to a stale handler from another test.
export const server = setupServer();
