from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.base_response import BaseResponse, PaginatedData
from app.schemas.book import BookCreate, BookResponse, BookUpdate
from app.services.book_service import BookService

router = APIRouter(prefix="/books", tags=["Books"])


@router.get("", response_model=BaseResponse[PaginatedData[BookResponse]])
def list_books(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, description="Search by title, author or ISBN"),
    category: str | None = Query(None),
    db: Session = Depends(get_db),
):
    service = BookService(db)
    result = service.list(page=page, limit=limit, search=search, category=category)
    return BaseResponse.success(data=result)


@router.get("/{book_id}", response_model=BaseResponse[BookResponse])
def get_book(book_id: int, db: Session = Depends(get_db)):
    service = BookService(db)
    book = service.get(book_id)
    return BaseResponse.success(data=book)


@router.post("", response_model=BaseResponse[BookResponse], status_code=201)
def create_book(payload: BookCreate, db: Session = Depends(get_db)):
    service = BookService(db)
    book = service.create(payload)
    return BaseResponse.success(data=book, code=201, message="Created")


@router.put("/{book_id}", response_model=BaseResponse[BookResponse])
def update_book(book_id: int, payload: BookUpdate, db: Session = Depends(get_db)):
    service = BookService(db)
    book = service.update(book_id, payload)
    return BaseResponse.success(data=book)


@router.delete("/{book_id}", response_model=BaseResponse[None])
def delete_book(book_id: int, db: Session = Depends(get_db)):
    service = BookService(db)
    service.delete(book_id)
    return BaseResponse.success(data=None, message="Book deleted")
