"""Unit tests for BookService business logic, isolated from the database.

The repositories are collaborators, not the code under test: they're
replaced with mocks so each test exercises only the service's own decision
rules (conflict checks, copies reconciliation, delete guards).
"""

from unittest.mock import MagicMock

import pytest

from app.core.exceptions import ConflictException, NotFoundException, UnprocessableEntityException
from app.models.book import Book
from app.schemas.book import BookCreate, BookUpdate
from app.services.book_service import BookService


def _service() -> BookService:
    service = BookService(db=MagicMock())
    service.repo = MagicMock()
    service.borrowing_repo = MagicMock()
    return service


def _book(**overrides) -> Book:
    defaults = dict(
        id=1,
        title="Title",
        author="Author",
        isbn="ISBN-1",
        category="Category",
        description=None,
        total_copies=5,
        available_copies=5,
    )
    defaults.update(overrides)
    return Book(**defaults)


class TestCreate:
    def test_raises_conflict_when_isbn_already_exists(self):
        service = _service()
        service.repo.get_by_isbn.return_value = _book()
        payload = BookCreate(title="New", author="A", isbn="ISBN-1", category="C", total_copies=1)

        with pytest.raises(ConflictException):
            service.create(payload)

        service.repo.create.assert_not_called()

    def test_seeds_available_copies_from_total_copies(self):
        service = _service()
        service.repo.get_by_isbn.return_value = None
        service.repo.create.side_effect = lambda book: book
        payload = BookCreate(title="New", author="A", isbn="ISBN-2", category="C", total_copies=4)

        result = service.create(payload)

        assert result.total_copies == 4
        assert result.available_copies == 4


class TestUpdate:
    def test_raises_not_found_when_book_missing(self):
        service = _service()
        service.repo.get_by_id.return_value = None

        with pytest.raises(NotFoundException):
            service.update(1, BookUpdate(title="X"))

    def test_raises_conflict_when_new_isbn_belongs_to_another_book(self):
        service = _service()
        service.repo.get_by_id.return_value = _book(id=1, isbn="ISBN-1")
        service.repo.get_by_isbn.return_value = _book(id=2, isbn="ISBN-2")

        with pytest.raises(ConflictException):
            service.update(1, BookUpdate(isbn="ISBN-2"))

    def test_allows_isbn_update_to_its_own_current_value(self):
        service = _service()
        book = _book(id=1, isbn="ISBN-1")
        service.repo.get_by_id.return_value = book
        service.repo.update.side_effect = lambda b: b

        result = service.update(1, BookUpdate(isbn="ISBN-1"))

        assert result.isbn == "ISBN-1"
        service.repo.get_by_isbn.assert_not_called()

    def test_increasing_total_copies_increases_available_by_same_delta(self):
        service = _service()
        book = _book(total_copies=3, available_copies=3)
        service.repo.get_by_id.return_value = book
        service.repo.update.side_effect = lambda b: b

        result = service.update(1, BookUpdate(total_copies=5))

        assert result.total_copies == 5
        assert result.available_copies == 5

    def test_reducing_total_copies_accounts_for_already_borrowed_copies(self):
        service = _service()
        book = _book(total_copies=5, available_copies=3)  # 2 currently borrowed
        service.repo.get_by_id.return_value = book
        service.repo.update.side_effect = lambda b: b

        result = service.update(1, BookUpdate(total_copies=4))

        assert result.total_copies == 4
        assert result.available_copies == 2  # 4 - 2 borrowed

    def test_rejects_total_copies_below_currently_borrowed(self):
        service = _service()
        book = _book(total_copies=5, available_copies=3)  # 2 currently borrowed
        service.repo.get_by_id.return_value = book

        with pytest.raises(UnprocessableEntityException):
            service.update(1, BookUpdate(total_copies=1))

        service.repo.update.assert_not_called()


class TestDelete:
    def test_raises_not_found_when_book_missing(self):
        service = _service()
        service.repo.get_by_id.return_value = None

        with pytest.raises(NotFoundException):
            service.delete(1)

    def test_raises_unprocessable_when_book_has_active_borrowing(self):
        service = _service()
        service.repo.get_by_id.return_value = _book()
        service.borrowing_repo.has_active_for_book.return_value = True

        with pytest.raises(UnprocessableEntityException):
            service.delete(1)

        service.repo.delete.assert_not_called()

    def test_raises_conflict_when_book_has_borrowing_history(self):
        service = _service()
        service.repo.get_by_id.return_value = _book()
        service.borrowing_repo.has_active_for_book.return_value = False
        service.borrowing_repo.has_any_for_book.return_value = True

        with pytest.raises(ConflictException):
            service.delete(1)

        service.repo.delete.assert_not_called()

    def test_deletes_when_no_borrowing_history(self):
        service = _service()
        book = _book()
        service.repo.get_by_id.return_value = book
        service.borrowing_repo.has_active_for_book.return_value = False
        service.borrowing_repo.has_any_for_book.return_value = False

        service.delete(1)

        service.repo.delete.assert_called_once_with(book)
