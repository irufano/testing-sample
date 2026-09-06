# Library Management System

A small library management system split into two standalone projects: a REST API and a web frontend
that consumes it.

See [`Library API & Frontend Integration — PRD.md`](./Library%20API%20%26%20Frontend%20Integration%20—%20PRD.md)
for the full product spec.

## Projects

| Project | Stack | Docs |
|---|---|---|
| [`library-api/`](./library-api) | FastAPI, SQLAlchemy 2.0, Alembic, SQLite | [library-api/README.md](./library-api/README.md) |
| [`library-fe/`](./library-fe) | Vite, React, TypeScript | [library-fe/README.md](./library-fe/README.md) |

## Quick start

Run both projects in separate terminals.

**API** (`http://localhost:8000`):

```bash
cd library-api
uv sync
cp .env.example .env
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

**Frontend** (`http://localhost:5173`):

```bash
cd library-fe
bun install
bun run dev
```

The frontend expects the API at `http://localhost:8000/api/v1` by default (configurable via
`VITE_API_URL` in `library-fe/.env`). Swagger docs for the API are at `http://localhost:8000/docs`.

## Features

- **Books** — CRUD, search (title/author/ISBN), category filter, pagination.
- **Members** — CRUD, search (name/email), status filter, pagination.
- **Borrowings** — borrow/return flow with availability and active-member checks, status/member/book
  filtering, pagination.

Out of scope (current phase): authentication/authorization, CI/CD, deployment infra, notifications,
payments, analytics.

## Repository layout

```text
.
├── library-api/    # REST API (FastAPI)
├── library-fe/     # Web client (Vite + React)
└── .gitignore      # root ignore rules for both projects
```
