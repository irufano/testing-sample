from fastapi import APIRouter

from app.api.routes import books, borrowings, members

api_router = APIRouter()
api_router.include_router(books.router)
api_router.include_router(members.router)
api_router.include_router(borrowings.router)
