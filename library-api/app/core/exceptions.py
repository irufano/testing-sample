"""Application/business exceptions.

These are raised from the service layer and translated into the standard
BaseResponse envelope by the global exception handlers in app.main.
"""


class AppException(Exception):
    """Base class for all application/business exceptions."""

    code: int = 400
    message: str = "Application error"

    def __init__(self, message: str | None = None, code: int | None = None) -> None:
        self.message = message or self.message
        self.code = code or self.code
        super().__init__(self.message)


class NotFoundException(AppException):
    code = 404
    message = "Resource not found"


class ConflictException(AppException):
    code = 409
    message = "Conflict"


class BadRequestException(AppException):
    code = 400
    message = "Bad request"


class UnprocessableEntityException(AppException):
    code = 422
    message = "Invalid request"
