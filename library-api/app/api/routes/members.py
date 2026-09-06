from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.base_response import BaseResponse, PaginatedData
from app.schemas.member import MemberCreate, MemberResponse, MemberUpdate
from app.services.member_service import MemberService

router = APIRouter(prefix="/members", tags=["Members"])


@router.get("", response_model=BaseResponse[PaginatedData[MemberResponse]])
def list_members(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, description="Search by name or email"),
    status: str | None = Query(None, description="Filter by member status"),
    db: Session = Depends(get_db),
):
    service = MemberService(db)
    result = service.list(page=page, limit=limit, search=search, status=status)
    return BaseResponse.success(data=result)


@router.get("/{member_id}", response_model=BaseResponse[MemberResponse])
def get_member(member_id: int, db: Session = Depends(get_db)):
    service = MemberService(db)
    member = service.get(member_id)
    return BaseResponse.success(data=member)


@router.post("", response_model=BaseResponse[MemberResponse], status_code=201)
def create_member(payload: MemberCreate, db: Session = Depends(get_db)):
    service = MemberService(db)
    member = service.create(payload)
    return BaseResponse.success(data=member, code=201, message="Created")


@router.put("/{member_id}", response_model=BaseResponse[MemberResponse])
def update_member(member_id: int, payload: MemberUpdate, db: Session = Depends(get_db)):
    service = MemberService(db)
    member = service.update(member_id, payload)
    return BaseResponse.success(data=member)


@router.delete("/{member_id}", response_model=BaseResponse[None])
def delete_member(member_id: int, db: Session = Depends(get_db)):
    service = MemberService(db)
    service.delete(member_id)
    return BaseResponse.success(data=None, message="Member deleted")
