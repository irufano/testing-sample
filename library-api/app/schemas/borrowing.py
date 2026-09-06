from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.book import BookResponse
from app.schemas.member import MemberResponse

BorrowingStatus = Literal["borrowed", "returned", "overdue"]


class BorrowingCreate(BaseModel):
    book_id: int = Field(gt=0)
    member_id: int = Field(gt=0)
    due_at: datetime | None = None


class BorrowingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    book_id: int
    member_id: int
    borrowed_at: datetime
    due_at: datetime
    returned_at: datetime | None
    status: BorrowingStatus
    created_at: datetime
    updated_at: datetime


class BorrowingDetailResponse(BorrowingResponse):
    book: BookResponse
    member: MemberResponse
