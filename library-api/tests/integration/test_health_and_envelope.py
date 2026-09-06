"""Integration tests for health endpoints and the shared response envelope.

These exercise app.main's exception handlers through real HTTP requests,
verifying every response (success or error) uses the BaseResponse envelope
and that the HTTP status code always matches `info.code`.
"""


def test_health_endpoint(client):
    response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert body["info"] == {"code": 200, "message": "OK", "stacktrace": None}
    assert body["data"] == {"status": "healthy"}


def test_root_returns_success_envelope(client):
    response = client.get("/")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert body["info"]["code"] == response.status_code
    assert body["data"]["status"] == "running"


def test_unknown_route_returns_error_envelope_with_matching_status(client):
    response = client.get("/this-route-does-not-exist")

    assert response.status_code == 404
    body = response.json()
    assert body["status"] == "error"
    assert body["info"]["code"] == response.status_code == 404


def test_not_found_business_exception_matches_http_status(client):
    response = client.get("/api/v1/books/999999")

    assert response.status_code == 404
    body = response.json()
    assert body["status"] == "error"
    assert body["info"]["code"] == response.status_code == 404
    assert "not found" in body["info"]["message"].lower()


def test_validation_error_returns_422_with_field_in_message(client):
    # Missing every required field of BookCreate.
    response = client.post("/api/v1/books", json={})

    assert response.status_code == 422
    body = response.json()
    assert body["status"] == "error"
    assert body["info"]["code"] == response.status_code == 422
    assert "title" in body["info"]["message"]


def test_path_param_type_mismatch_returns_422_not_500(client):
    response = client.get("/api/v1/books/not-an-int")

    assert response.status_code == 422
    body = response.json()
    assert body["status"] == "error"
    assert body["info"]["code"] == response.status_code == 422


def test_business_exceptions_never_carry_a_stacktrace(client):
    response = client.get("/api/v1/books/999999")

    assert response.status_code == 404
    assert response.json()["info"]["stacktrace"] is None
