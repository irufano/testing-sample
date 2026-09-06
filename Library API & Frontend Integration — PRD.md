# Product Requirements Document (PRD)
## Library API & Frontend Integration

**Status:** Draft  
**Project:** Library Management System  
**Backend Directory:** `library-api/`  
**Frontend Directory:** `library-fe/`  
**Backend Stack:** FastAPI + Python + uv  
**Frontend Stack:** Vite + React + TypeScript  
**Testing:** Unit testing is out of scope for this phase.

---

# 1. Overview

The goal of this project is to build a REST API for a Library Management System using **FastAPI** and integrate it with the existing frontend application.

Project structure:

```text
project-root/
├── library-api/
└── library-fe/
```

The implementation MUST prioritize the backend API first.

Development order:

```text
1. Analyze existing frontend requirements
2. Design API contract
3. Build library-api
4. Complete API functionality
5. Manually verify API
6. Integrate library-fe
7. Verify complete frontend → API → database flow
```

The frontend MUST NOT be integrated before the required API functionality is complete and working.

---

# 2. Objectives

The implementation must:

1. Inspect the existing `library-fe/` to understand required functionality.
2. Create a standalone FastAPI backend inside `library-api/`.
3. Use **uv** for Python project and dependency management.
4. Design the API contract based on the existing frontend requirements.
5. Implement persistent database storage.
6. Complete and verify the backend API before frontend integration.
7. Use a standardized response wrapper for every API response.
8. Integrate the existing frontend with the completed API.
9. Replace applicable mock/hardcoded frontend data with API calls.
10. Preserve the existing frontend design and UX wherever possible.
11. Keep the backend modular and maintainable.
12. Provide OpenAPI/Swagger documentation.
13. Do not implement unit tests in this phase.

---

# 3. Existing Frontend Analysis

The frontend already exists in:

```text
library-fe/
```

Technology:

- Vite
- React
- TypeScript

Before designing the API, inspect the frontend to understand:

- Pages
- Routes
- Components
- Existing TypeScript interfaces
- Forms
- Tables
- Mock data
- Hardcoded data
- Search functionality
- Filters
- Pagination
- Existing services
- CRUD operations
- Expected request/response structures
- User flows

This phase is for requirement discovery only.

Do not start frontend API integration during this phase.

---

# 4. Implementation Priority

Backend API implementation has priority over frontend integration.

Mandatory order:

```text
Frontend Requirement Analysis
          ↓
API Contract Design
          ↓
Backend Foundation
          ↓
Database
          ↓
Books API
          ↓
Members API
          ↓
Borrowings API
          ↓
API Manual Verification
          ↓
Frontend API Layer
          ↓
Frontend Integration
          ↓
End-to-End Manual Verification
```

The API must reach a usable and verified state before frontend integration begins.

---

# 5. Backend Technology

Create the backend inside:

```text
library-api/
```

Use:

- Python 3.11+
- FastAPI
- Pydantic
- SQLAlchemy
- Alembic
- Uvicorn
- **uv**

`uv` MUST be used for:

- Python project initialization
- Dependency management
- Virtual environment management
- Lock file management
- Running backend commands

Do not use `requirements.txt` as the primary dependency management mechanism.

---

# 6. Backend Project Initialization

Initialize the backend using `uv`.

Example:

```bash
mkdir library-api
cd library-api

uv init
```

Add backend dependencies using:

```bash
uv add fastapi
uv add "uvicorn[standard]"
uv add sqlalchemy
uv add alembic
uv add pydantic-settings
```

Add the selected database driver as required.

Example for PostgreSQL:

```bash
uv add psycopg[binary]
```

or for async PostgreSQL:

```bash
uv add asyncpg
```

Dependencies must be managed through:

```text
pyproject.toml
uv.lock
```

Expected root structure:

```text
library-api/
├── app/
├── alembic/
├── alembic.ini
├── pyproject.toml
├── uv.lock
├── .env.example
└── README.md
```

