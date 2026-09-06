"""Unit tests for pydantic schema validation rules (pure, no DB/HTTP)."""

import pytest
from pydantic import ValidationError

from app.schemas.book import BookCreate
from app.schemas.borrowing import BorrowingCreate
from app.schemas.member import MemberCreate


class TestBookCreate:
    @pytest.mark.parametrize("field", ["title", "author", "isbn", "category"])
    def test_rejects_blank_field(self, field):
        payload = {
            "title": "T",
            "author": "A",
            "isbn": "I",
            "category": "C",
            "total_copies": 1,
        }
        payload[field] = "   "

        with pytest.raises(ValidationError):
            BookCreate(**payload)

    def test_strips_surrounding_whitespace(self):
        book = BookCreate(title=" T ", author=" A ", isbn=" I ", category=" C ", total_copies=1)

        assert book.title == "T"
        assert book.author == "A"
        assert book.isbn == "I"
        assert book.category == "C"

    def test_rejects_negative_total_copies(self):
        with pytest.raises(ValidationError):
            BookCreate(title="T", author="A", isbn="I", category="C", total_copies=-1)

    def test_accepts_zero_total_copies(self):
        book = BookCreate(title="T", author="A", isbn="I", category="C", total_copies=0)

        assert book.total_copies == 0


class TestMemberCreate:
    def test_defaults_status_to_active(self):
        member = MemberCreate(name="Ada", email="ada@example.com")

        assert member.status == "active"

    def test_accepts_explicit_status(self):
        member = MemberCreate(name="Ada", email="ada@example.com", status="suspended")

        assert member.status == "suspended"

    def test_rejects_invalid_email(self):
        with pytest.raises(ValidationError):
            MemberCreate(name="Ada", email="not-an-email")


class TestBorrowingCreate:
    @pytest.mark.parametrize("book_id,member_id", [(0, 1), (-1, 1), (1, 0), (1, -1)])
    def test_rejects_non_positive_ids(self, book_id, member_id):
        with pytest.raises(ValidationError):
            BorrowingCreate(book_id=book_id, member_id=member_id)

    def test_due_at_is_optional(self):
        borrowing = BorrowingCreate(book_id=1, member_id=1)

        assert borrowing.due_at is None
