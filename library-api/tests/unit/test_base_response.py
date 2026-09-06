"""Unit tests for the shared response envelope (pure, no DB/HTTP)."""

from app.schemas.base_response import BaseResponse


def test_success_envelope_defaults():
    response = BaseResponse.success(data={"a": 1})

    assert response.status == "success"
    assert response.info.code == 200
    assert response.info.message == "OK"
    assert response.info.stacktrace is None
    assert response.data == {"a": 1}


def test_success_envelope_accepts_custom_code_and_message():
    response = BaseResponse.success(data=None, code=201, message="Created")

    assert response.info.code == 201
    assert response.info.message == "Created"


def test_error_envelope_carries_status_and_optional_stacktrace():
    response = BaseResponse.error(code=500, message="boom", stacktrace="Traceback...")

    assert response.status == "error"
    assert response.info.code == 500
    assert response.info.message == "boom"
    assert response.info.stacktrace == "Traceback..."


def test_error_envelope_stacktrace_defaults_to_none():
    response = BaseResponse.error(code=404, message="not found")

    assert response.info.stacktrace is None