---

# 7. Backend Architecture

Recommended structure:

```text
library-api/
├── app/
│   ├── main.py
│   │
│   ├── api/
│   │   ├── router.py
│   │   └── routes/
│   │       ├── books.py
│   │       ├── members.py
│   │       └── borrowings.py
│   │
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   └── exceptions.py
│   │
│   ├── models/
│   │   ├── book.py
│   │   ├── member.py
│   │   └── borrowing.py
│   │
│   ├── schemas/
│   │   ├── base_response.py
│   │   ├── book.py
│   │   ├── member.py
│   │   └── borrowing.py
│   │
│   ├── repositories/
│   │   ├── book_repository.py
│   │   ├── member_repository.py
│   │   └── borrowing_repository.py
│   │
│   └── services/
│       ├── book_service.py
│       ├── member_service.py
│       └── borrowing_service.py
│
├── alembic/
├── alembic.ini
├── pyproject.toml
├── uv.lock
├── .env.example
└── README.md
```

Architecture:

```text
Route
  ↓
Service
  ↓
Repository
  ↓
Database
```

### Route

Responsible for:

- HTTP request/response
- Request schemas
- Query/path parameters
- Response schemas
- HTTP status codes

### Service

Responsible for:

- Business logic
- Business validation
- Transaction coordination

### Repository

Responsible for:

- Database queries
- CRUD operations
- Persistence

Business logic MUST NOT be placed directly inside route handlers.

---

# 8. Mandatory Base API Response

Every API response MUST use the same response wrapper.

Canonical structure:

```json
{
  "status": "success",
  "info": {
    "code": 200,
    "message": "OK",
    "stacktrace": null
  },
  "data": {}
}
```

The exact top-level structure is:

```text
status
info
data
```

Do not return unwrapped API responses.

---

# 9. Base Response Schema

Conceptual structure:

```text
BaseResponse<T>
├── status
│   ├── success
│   └── error
├── info
│   ├── code
│   ├── message
│   └── stacktrace
└── data
```

Expected implementation:

```python
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiInfo(BaseModel):
    code: int
    message: str
    stacktrace: str | None = None


class BaseResponse(BaseModel, Generic[T]):
    status: Literal["success", "error"]
    info: ApiInfo
    data: T | None = None
```

Create reusable helpers for successful and error responses.

Do not manually reconstruct the wrapper in every endpoint.

---

# 10. Successful API Response

Example:

```json
{
  "status": "success",
  "info": {
    "code": 200,
    "message": "OK",
    "stacktrace": null
  },
  "data": {
    "id": 1,
    "title": "Clean Code"
  }
}
```

Created resource:

```json
{
  "status": "success",
  "info": {
    "code": 201,
    "message": "Created",
    "stacktrace": null
  },
  "data": {
    "id": 1,
    "title": "Clean Code"
  }
}
```

For successful responses:

```text
status = "success"
stacktrace = null
```

---

# 11. Error API Response

Errors MUST also use `BaseResponse`.

Example:

```json
{
  "status": "error",
  "info": {
    "code": 404,
    "message": "Book not found",
    "stacktrace": null
  },
  "data": null
}
```

Conflict:

```json
{
  "status": "error",
  "info": {
    "code": 409,
    "message": "ISBN already exists",
    "stacktrace": null
  },
  "data": null
}
```

Production must not expose sensitive stack traces.

---

# 12. HTTP Status and `info.code`

The actual HTTP status code and:

```text
info.code
```

MUST be identical.

Example:

```text
HTTP 404
```

Response:

```json
{
  "status": "error",
  "info": {
    "code": 404,
    "message": "Book not found",
    "stacktrace": null
  },
  "data": null
}
```

Do not return HTTP `200` for failed operations.

---

# 13. Global Exception Handling

Global FastAPI exception handlers must normalize errors into `BaseResponse`.

Handle at minimum:

