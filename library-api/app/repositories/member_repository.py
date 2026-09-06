from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.member import Member


class MemberRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, member_id: int) -> Member | None:
        return self.db.get(Member, member_id)

    def get_by_email(self, email: str) -> Member | None:
        return self.db.scalar(select(Member).where(Member.email == email))

    def list(
        self,
        page: int,
        limit: int,
        search: str | None = None,
        status: str | None = None,
    ) -> tuple[list[Member], int]:
        stmt = select(Member)
        count_stmt = select(func.count()).select_from(Member)

        if search:
            like = f"%{search}%"
            condition = or_(Member.name.ilike(like), Member.email.ilike(like))
            stmt = stmt.where(condition)
            count_stmt = count_stmt.where(condition)

        if status:
            stmt = stmt.where(Member.status == status)
            count_stmt = count_stmt.where(Member.status == status)

        total = self.db.scalar(count_stmt) or 0

        stmt = stmt.order_by(Member.id.desc()).offset((page - 1) * limit).limit(limit)
        items = list(self.db.scalars(stmt).all())
        return items, total

    def create(self, member: Member) -> Member:
        self.db.add(member)
        self.db.commit()
        self.db.refresh(member)
        return member

    def update(self, member: Member) -> Member:
        self.db.commit()
        self.db.refresh(member)
        return member

    def delete(self, member: Member) -> None:
        self.db.delete(member)
        self.db.commit()
