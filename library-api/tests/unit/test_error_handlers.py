"""Unit tests for app.main's exception handlers, called directly (no HTTP layer).

Security-relevant: an unhandled exception must never leak a stacktrace to the
client in production, since that can expose internals (file paths, code
structure, library versions) to untrusted callers.
"""

import asyncio
import json

from fastapi.exceptions import RequestValidationError
from starlette.requests import Request

from app.core.config import settings
from app.main import unhandled_exception_handler, validation_exception_handler


def _request() -> Request:
    return Request({"type": "http", "method": "GET", "path": "/", "headers": []})


class TestUnhandledExceptionHandler:
    def test_hides_stacktrace_in_production(self, monkeypatch):
        monkeypatch.setattr(settings, "environment", "production")

        response = asyncio.run(unhandled_exception_handler(_request(), RuntimeError("boom")))

        assert response.status_code == 500
        body = json.loads(response.body)
        assert body["info"]["stacktrace"] is None
        assert body["info"]["message"] == "Internal Server Error"

    def test_includes_stacktrace_outside_production(self, monkeypatch):
        monkeypatch.setattr(settings, "environment", "development")

        # traceback.format_exc() (used by the handler) reads sys.exc_info(),
        # so the exception must actually be raised/caught, as FastAPI does
        # when it dispatches to this handler from within an except block.
        try:
            raise RuntimeError("boom")
        except RuntimeError as exc:
            response = asyncio.run(unhandled_exception_handler(_request(), exc))

        body = json.loads(response.body)
        assert body["info"]["stacktrace"] is not None
        assert "RuntimeError" in body["info"]["stacktrace"]


class TestValidationExceptionHandler:
    def test_message_includes_offending_field(self):
        errors = [{"loc": ("body", "title"), "msg": "field required", "type": "missing"}]
        exc = RequestValidationError(errors)

        response = asyncio.run(validation_exception_handler(_request(), exc))

        assert response.status_code == 422
        body = json.loads(response.body)
        assert body["info"]["message"] == "title: field required"

    def test_falls_back_to_generic_message_when_no_errors(self):
        exc = RequestValidationError([])

        response = asyncio.run(validation_exception_handler(_request(), exc))

        body = json.loads(response.body)
        assert body["info"]["message"] == "Invalid request"
