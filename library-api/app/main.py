import traceback

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.router import api_router
from app.core.config import settings
from app.core.exceptions import AppException
from app.schemas.base_response import BaseResponse

app = FastAPI(
    title=settings.project_name,
    description="REST API for the Library Management System.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_v1_prefix)


def _envelope(code: int, message: str, stacktrace: str | None = None) -> JSONResponse:
    body = BaseResponse.error(code=code, message=message, stacktrace=stacktrace)
    return JSONResponse(status_code=code, content=body.model_dump())


@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return _envelope(exc.code, exc.message)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    message = exc.detail if isinstance(exc.detail, str) else "Request failed"
    return _envelope(exc.status_code, message)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = exc.errors()
    if errors:
        first = errors[0]
        field = ".".join(str(loc) for loc in first.get("loc", []) if loc != "body")
        message = f"{field}: {first.get('msg')}" if field else first.get("msg", "Invalid request")
    else:
        message = "Invalid request"
    return _envelope(422, message)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    stacktrace = None if settings.is_production else traceback.format_exc()
    return _envelope(500, "Internal Server Error", stacktrace=stacktrace)


@app.get("/", tags=["Health"])
def root():
    return BaseResponse.success(data={"service": settings.project_name, "status": "running"})


@app.get("/health", tags=["Health"])
def health():
    return BaseResponse.success(data={"status": "healthy"})
