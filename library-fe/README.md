# Library Frontend

Vite + React + TypeScript client for the Library Management System, consuming `library-api`.

## Setup

```bash
cd library-fe
bun install    # or npm install
bun run dev    # or npm run dev
```

The app runs on `http://localhost:5173` by default and expects the API at
`http://localhost:8000/api/v1`.

To point at a different API, create a `.env` file:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

(If omitted, the app falls back to `http://localhost:8000/api/v1` automatically.)

## Structure

```text
src/
├── api/
│   ├── client.ts       # fetch wrapper: unwraps BaseResponse<T>, throws ApiError on status="error"
│   ├── types.ts        # BaseResponse<T>, PaginatedData<T>, Book/Member/Borrowing models
│   ├── books.ts
│   ├── members.ts
│   └── borrowings.ts
├── components/          # shared UI: Layout, Modal, forms, table helpers
├── pages/
│   ├── BooksPage.tsx
│   ├── MembersPage.tsx
│   └── BorrowingsPage.tsx
├── App.tsx              # routes
└── main.tsx
```

Every page fetches through the `api/` layer (never directly with `fetch` in a component) and handles
loading, empty, error and success states. Errors are surfaced from `response.info.message`; the raw
`stacktrace` is never shown to users. Mutations (create/update/delete/borrow/return) refetch the current
page instead of requiring a full reload.

## Features

- **Books** — list with search (title/author/ISBN) + category filter + pagination, create/edit/delete.
- **Members** — list with search (name/email) + status filter + pagination, create/edit/delete.
- **Borrowings** — list with status filter + pagination, borrow a book (with a live picker of members and
  in-stock books), return a book.

## Building

```bash
bun run build
```

Type-checks (`tsc -b`) and produces a production build in `dist/`.

## Testing

Three layers, all runnable independently:

```bash
bun run test            # unit + integration (Vitest + React Testing Library), once, exits non-zero on failure
bun run test:watch      # same, in watch mode
bun run test:coverage   # same, with a coverage report (text + html in coverage/)
bun run test:e2e        # end-to-end (Playwright + a real backend), see below
bun run test:e2e:ui     # same, in Playwright's interactive UI mode
```

No environment variables or manual setup are needed for `bun run test` — `vitest.config.ts` runs in
`jsdom`, and `src/test/setup.ts` starts an [MSW](https://mswjs.io) mock server (`src/test/msw/server.ts`)
before the run and resets its handlers after every test, so no real network call ever leaves the process.
`src/test/fixtures.ts` has factories for `Book`/`Member`/`Borrowing` and `BaseResponse` envelopes; each test
registers its own `server.use(...)` handlers for the scenario it needs.

- `src/api/client.test.ts` — unit: query-param serialization, success/error envelope handling, network
  failure, non-JSON responses, and that a `stacktrace` in an error envelope is never surfaced.
- `src/components/*.test.tsx` — unit: `StatusBadge` tone mapping, `Pagination` boundary behavior,
  `DataState`'s loading/error/empty/content precedence, and `BookFormModal`/`MemberFormModal` field
  validation, trimming and API-error display (with `../api/books` / `../api/members` mocked).
- `src/pages/*.test.tsx` — integration: each page wired to its real API module with the network mocked at
  the fetch boundary (MSW), covering load/empty/error+retry, debounced search, filters, pagination,
  create/edit/delete (including delete-guard conflicts), borrow/return, and that a title/name containing
  markup renders as inert text (not HTML).

### End-to-end (Playwright)

`playwright.config.ts` starts **both** a real `library-api` backend and a production build of this app
(`bun run build && bun run preview`, not the dev server — see the comment in the config for why), runs the
suite in `e2e/` against them in a real browser, then tears both down. Nothing else needs to be running
first, and the dev database is never touched:

```bash
bun run test:e2e
```

This needs [`uv`](https://docs.astral.sh/uv/) on `PATH` (used to run the backend) and a `library-api/`
checkout next to this one with `uv sync` already run at least once. Each run resets a disposable
`library-api/library.e2e.db` SQLite file and re-applies migrations (re-seeding the 8 sample books) before
starting the API on port 8000; the app is served on port 5173. Both servers always start fresh
(`reuseExistingServer: false`) — a prior run's server must have exited before the next one starts, or the
new run fails fast with a clear "port already in use" error instead of silently reusing stale data. If that
happens, stop whatever is still bound to 8000/5173 (e.g. `lsof -ti:8000,5173 | xargs kill`) and retry.

Since both servers are shared across the whole run (not reset between individual tests), specs don't run
concurrently (`fullyParallel: false`, `workers: 1`) and each test creates its own uniquely-named data via
`e2e/api-helpers.ts` (which talks to the backend directly, faster than driving the UI, for setup only —
every assertion still goes through the browser) rather than depending on exact list/pagination state.

- `e2e/books.spec.ts`, `e2e/members.spec.ts` — the default list view, search/filter, create, edit, delete,
  a duplicate-ISBN/email conflict surfaced from the real backend, a delete blocked by an active borrowing,
  and (books) that a title containing markup renders as inert text end-to-end.
- `e2e/borrowings.spec.ts` — the list with its status filter and Return action, and the Borrow-a-Book modal
  (excluding out-of-stock books / non-active members, and a full borrow with a due date).

Not covered end-to-end (reused from the mocked integration tests above instead, since the real backend
won't organically produce them through legitimate UI use): the borrow/return failure banners — the UI's own
conditional rendering already prevents returning an already-returned borrowing or borrowing a book the
picker has excluded, so those paths are only reachable by mocking the API response.
