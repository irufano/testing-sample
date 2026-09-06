from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.borrowing import Borrowing


class BorrowingRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, borrowing_id: int) -> Borrowing | None:
        stmt = (
            select(Borrowing)
            .options(joinedload(Borrowing.book), joinedload(Borrowing.member))
            .where(Borrowing.id == borrowing_id)
        )
        return self.db.scalar(stmt)

    def list(
        self,
        page: int,
        limit: int,
        status: str | None = None,
        member_id: int | None = None,
        book_id: int | None = None,
    ) -> tuple[list[Borrowing], int]:
        stmt = select(Borrowing).options(joinedload(Borrowing.book), joinedload(Borrowing.member))
        count_stmt = select(func.count()).select_from(Borrowing)

        if status:
            stmt = stmt.where(Borrowing.status == status)
            count_stmt = count_stmt.where(Borrowing.status == status)
        if member_id:
            stmt = stmt.where(Borrowing.member_id == member_id)
            count_stmt = count_stmt.where(Borrowing.member_id == member_id)
        if book_id:
            stmt = stmt.where(Borrowing.book_id == book_id)
            count_stmt = count_stmt.where(Borrowing.book_id == book_id)

        total = self.db.scalar(count_stmt) or 0

        stmt = stmt.order_by(Borrowing.id.desc()).offset((page - 1) * limit).limit(limit)
        items = list(self.db.scalars(stmt).unique().all())
        return items, total

    def create(self, borrowing: Borrowing) -> Borrowing:
        self.db.add(borrowing)
        self.db.commit()
        self.db.refresh(borrowing)
        return borrowing

    def update(self, borrowing: Borrowing) -> Borrowing:
        self.db.commit()
        self.db.refresh(borrowing)
        return borrowing

    def has_active_for_book(self, book_id: int) -> bool:
        stmt = select(Borrowing.id).where(Borrowing.book_id == book_id, Borrowing.status == "borrowed").limit(1)
        return self.db.scalar(stmt) is not None

    def has_any_for_book(self, book_id: int) -> bool:
        stmt = select(Borrowing.id).where(Borrowing.book_id == book_id).limit(1)
        return self.db.scalar(stmt) is not None

    def has_active_for_member(self, member_id: int) -> bool:
        stmt = select(Borrowing.id).where(Borrowing.member_id == member_id, Borrowing.status == "borrowed").limit(1)
        return self.db.scalar(stmt) is not None

    def count_active_for_member(self, member_id: int) -> int:
        stmt = (
            select(func.count())
            .select_from(Borrowing)
            .where(Borrowing.member_id == member_id, Borrowing.status == "borrowed")
        )
        return self.db.scalar(stmt) or 0

    def has_any_for_member(self, member_id: int) -> bool:
        stmt = select(Borrowing.id).where(Borrowing.member_id == member_id).limit(1)
        return self.db.scalar(stmt) is not None