```text
RequestValidationError
HTTPException
Application / Business Exceptions
Unhandled Exception
```

Flow:

```text
Exception
    ↓
Global Exception Handler
    ↓
BaseResponse
    ↓
HTTP Response
```

Avoid FastAPI default responses such as:

```json
{
  "detail": "Not Found"
}
```

Convert them into the standard wrapper.

---

# 14. Pagination

Pagination must remain inside `data`.

Example:

```json
{
  "status": "success",
  "info": {
    "code": 200,
    "message": "OK",
    "stacktrace": null
  },
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "total_pages": 5
    }
  }
}
```

Do not introduce additional top-level response properties.

---

# 15. Core Domain

Minimum domain:

```text
Book
Member
Borrowing
```

Relationship:

```text
Member
   │
   │ borrows
   ▼
Borrowing
   │
   │ references
   ▼
Book
```

---

# 16. Book Management

Minimum fields:

| Field | Description |
|---|---|
| `id` | Unique identifier |
| `title` | Book title |
| `author` | Author |
| `isbn` | ISBN |
| `category` | Category |
| `description` | Optional description |
| `total_copies` | Total copies |
| `available_copies` | Available copies |
| `created_at` | Creation timestamp |
| `updated_at` | Update timestamp |

Required APIs:

```http
GET    /api/v1/books
GET    /api/v1/books/{book_id}
POST   /api/v1/books
PUT    /api/v1/books/{book_id}
DELETE /api/v1/books/{book_id}
```

Listing should support:

```http
GET /api/v1/books?page=1&limit=20
GET /api/v1/books?search=python
GET /api/v1/books?category=programming
```

Search should support:

- Title
- Author
- ISBN

---

# 17. Member Management

Minimum fields:

| Field | Description |
|---|---|
| `id` | Unique identifier |
| `name` | Member name |
| `email` | Email |
| `phone` | Optional phone |
| `status` | Member status |
| `created_at` | Creation timestamp |
| `updated_at` | Update timestamp |

Required APIs:

```http
GET    /api/v1/members
GET    /api/v1/members/{member_id}
POST   /api/v1/members
PUT    /api/v1/members/{member_id}
DELETE /api/v1/members/{member_id}
```

Support where required:

- Pagination
- Search
- Status filtering

---

# 18. Borrowing Management

Minimum fields:

| Field | Description |
|---|---|
| `id` | Unique identifier |
| `book_id` | Book |
| `member_id` | Member |
| `borrowed_at` | Borrow date |
| `due_at` | Due date |
| `returned_at` | Return date |
| `status` | Borrowing status |
| `created_at` | Creation timestamp |
| `updated_at` | Update timestamp |

Statuses:

```text
borrowed
returned
overdue
```

Required APIs:

```http
GET  /api/v1/borrowings
GET  /api/v1/borrowings/{borrowing_id}
POST /api/v1/borrowings
POST /api/v1/borrowings/{borrowing_id}/return
```

Filtering:

```http
GET /api/v1/borrowings?status=borrowed
GET /api/v1/borrowings?member_id=123
GET /api/v1/borrowings?book_id=456
```

---

# 19. Borrowing Business Rules

When borrowing:

1. Book must exist.
2. Member must exist.
3. Member must be eligible.
4. `available_copies > 0`.
5. Create borrowing record.
6. Decrease `available_copies` by `1`.

When returning:

1. Borrowing must exist.
2. Borrowing must not already be returned.
3. Set `returned_at`.
4. Change status to `returned`.
5. Increase `available_copies` by `1`.

Borrowing and return operations should use database transactions.

---

# 20. Database

Use:

- SQLAlchemy
- Alembic

Database configuration must come from environment variables.

```env
DATABASE_URL=...
```

Do not hardcode credentials.

Run Alembic through `uv`.

Example:

```bash
uv run alembic revision --autogenerate -m "initial schema"
uv run alembic upgrade head
```

---

# 21. Validation

Use Pydantic for request and response validation.

