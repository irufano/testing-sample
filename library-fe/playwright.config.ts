import { defineConfig, devices } from "@playwright/test";

const FRONTEND_URL = "http://localhost:5173";
const BACKEND_URL = "http://localhost:8000";

// Fresh, disposable SQLite file per run — never the dev `library.db` — reset by
// deleting it and re-applying migrations (which also re-seeds the 8 sample
// books) before uvicorn starts.
const RESET_AND_START_API =
  "rm -f library.e2e.db && " +
  "DATABASE_URL=sqlite:///./library.e2e.db uv run alembic upgrade head && " +
  "DATABASE_URL=sqlite:///./library.e2e.db uv run uvicorn app.main:app --port 8000";

export default defineConfig({
  testDir: "./e2e",
  // A single shared backend + SQLite file backs every spec in this run (see
  // webServer below), so tests intentionally do not run concurrently against
  // it — each spec uses uniquely-generated data to avoid colliding with the
  // others, but true parallelism would still race on shared list/pagination
  // state. Trade a bit of wall-clock time for a deterministic run.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: FRONTEND_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: { slowMo: 500 }
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: RESET_AND_START_API,
      cwd: "../library-api",
      url: `${BACKEND_URL}/health`,
      // Always false, not just in CI: reusing a leftover server here would skip the
      // reset-and-reseed step above (or serve a stale build) and silently leak
      // accumulated data between otherwise-independent runs — a real bug this
      // suite hit once already. A run that can't bind the port fails loudly
      // instead, which is what we want.
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      // A production build served via `vite preview`, not `vite dev`: the dev
      // server compiles modules on demand, and the first navigation of a run
      // can take long enough to transform the app that it trips the default
      // 5s assertion timeout — a flake, not a real bug. Building first also
      // means e2e exercises what actually ships. No VITE_API_URL override
      // needed: the built-in fallback already points at
      // http://localhost:8000/api/v1, matching the backend above.
      command: "bun run build && bun run preview -- --port 5173 --strictPort",
      url: FRONTEND_URL,
      // Always false: reusing a leftover preview server would skip rebuilding
      // and keep serving a stale bundle from a previous run/edit. Same
      // fail-loud-on-port-conflict trade-off as the API server above.
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: "pipe",
      stderr: "pipe",

    },
  ],
});
