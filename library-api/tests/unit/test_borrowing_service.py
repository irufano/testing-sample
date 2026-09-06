"""Unit tests for BorrowingService business logic, isolated from the database.

The repositories are collaborators, not the code under test: they're
replaced with mocks so each test exercises only the service's own decision
rules (eligibility checks, due-date defaulting, availability accounting).
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest

from app.core.exceptions import NotFoundException, UnprocessableEntityException
from app.models.book import Book
from app.models.borrowing import Borrowing
from app.models.member import Member
from app.schemas.borrowing import BorrowingCreate
from app.services.borrowing_service import DEFAULT_LOAN_PERIOD_DAYS, BorrowingService


def _service() -> BorrowingService:
    service = BorrowingService(db=MagicMock())
    service.repo = MagicMock()
    service.book_repo = MagicMock()
    service.member_repo = MagicMock()
    return service


def _book(**overrides) -> Book:
    defaults = dict(id=1, total_copies=2, available_copies=2)
    defaults.update(overrides)
    return Book(**defaults)


def _member(**overrides) -> Member:
    defaults = dict(id=1, status="active")
    defaults.update(overrides)
    return Member(**defaults)


def _capture_added(service: BorrowingService) -> dict:
    """Records objects passed to db.add(), keyed by model class name."""
    added: dict = {}
    service.db.add.side_effect = lambda obj: added.setdefault(type(obj).__name__, obj)
    return added


class TestBorrow:
    def test_raises_not_found_when_book_missing(self):
        service = _service()
        service.book_repo.get_by_id.return_value = None

        with pytest.raises(NotFoundException):
            service.borrow(BorrowingCreate(book_id=1, member_id=1))

    def test_raises_not_found_when_member_missing(self):
        service = _service()
        service.book_repo.get_by_id.return_value = _book()
        service.member_repo.get_by_id.return_value = None

        with pytest.raises(NotFoundException):
            service.borrow(BorrowingCreate(book_id=1, member_id=1))

    def test_rejects_inactive_member(self):
        service = _service()
        service.book_repo.get_by_id.return_value = _book()
        service.member_repo.get_by_id.return_value = _member(status="suspended")

        with pytest.raises(UnprocessableEntityException):
            service.borrow(BorrowingCreate(book_id=1, member_id=1))

    def test_rejects_when_no_copies_available(self):
        service = _service()
        service.book_repo.get_by_id.return_value = _book(available_copies=0)
        service.member_repo.get_by_id.return_value = _member()

        with pytest.raises(UnprocessableEntityException):
            service.borrow(BorrowingCreate(book_id=1, member_id=1))

    def test_decrements_available_copies_and_defaults_due_date(self):
        service = _service()
        book = _book(available_copies=2)
        service.book_repo.get_by_id.return_value = book
        service.member_repo.get_by_id.return_value = _member()
        service.repo.get_by_id.return_value = "final-result"
        added = _capture_added(service)

        before = datetime.now(timezone.utc)
        result = service.borrow(BorrowingCreate(book_id=1, member_id=1))
        after = datetime.now(timezone.utc)

        assert book.available_copies == 1
        assert result == "final-result"
        borrowing = added["Borrowing"]
        assert borrowing.status == "borrowed"
        assert before + timedelta(days=DEFAULT_LOAN_PERIOD_DAYS) <= borrowing.due_at
        assert borrowing.due_at <= after + timedelta(days=DEFAULT_LOAN_PERIOD_DAYS, seconds=5)

    def test_respects_explicit_due_at(self):
        service = _service()
        service.book_repo.get_by_id.return_value = _book()
        service.member_repo.get_by_id.return_value = _member()
        service.repo.get_by_id.return_value = "final-result"
        added = _capture_added(service)
        due_at = datetime(2030, 1, 1, tzinfo=timezone.utc)

        service.borrow(BorrowingCreate(book_id=1, member_id=1, due_at=due_at))

        assert added["Borrowing"].due_at == due_at


class TestReturnBook:
    def test_raises_not_found_when_borrowing_missing(self):
        service = _service()
        service.repo.get_by_id.return_value = None

        with pytest.raises(NotFoundException):
            service.return_book(1)

    def test_rejects_already_returned_borrowing(self):
        service = _service()
        service.repo.get_by_id.return_value = Borrowing(id=1, book_id=1, member_id=1, status="returned")

        with pytest.raises(UnprocessableEntityException):
            service.return_book(1)

    def test_raises_not_found_when_borrowings_book_is_missing(self):
        service = _service()
        service.repo.get_by_id.return_value = Borrowing(id=1, book_id=1, member_id=1, status="borrowed")
        service.book_repo.get_by_id.return_value = None

        with pytest.raises(NotFoundException):
            service.return_book(1)

    def test_restores_available_copies_and_marks_returned(self):
        service = _service()
        borrowing = Borrowing(id=1, book_id=1, member_id=1, status="borrowed")
        service.repo.get_by_id.return_value = borrowing
        book = _book(available_copies=1, total_copies=2)
        service.book_repo.get_by_id.return_value = book

        result = service.return_book(1)

        assert result is borrowing
        assert borrowing.status == "returned"
        assert borrowing.returned_at is not None
        assert book.available_copies == 2

    def test_caps_available_copies_at_total_copies(self):
        service = _service()
        borrowing = Borrowing(id=1, book_id=1, member_id=1, status="borrowed")
        service.repo.get_by_id.return_value = borrowing
        # total_copies was reduced after this borrowing was made, so
        # available_copies is already at (the new, lower) total.
        book = _book(available_copies=2, total_copies=2)
        service.book_repo.get_by_id.return_value = book

        service.return_book(1)

        assert book.available_copies == 2  # not 3