Validate at minimum:

- Required fields
- Email
- Numeric constraints
- Status values
- Book copy counts
- Invalid IDs
- Duplicate ISBN
- Duplicate member email
- Invalid borrowing
- Invalid return

All validation failures must use the standard Base Response.

---

# 22. CORS

Configure CORS through environment configuration.

Example:

```env
CORS_ORIGINS=http://localhost:5173
```

Avoid unrestricted production CORS.

---

# 23. API Documentation

FastAPI documentation must remain available:

```text
/docs
/redoc
```

Document:

- Request models
- Response models
- Query parameters
- HTTP status codes
- Base Response structures

---

# 24. API-First Implementation

Backend implementation must be completed before frontend integration.

## Phase 1 — Inspect Frontend

Inspect:

```text
library-fe/
```

Only to determine backend requirements.

Identify:

- Features
- Pages
- Forms
- Data structures
- Mock data
- Required endpoints

Do not integrate the frontend yet.

---

## Phase 2 — API Contract

Define:

- Resources
- Endpoints
- Request schemas
- Response schemas
- Filters
- Pagination
- Business rules

All responses must follow:

```text
BaseResponse<T>
```

---

## Phase 3 — Initialize Backend with uv

Create:

```text
library-api/
```

Initialize:

```bash
cd library-api
uv init
```

Install required dependencies using `uv add`.

The backend must use:

```text
pyproject.toml
uv.lock
```

as its dependency source of truth.

---

## Phase 4 — Backend Foundation

Implement:

- FastAPI application
- Configuration
- SQLAlchemy
- Alembic
- BaseResponse
- Global exception handlers
- CORS
- API router

---

## Phase 5 — Books API

Complete:

```text
Model
Schema
Repository
Service
Route
```

Verify manually.

---

## Phase 6 — Members API

Complete:

```text
Model
Schema
Repository
Service
Route
```

Verify manually.

---

## Phase 7 — Borrowings API

Complete:

```text
Model
Schema
Repository
Service
Route
Business Rules
Transactions
```

Verify manually.

---

## Phase 8 — API Verification

Run the backend using:

```bash
uv run uvicorn app.main:app --reload
```

Alternatively, when FastAPI CLI is available:

```bash
uv run fastapi dev app/main.py
```

Verify:

```text
Books CRUD
Members CRUD
Borrow Book
Return Book
Search
Filters
Pagination
Validation
404
409
422
500 handling
Base Response consistency
```

At this point:

```text
library-api
```

must work independently.

Only then begin frontend integration.

---

# 25. Frontend Integration

After API completion, integrate:

```text
library-fe/
```

Configure:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

Create or adapt a centralized API layer:

```text
library-fe/src/
├── api/
│   ├── client.ts
│   ├── books.ts
│   ├── members.ts
│   └── borrowings.ts
```

Flow:

```text
React Component
       ↓
API Service
       ↓
FastAPI
```

Avoid duplicated raw HTTP logic inside React components.

---

# 26. Frontend Base Response Type

The frontend must use the standard backend response.

```ts
export type ResponseStatus = "success" | "error";

export interface ApiInfo {
  code: number;
  message: string;
  stacktrace: string | null;
}

export interface BaseResponse<T> {
  status: ResponseStatus;
  info: ApiInfo;
  data: T | null;
}
```

Examples:

```ts
BaseResponse<Book>
BaseResponse<Member>
BaseResponse<Borrowing>
BaseResponse<PaginatedData<Book>>
```

---

# 27. Frontend States

Integrated pages must handle:

- Loading
- Empty
- Error
- Success

Frontend error messages should primarily use:

```text
response.info.message
```

Never display `stacktrace` to users.

---

# 28. Frontend Integration Scope

Replace applicable mock/hardcoded data with real API calls for existing functionality including:

- Books
- Book details
- Book creation
- Book editing
- Book deletion
- Search
- Filtering
- Members
- Member CRUD
- Borrowing
- Returning
- Borrowing history/status

