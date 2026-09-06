from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.base_response import BaseResponse, PaginatedData
from app.schemas.borrowing import BorrowingCreate, BorrowingDetailResponse
from app.services.borrowing_service import BorrowingService

router = APIRouter(prefix="/borrowings", tags=["Borrowings"])


@router.get("", response_model=BaseResponse[PaginatedData[BorrowingDetailResponse]])
def list_borrowings(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: str | None = Query(None, description="borrowed | returned | overdue"),
    member_id: int | None = Query(None),
    book_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    service = BorrowingService(db)
    result = service.list(page=page, limit=limit, status=status, member_id=member_id, book_id=book_id)
    return BaseResponse.success(data=result)


@router.get("/{borrowing_id}", response_model=BaseResponse[BorrowingDetailResponse])
def get_borrowing(borrowing_id: int, db: Session = Depends(get_db)):
    service = BorrowingService(db)
    borrowing = service.get(borrowing_id)
    return BaseResponse.success(data=borrowing)


@router.post("", response_model=BaseResponse[BorrowingDetailResponse], status_code=201)
def create_borrowing(payload: BorrowingCreate, db: Session = Depends(get_db)):
    service = BorrowingService(db)
    borrowing = service.borrow(payload)
    return BaseResponse.success(data=borrowing, code=201, message="Created")


@router.post("/{borrowing_id}/return", response_model=BaseResponse[BorrowingDetailResponse])
def return_borrowing(borrowing_id: int, db: Session = Depends(get_db)):
    service = BorrowingService(db)
    borrowing = service.return_book(borrowing_id)
    return BaseResponse.success(data=borrowing, message="Book returned")
