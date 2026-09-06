"""Shared pytest fixtures for the whole test suite.

The `get_db` dependency is overridden to point at an isolated in-memory
SQLite database *before* any test imports touch the real app wiring, so the
test run never creates or writes to the local dev database file
(`library.db`). Each test gets a freshly created/dropped schema so tests
never leak state into one another, and share the same in-memory database
within a single test via a StaticPool connection.
"""

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app

TEST_DATABASE_URL = "sqlite://"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@event.listens_for(engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, _connection_record) -> None:
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture(autouse=True)
def _fresh_schema():
    """Create a clean schema before each test and drop it afterwards."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def db_session():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def make_book(client: TestClient):
    """Factory fixture: POSTs a book with sane defaults, returns the created resource."""

    def _make(**overrides):
        payload = {
            "title": "Clean Code",
            "author": "Robert C. Martin",
            "isbn": f"ISBN-{uuid4().hex[:12]}",
            "category": "Software Engineering",
            "total_copies": 3,
        }
        payload.update(overrides)
        response = client.post("/api/v1/books", json=payload)
        assert response.status_code == 201, response.text
        return response.json()["data"]

    return _make


@pytest.fixture
def make_member(client: TestClient):
    """Factory fixture: POSTs a member with sane defaults, returns the created resource."""

    def _make(**overrides):
        payload = {
            "name": "Ada Lovelace",
            "email": f"ada.{uuid4().hex[:10]}@example.com",
        }
        payload.update(overrides)
        response = client.post("/api/v1/members", json=payload)
        assert response.status_code == 201, response.text
        return response.json()["data"]

    return _make


@pytest.fixture
def make_borrowing(client: TestClient):
    """Factory fixture: POSTs a borrowing, returns the created resource."""

    def _make(book_id: int, member_id: int, **overrides):
        payload = {"book_id": book_id, "member_id": member_id}
        payload.update(overrides)
        response = client.post("/api/v1/borrowings", json=payload)
        assert response.status_code == 201, response.text
        return response.json()["data"]

    return _make