Preserve the existing frontend design.

---

# 29. Local Development

## Backend

First synchronize dependencies:

```bash
cd library-api
uv sync
```

Run database migration:

```bash
uv run alembic upgrade head
```

Run FastAPI:

```bash
uv run uvicorn app.main:app --reload
```

Expected backend:

```text
http://localhost:8000
```

Swagger:

```text
http://localhost:8000/docs
```

## Frontend

```bash
cd library-fe
npm install
npm run dev
```

Expected frontend:

```text
http://localhost:5173
```

Architecture:

```text
Browser
   │
   ▼
library-fe
Vite + React + TypeScript
localhost:5173
   │
   │ HTTP
   ▼
library-api
FastAPI + uv
localhost:8000
   │
   ▼
Database
```

---

# 30. Dependency Management Rules

The backend MUST use `uv`.

Use:

```bash
uv add <package>
```

for adding dependencies.

Use:

```bash
uv remove <package>
```

for removing dependencies.

Use:

```bash
uv sync
```

for synchronizing the environment.

Use:

```bash
uv run <command>
```

for running Python/backend commands.

Do not use the following as the primary workflow:

```bash
pip install ...
pip freeze > requirements.txt
python -m venv ...
```

Do not manually maintain a `requirements.txt` unless explicitly required for external compatibility.

Primary dependency files are:

```text
pyproject.toml
uv.lock
```

Both should be committed to the repository.

---

# 31. Out of Scope

Do NOT implement in this phase:

- Unit tests
- Automated integration tests
- Automated E2E tests
- Authentication
- Authorization / RBAC
- CI/CD
- Deployment infrastructure
- Email notifications
- Fine/payment processing
- Advanced analytics

Manual API verification is still required.

---

# 32. Acceptance Criteria

The implementation is complete when:

- `library-api/` exists as a standalone FastAPI application.
- `library-api/` is managed using `uv`.
- `pyproject.toml` exists.
- `uv.lock` exists.
- `uv sync` successfully installs the backend environment.
- Backend commands can be executed with `uv run`.
- API implementation is completed before frontend integration.
- All endpoints use the standard Base Response.
- Successful responses use `status = "success"`.
- Error responses use `status = "error"`.
- Every response contains `info.code`.
- Every response contains `info.message`.
- Every response contains `info.stacktrace`.
- Every response contains `data`.
- HTTP status codes match `info.code`.
- Global exception handlers convert errors into Base Response.
- Books API works.
- Members API works.
- Borrowings API works.
- Borrow/return correctly updates inventory.
- Search/filter/pagination work where required.
- Alembic migrations work through `uv run`.
- Swagger `/docs` works.
- API can run independently from the frontend.
- API has been manually verified before frontend integration.
- `library-fe/` consumes the completed API.
- Frontend understands `BaseResponse<T>`.
- Applicable mock data is replaced by API data.
- Existing frontend UI is preserved.
- Full frontend → API → database workflow works.
- No unit tests are required in this phase.

---

# 33. Definition of Done

Backend development workflow:

```text
uv init
   ↓
uv add dependencies
   ↓
Implement FastAPI
   ↓
uv run alembic upgrade head
   ↓
uv run uvicorn app.main:app --reload
   ↓
Verify API
   ↓
Integrate Frontend
```

Application flow:

```text
library-fe
Vite + React + TypeScript
        │
        │ REST API
        ▼
library-api
FastAPI + uv
        │
        ▼
Database
```

Every API interaction must follow:

```text
Request
   ↓
Route
   ↓
Service
   ↓
Repository
   ↓
Database
   ↓
BaseResponse<T>
   ↓
Frontend
```

Canonical API response:

```json
{
  "status": "success",
  "info": {
    "code": 200,
    "message": "OK",
    "stacktrace": null
  },
  "data": {}
}
```

The API must be independently functional and manually verified before frontend integration begins.