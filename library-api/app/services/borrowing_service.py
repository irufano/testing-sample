import math
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, UnprocessableEntityException
from app.models.book import Book
from app.models.borrowing import Borrowing
from app.models.member import Member
from app.repositories.book_repository import BookRepository
from app.repositories.borrowing_repository import BorrowingRepository
from app.repositories.member_repository import MemberRepository
from app.schemas.base_response import PaginatedData, Pagination
from app.schemas.borrowing import BorrowingCreate, BorrowingDetailResponse

DEFAULT_LOAN_PERIOD_DAYS = 14
MAX_ACTIVE_BORROWINGS_PER_MEMBER = 3


class BorrowingService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = BorrowingRepository(db)
        self.book_repo = BookRepository(db)
        self.member_repo = MemberRepository(db)

    def get(self, borrowing_id: int) -> Borrowing:
        borrowing = self.repo.get_by_id(borrowing_id)
        if not borrowing:
            raise NotFoundException(f"Borrowing with id {borrowing_id} not found")
        return borrowing

    def list(
        self,
        page: int,
        limit: int,
        status: str | None,
        member_id: int | None,
        book_id: int | None,
    ) -> PaginatedData[BorrowingDetailResponse]:
        items, total = self.repo.list(page=page, limit=limit, status=status, member_id=member_id, book_id=book_id)
        total_pages = math.ceil(total / limit) if limit else 0
        return PaginatedData[BorrowingDetailResponse](
            items=items, pagination=Pagination(page=page, limit=limit, total=total, total_pages=total_pages)
        )

    def borrow(self, payload: BorrowingCreate) -> Borrowing:
        book: Book | None = self.book_repo.get_by_id(payload.book_id)
        if not book:
            raise NotFoundException(f"Book with id {payload.book_id} not found")

        member: Member | None = self.member_repo.get_by_id(payload.member_id)
        if not member:
            raise NotFoundException(f"Member with id {payload.member_id} not found")

        if member.status != "active":
            raise UnprocessableEntityException(f"Member is not eligible to borrow (status: {member.status})")

        active_count = self.repo.count_active_for_member(member.id)
        if active_count >= MAX_ACTIVE_BORROWINGS_PER_MEMBER:
            raise UnprocessableEntityException(
                f"Member has reached the maximum of {MAX_ACTIVE_BORROWINGS_PER_MEMBER} active borrowings"
            )

        if book.available_copies <= 0:
            raise UnprocessableEntityException("No available copies for this book")

        now = datetime.now(timezone.utc)
        due_at = payload.due_at or (now + timedelta(days=DEFAULT_LOAN_PERIOD_DAYS))

        try:
            borrowing = Borrowing(
                book_id=book.id,
                member_id=member.id,
                borrowed_at=now,
                due_at=due_at,
                status="borrowed",
            )
            self.db.add(borrowing)
            book.available_copies -= 1
            self.db.add(book)
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

        self.db.refresh(borrowing)
        return self.get(borrowing.id)

    def return_book(self, borrowing_id: int) -> Borrowing:
        borrowing = self.get(borrowing_id)

        if borrowing.status == "returned":
            raise UnprocessableEntityException("Borrowing has already been returned")

        book = self.book_repo.get_by_id(borrowing.book_id)
        if not book:
            raise NotFoundException(f"Book with id {borrowing.book_id} not found")

        try:
            borrowing.returned_at = datetime.now(timezone.utc)
            borrowing.status = "returned"
            self.db.add(borrowing)

            book.available_copies = min(book.available_copies + 1, book.total_copies)
            self.db.add(book)
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

        return self.get(borrowing.id)
