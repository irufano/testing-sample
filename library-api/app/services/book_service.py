import math

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictException, NotFoundException, UnprocessableEntityException
from app.models.book import Book
from app.repositories.book_repository import BookRepository
from app.repositories.borrowing_repository import BorrowingRepository
from app.schemas.base_response import PaginatedData, Pagination
from app.schemas.book import BookCreate, BookResponse, BookUpdate


class BookService:
    def __init__(self, db: Session) -> None:
        self.repo = BookRepository(db)
        self.borrowing_repo = BorrowingRepository(db)

    def get(self, book_id: int) -> Book:
        book = self.repo.get_by_id(book_id)
        if not book:
            raise NotFoundException(f"Book with id {book_id} not found")
        return book

    def list(self, page: int, limit: int, search: str | None, category: str | None) -> PaginatedData[BookResponse]:
        items, total = self.repo.list(page=page, limit=limit, search=search, category=category)
        total_pages = math.ceil(total / limit) if limit else 0
        return PaginatedData[BookResponse](
            items=items, pagination=Pagination(page=page, limit=limit, total=total, total_pages=total_pages)
        )

    def create(self, payload: BookCreate) -> Book:
        if self.repo.get_by_isbn(payload.isbn):
            raise ConflictException("ISBN already exists")

        book = Book(
            title=payload.title,
            author=payload.author,
            isbn=payload.isbn,
            category=payload.category,
            description=payload.description,
            total_copies=payload.total_copies,
            available_copies=payload.total_copies,
        )
        return self.repo.create(book)

    def update(self, book_id: int, payload: BookUpdate) -> Book:
        book = self.get(book_id)

        if payload.isbn and payload.isbn != book.isbn:
            existing = self.repo.get_by_isbn(payload.isbn)
            if existing and existing.id != book_id:
                raise ConflictException("ISBN already exists")

        data = payload.model_dump(exclude_unset=True)

        if "total_copies" in data:
            new_total = data["total_copies"]
            borrowed = book.total_copies - book.available_copies
            if new_total < borrowed:
                raise UnprocessableEntityException(
                    f"total_copies cannot be less than currently borrowed copies ({borrowed})"
                )
            book.available_copies = new_total - borrowed

        for field, value in data.items():
            setattr(book, field, value)

        return self.repo.update(book)

    def delete(self, book_id: int) -> None:
        book = self.get(book_id)
        if self.borrowing_repo.has_active_for_book(book_id):
            raise UnprocessableEntityException("Cannot delete a book with active borrowings")
        if self.borrowing_repo.has_any_for_book(book_id):
            raise ConflictException("Cannot delete a book with existing borrowing history")
        self.repo.delete(book)
