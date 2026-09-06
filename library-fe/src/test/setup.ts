import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, afterAll } from "vitest";
import { server } from "./msw/server";

// Start the mock API server for the whole run; each test configures its own
// handlers via `server.use(...)` and we reset back to the defaults after every
// test so one test's mocked responses can never leak into the next.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());
