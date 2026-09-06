from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.book import Book


class BookRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, book_id: int) -> Book | None:
        return self.db.get(Book, book_id)

    def get_by_isbn(self, isbn: str) -> Book | None:
        return self.db.scalar(select(Book).where(Book.isbn == isbn))

    def list(
        self,
        page: int,
        limit: int,
        search: str | None = None,
        category: str | None = None,
    ) -> tuple[list[Book], int]:
        stmt = select(Book)
        count_stmt = select(func.count()).select_from(Book)

        if search:
            like = f"%{search}%"
            condition = or_(Book.title.ilike(like), Book.author.ilike(like), Book.isbn.ilike(like))
            stmt = stmt.where(condition)
            count_stmt = count_stmt.where(condition)

        if category:
            stmt = stmt.where(Book.category == category)
            count_stmt = count_stmt.where(Book.category == category)

        total = self.db.scalar(count_stmt) or 0

        stmt = stmt.order_by(Book.id.desc()).offset((page - 1) * limit).limit(limit)
        items = list(self.db.scalars(stmt).all())
        return items, total

    def create(self, book: Book) -> Book:
        self.db.add(book)
        self.db.commit()
        self.db.refresh(book)
        return book

    def update(self, book: Book) -> Book:
        self.db.commit()
        self.db.refresh(book)
        return book

    def delete(self, book: Book) -> None:
        self.db.delete(book)
        self.db.commit()
