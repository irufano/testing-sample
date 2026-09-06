"""Integration tests for /api/v1/members: full route -> service -> repository -> db stack."""


class TestCreateMember:
    def test_create_defaults_status_to_active(self, client, make_member):
        member = make_member()

        assert member["status"] == "active"

    def test_create_accepts_explicit_status(self, client, make_member):
        member = make_member(status="suspended")

        assert member["status"] == "suspended"

    def test_create_rejects_duplicate_email(self, client, make_member):
        make_member(email="dup@example.com")

        response = client.post(
            "/api/v1/members", json={"name": "Another Person", "email": "dup@example.com"}
        )

        assert response.status_code == 409
        assert "email" in response.json()["info"]["message"].lower()

    def test_create_rejects_invalid_email(self, client):
        response = client.post("/api/v1/members", json={"name": "Someone", "email": "not-an-email"})

        assert response.status_code == 422


class TestGetMember:
    def test_get_existing_member(self, client, make_member):
        member = make_member()

        response = client.get(f"/api/v1/members/{member['id']}")

        assert response.status_code == 200
        assert response.json()["data"] == member

    def test_get_missing_member_returns_404(self, client):
        response = client.get("/api/v1/members/999999")

        assert response.status_code == 404


class TestUpdateMember:
    def test_update_partial_fields(self, client, make_member):
        member = make_member(name="Original Name", phone="000")

        response = client.put(f"/api/v1/members/{member['id']}", json={"phone": "111-222"})

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["phone"] == "111-222"
        assert data["name"] == "Original Name"

    def test_update_missing_member_returns_404(self, client):
        response = client.put("/api/v1/members/999999", json={"phone": "111"})

        assert response.status_code == 404

    def test_update_email_conflict_with_another_member(self, client, make_member):
        member_a = make_member(email="a@example.com")
        member_b = make_member(email="b@example.com")

        response = client.put(f"/api/v1/members/{member_b['id']}", json={"email": member_a["email"]})

        assert response.status_code == 409

    def test_update_email_to_its_own_current_value_is_allowed(self, client, make_member):
        member = make_member(email="same@example.com")

        response = client.put(f"/api/v1/members/{member['id']}", json={"email": "same@example.com"})

        assert response.status_code == 200
        assert response.json()["data"]["email"] == "same@example.com"

    def test_update_status_changes_eligibility(self, client, make_member, make_book, make_borrowing):
        member = make_member()
        book = make_book()

        client.put(f"/api/v1/members/{member['id']}", json={"status": "suspended"})

        response = client.post(
            "/api/v1/borrowings", json={"book_id": book["id"], "member_id": member["id"]}
        )

        assert response.status_code == 422
        assert "not eligible" in response.json()["info"]["message"].lower()


class TestDeleteMember:
    def test_delete_missing_member_returns_404(self, client):
        response = client.delete("/api/v1/members/999999")

        assert response.status_code == 404

    def test_delete_member_with_no_borrowings_succeeds(self, client, make_member):
        member = make_member()

        response = client.delete(f"/api/v1/members/{member['id']}")

        assert response.status_code == 200
        assert client.get(f"/api/v1/members/{member['id']}").status_code == 404

    def test_delete_member_with_active_borrowing_is_rejected(self, client, make_member, make_book, make_borrowing):
        member = make_member()
        book = make_book()
        make_borrowing(book["id"], member["id"])

        response = client.delete(f"/api/v1/members/{member['id']}")

        assert response.status_code == 422

    def test_delete_member_with_returned_borrowing_history_is_rejected_as_conflict(
        self, client, make_member, make_book, make_borrowing
    ):
        member = make_member()
        book = make_book()
        borrowing = make_borrowing(book["id"], member["id"])
        client.post(f"/api/v1/borrowings/{borrowing['id']}/return")

        response = client.delete(f"/api/v1/members/{member['id']}")

        assert response.status_code == 409


class TestListMembers:
    def test_search_matches_name_or_email(self, client, make_member):
        member = make_member(name="Grace Hopper", email="grace.hopper@example.com")

        for query in ["grace", "HOPPER@EXAMPLE"]:
            response = client.get("/api/v1/members", params={"search": query})
            ids = [item["id"] for item in response.json()["data"]["items"]]
            assert member["id"] in ids, f"expected match for search={query!r}"

    def test_filter_by_status(self, client, make_member):
        make_member(status="active")
        make_member(status="suspended")

        response = client.get("/api/v1/members", params={"status": "suspended"})

        data = response.json()["data"]
        assert data["pagination"]["total"] == 1
        assert all(item["status"] == "suspended" for item in data["items"])

    def test_pagination(self, client, make_member):
        created_ids = {make_member()["id"] for _ in range(3)}

        page1 = client.get("/api/v1/members", params={"page": 1, "limit": 2}).json()["data"]
        page2 = client.get("/api/v1/members", params={"page": 2, "limit": 2}).json()["data"]

        assert page1["pagination"]["total"] == 3
        assert page1["pagination"]["total_pages"] == 2
        assert len(page1["items"]) == 2
        assert len(page2["items"]) == 1
        seen_ids = {item["id"] for item in page1["items"] + page2["items"]}
        assert seen_ids == created_ids

    def test_search_input_is_not_vulnerable_to_sql_injection(self, client, make_member):
        member = make_member(name="Safe Member")

        response = client.get("/api/v1/members", params={"search": "'; DROP TABLE members; --"})

        assert response.status_code == 200
        assert response.json()["data"]["items"] == []
        assert client.get(f"/api/v1/members/{member['id']}").status_code == 200
