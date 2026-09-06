import math

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictException, NotFoundException, UnprocessableEntityException
from app.models.member import Member
from app.repositories.borrowing_repository import BorrowingRepository
from app.repositories.member_repository import MemberRepository
from app.schemas.base_response import PaginatedData, Pagination
from app.schemas.member import MemberCreate, MemberResponse, MemberUpdate


class MemberService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = MemberRepository(db)
        self.borrowing_repo = BorrowingRepository(db)

    def get(self, member_id: int) -> Member:
        member = self.repo.get_by_id(member_id)
        if not member:
            raise NotFoundException(f"Member with id {member_id} not found")
        return member

    def list(self, page: int, limit: int, search: str | None, status: str | None) -> PaginatedData[MemberResponse]:
        items, total = self.repo.list(page=page, limit=limit, search=search, status=status)
        total_pages = math.ceil(total / limit) if limit else 0
        return PaginatedData[MemberResponse](
            items=items, pagination=Pagination(page=page, limit=limit, total=total, total_pages=total_pages)
        )

    def create(self, payload: MemberCreate) -> Member:
        if self.repo.get_by_email(payload.email):
            raise ConflictException("Member email already exists")

        member = Member(
            name=payload.name,
            email=payload.email,
            phone=payload.phone,
            status=payload.status,
        )
        return self.repo.create(member)

    def update(self, member_id: int, payload: MemberUpdate) -> Member:
        member = self.get(member_id)

        if payload.email and payload.email != member.email:
            existing = self.repo.get_by_email(payload.email)
            if existing and existing.id != member_id:
                raise ConflictException("Member email already exists")

        data = payload.model_dump(exclude_unset=True)
        for field, value in data.items():
            setattr(member, field, value)

        return self.repo.update(member)

    def delete(self, member_id: int) -> None:
        member = self.get(member_id)
        if self.borrowing_repo.has_active_for_member(member_id):
            raise UnprocessableEntityException("Cannot delete a member with active borrowings")
        if self.borrowing_repo.has_any_for_member(member_id):
            raise ConflictException("Cannot delete a member with existing borrowing history")
        self.repo.delete(member)
