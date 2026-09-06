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
