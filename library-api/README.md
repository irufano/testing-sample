# Library API

A standalone REST API for the Library Management System, built with FastAPI, SQLAlchemy and Alembic.

## Stack

- Python 3.11+
- [uv](https://docs.astral.sh/uv/) (dependency & virtual environment management)
- FastAPI
- Pydantic v2
- SQLAlchemy 2.0
- Alembic
- Uvicorn

## Architecture

```text
Route -> Service -> Repository -> Database
```

- **Route** (`app/api/routes`) — HTTP concerns: request/response schemas, status codes, query/path params.
- **Service** (`app/services`) — business logic, validation rules, transaction coordination.
- **Repository** (`app/repositories`) — persistence and query logic.

Every response (success or error) is wrapped in a standard envelope (`app/schemas/base_response.py`):

```json
{
  "status": "success",
  "info": { "code": 200, "message": "OK", "stacktrace": null },
  "data": {}
}
```

Global exception handlers in `app/main.py` guarantee that validation errors, business exceptions, HTTP
exceptions (including framework 404s) and unhandled exceptions are all converted into this envelope, and
that the HTTP status code always matches `info.code`.

## Setup

Dependencies and the virtual environment are managed with [uv](https://docs.astral.sh/uv/).

```bash
cd library-api
uv sync                        # creates .venv and installs from uv.lock
cp .env.example .env           # adjust DATABASE_URL / CORS_ORIGINS if needed
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

`uv run <cmd>` executes `<cmd>` inside the project's `.venv` without needing to activate it manually.
To add or update a dependency: `uv add <package>` (or `uv remove <package>`), then commit the updated
`pyproject.toml` and `uv.lock`.

The API defaults to a local SQLite database (`library.db`) so it runs with zero external setup. Point
`DATABASE_URL` at Postgres/MySQL/etc. for a real deployment — no code changes required.

## Configuration (`.env`)

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | SQLAlchemy database URL | `sqlite:///./library.db` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:5173` |
| `ENVIRONMENT` | `development` or `production` (hides stack traces in prod) | `development` |

## Database migrations

```bash
uv run alembic revision --autogenerate -m "describe change"
uv run alembic upgrade head
```

`uv run alembic upgrade head` also seeds 8 sample books (see
`alembic/versions/ccad4db3aaf3_seed_sample_books.py`) so Books/Borrowings has real data to browse right
after setup. It's reversible (`uv run alembic downgrade -1` removes just the seeded rows by ISBN).

## Running

```bash
uv run uvicorn app.main:app --reload
```

- API base: `http://localhost:8000/api/v1`
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Endpoints

```text
GET    /api/v1/books
GET    /api/v1/books/{book_id}
POST   /api/v1/books
PUT    /api/v1/books/{book_id}
DELETE /api/v1/books/{book_id}

GET    /api/v1/members
GET    /api/v1/members/{member_id}
POST   /api/v1/members
PUT    /api/v1/members/{member_id}
DELETE /api/v1/members/{member_id}

GET    /api/v1/borrowings
GET    /api/v1/borrowings/{borrowing_id}
POST   /api/v1/borrowings
POST   /api/v1/borrowings/{borrowing_id}/return
```

Books support `?search=&category=&page=&limit=`. Members support `?search=&status=&page=&limit=`.
Borrowings support `?status=&member_id=&book_id=&page=&limit=`.

## Business rules

- Borrowing requires an existing book with `available_copies > 0` and an existing, `active` member;
  it decrements `available_copies` and creates a `borrowed` record inside one DB transaction.
- Returning requires an existing, not-yet-returned borrowing; it sets `returned_at`/`status=returned`
  and increments `available_copies` inside one DB transaction.
- A book or member cannot be deleted while it has an active (`borrowed`) record, or any borrowing
  history at all (to preserve referential integrity/audit trail) — these return `422`/`409` respectively
  instead of a raw database error.

## Testing

Tests use `pytest` + FastAPI's `TestClient` (`httpx`), both declared as dev dependencies in
`pyproject.toml` under `[dependency-groups].dev`. Test discovery/config lives in
`pyproject.toml` under `[tool.pytest.ini_options]`.

```bash
cd library-api
uv sync                          # installs runtime + dev dependencies (pytest, httpx)
uv run pytest                    # runs the full suite once and exits non-zero on failure
uv run pytest -v                 # verbose output
uv run pytest tests/unit         # unit tests only (fast, no DB)
uv run pytest tests/integration  # integration tests only (real HTTP + in-memory DB)
uv run pytest tests/e2e          # backend end-to-end flow(s) only
uv run pytest tests/integration/test_borrowings.py   # run a single file
uv run pytest -k "borrow"        # run tests matching a keyword
```

No environment variables or external services are required: `tests/conftest.py` points the app at an
isolated in-memory SQLite database (via a `get_db` dependency override) before anything else imports
`app.main`, so the test run never touches the local dev `library.db`. Each test function gets a freshly
created/dropped schema, so tests don't leak state into each other.

### Layout

- `tests/conftest.py` — shared fixtures: the in-memory DB/`get_db` override, a `client` (TestClient)
  fixture, and `make_book`/`make_member`/`make_borrowing` factory fixtures for integration/e2e tests.
- `tests/unit/` — isolated, no DB/HTTP: pydantic schema validation (`test_schemas.py`), config parsing
  (`test_config.py`), the response envelope (`test_base_response.py`), the exception handlers including
  the stacktrace-exposure behavior (`test_error_handlers.py`), and the service-layer business rules with
  repositories replaced by mocks — ISBN/email uniqueness, `total_copies`/`available_copies` reconciliation,
  delete guards, borrow/return eligibility and accounting (`test_book_service.py`, `test_member_service.py`,
  `test_borrowing_service.py`).
- `tests/integration/` — full route -> service -> repository -> db stack through the real HTTP endpoints:
  - `test_health_and_envelope.py` — health checks and the shared success/error response envelope,
    including that HTTP status always matches `info.code` for 404s, validation errors (422), and business
    exceptions.
  - `test_books.py` — book CRUD, ISBN uniqueness, `total_copies`/`available_copies` reconciliation on
    update, delete guards (active borrowing / borrowing history), search/category filtering and pagination,
    a field-length boundary check, and a SQL-injection-safety check on the `search` query param.
  - `test_members.py` — member CRUD, email uniqueness, status filtering, delete guards, and a
    SQL-injection-safety check on the `search` query param.
  - `test_borrowings.py` — the borrow/return business flow: eligibility checks (book availability,
    active member), default vs. explicit due dates, available-copies accounting on borrow/return, and
    status/member/book filtering.
- `tests/e2e/` — `test_borrowing_lifecycle.py`, a backend end-to-end test that drives the full
  borrow -> return workflow across the books/members/borrowings endpoints in one flow, including the
  delete guards before and after borrowing history exists.

### Security coverage

There's no authentication/authorization in this API yet (see below), so security tests focus on the
risks that actually apply — injection safety and information disclosure:

- SQL injection via the free-text `search` query param on `/books` and `/members` (parameterized
  `ilike` queries; injection payloads must not error or return unexpected rows, and the tables must
  survive intact).
- Oversized/invalid input handling: field length/range limits (e.g. `title` > 255 chars, negative
  `total_copies`, non-positive `book_id`/`member_id`) all fail with `422` rather than a raw DB error.
- Stacktrace exposure: unhandled (500) errors only include a traceback when `ENVIRONMENT` is not
  `production`, and business exceptions (404/409/422) never include one regardless of environment
  (`tests/unit/test_error_handlers.py`, `tests/integration/test_health_and_envelope.py`).

Out of scope (this phase): authentication/authorization (the API has none yet), CI/CD, deployment infra,
notifications, payments, analytics — see the PRD for details.
