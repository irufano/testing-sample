from typing import Generic, Literal, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiInfo(BaseModel):
    code: int
    message: str
    stacktrace: str | None = None


class BaseResponse(BaseModel, Generic[T]):
    status: Literal["success", "error"]
    info: ApiInfo
    data: T | None = None

    @classmethod
    def success(cls, data: T | None = None, code: int = 200, message: str = "OK") -> "BaseResponse[T]":
        return cls(status="success", info=ApiInfo(code=code, message=message, stacktrace=None), data=data)

    @classmethod
    def error(
        cls,
        code: int,
        message: str,
        stacktrace: str | None = None,
        data: T | None = None,
    ) -> "BaseResponse[T]":
        return cls(status="error", info=ApiInfo(code=code, message=message, stacktrace=stacktrace), data=data)


class Pagination(BaseModel):
    page: int
    limit: int
    total: int
    total_pages: int


class PaginatedData(BaseModel, Generic[T]):
    items: list[T]
    pagination: Pagination
