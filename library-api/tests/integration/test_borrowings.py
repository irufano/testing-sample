"""Integration tests for /api/v1/borrowings: full route -> service -> repository -> db stack."""

from datetime import datetime, timedelta, timezone


class TestBorrow:
    def test_borrow_decrements_available_copies_and_defaults_due_date(self, client, make_book, make_member):
        book = make_book(total_copies=2)
        member = make_member()
        before = datetime.now(timezone.utc)

        response = client.post(
            "/api/v1/borrowings", json={"book_id": book["id"], "member_id": member["id"]}
        )
        after = datetime.now(timezone.utc)

        assert response.status_code == 201
        data = response.json()["data"]
        assert data["status"] == "borrowed"
        assert data["returned_at"] is None

        # SQLite has no native timezone type, so SQLAlchemy round-trips
        # DateTime(timezone=True) values as naive UTC; normalize before comparing.
        due_at = datetime.fromisoformat(data["due_at"])
        if due_at.tzinfo is None:
            due_at = due_at.replace(tzinfo=timezone.utc)
        assert before + timedelta(days=14) <= due_at <= after + timedelta(days=14, seconds=5)

        book_after = client.get(f"/api/v1/books/{book['id']}").json()["data"]
        assert book_after["available_copies"] == 1

    def test_borrow_respects_explicit_due_at(self, client, make_book, make_member):
        book = make_book()
        member = make_member()
        due_at = datetime(2030, 1, 1, tzinfo=timezone.utc)

        response = client.post(
            "/api/v1/borrowings",
            json={"book_id": book["id"], "member_id": member["id"], "due_at": due_at.isoformat()},
        )

        assert response.status_code == 201
        # SQLite has no native timezone type, so SQLAlchemy round-trips
        # DateTime(timezone=True) values as naive UTC; normalize before comparing.
        received = datetime.fromisoformat(response.json()["data"]["due_at"])
        if received.tzinfo is None:
            received = received.replace(tzinfo=timezone.utc)
        assert received == due_at

    def test_borrow_rejected_when_no_copies_available(self, client, make_book, make_member):
        book = make_book(total_copies=1)
        member1 = make_member(email="first@example.com")
        member2 = make_member(email="second@example.com")

        first = client.post("/api/v1/borrowings", json={"book_id": book["id"], "member_id": member1["id"]})
        assert first.status_code == 201

        second = client.post("/api/v1/borrowings", json={"book_id": book["id"], "member_id": member2["id"]})

        assert second.status_code == 422
        assert "available" in second.json()["info"]["message"].lower()

    def test_borrow_rejected_for_inactive_member(self, client, make_book, make_member):
        book = make_book()
        member = make_member(status="inactive")

        response = client.post(
            "/api/v1/borrowings", json={"book_id": book["id"], "member_id": member["id"]}
        )

        assert response.status_code == 422
        assert "not eligible" in response.json()["info"]["message"].lower()

    def test_borrow_missing_book_returns_404(self, client, make_member):
        member = make_member()

        response = client.post("/api/v1/borrowings", json={"book_id": 999999, "member_id": member["id"]})

        assert response.status_code == 404

    def test_borrow_missing_member_returns_404(self, client, make_book):
        book = make_book()

        response = client.post("/api/v1/borrowings", json={"book_id": book["id"], "member_id": 999999})

        assert response.status_code == 404

    def test_borrow_rejected_when_member_reaches_active_borrowing_limit(self, client, make_book, make_member):
        member = make_member()
        books = [make_book(isbn=f"LIMIT-{i}") for i in range(4)]

        for book in books[:3]:
            response = client.post(
                "/api/v1/borrowings", json={"book_id": book["id"], "member_id": member["id"]}
            )
            assert response.status_code == 201

        fourth = client.post(
            "/api/v1/borrowings", json={"book_id": books[3]["id"], "member_id": member["id"]}
        )

        assert fourth.status_code == 422
        assert "maximum" in fourth.json()["info"]["message"].lower()
        # The book stays untouched: the rejected borrowing never decremented it.
        book_after = client.get(f"/api/v1/books/{books[3]['id']}").json()["data"]
        assert book_after["available_copies"] == books[3]["available_copies"]

    def test_returning_a_borrowing_frees_a_slot_under_the_limit(self, client, make_book, make_member):
        member = make_member()
        books = [make_book(isbn=f"SLOT-{i}") for i in range(4)]
        borrowings = []
        for book in books[:3]:
            response = client.post(
                "/api/v1/borrowings", json={"book_id": book["id"], "member_id": member["id"]}
            )
            assert response.status_code == 201
            borrowings.append(response.json()["data"])

        client.post(f"/api/v1/borrowings/{borrowings[0]['id']}/return")

        response = client.post(
            "/api/v1/borrowings", json={"book_id": books[3]["id"], "member_id": member["id"]}
        )

        assert response.status_code == 201

    def test_borrow_rejects_non_positive_book_or_member_id(self, client, make_book, make_member):
        book = make_book()
        member = make_member()

        assert client.post(
            "/api/v1/borrowings", json={"book_id": 0, "member_id": member["id"]}
        ).status_code == 422
        assert client.post(
            "/api/v1/borrowings", json={"book_id": book["id"], "member_id": -1}
        ).status_code == 422


class TestGetAndListBorrowings:
    def test_get_borrowing_includes_nested_book_and_member(self, client, make_book, make_member, make_borrowing):
        book = make_book()
        member = make_member()
        borrowing = make_borrowing(book["id"], member["id"])

        response = client.get(f"/api/v1/borrowings/{borrowing['id']}")

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["book"]["id"] == book["id"]
        assert data["member"]["id"] == member["id"]

    def test_get_missing_borrowing_returns_404(self, client):
        response = client.get("/api/v1/borrowings/999999")

        assert response.status_code == 404

    def test_list_filters_by_status(self, client, make_book, make_member, make_borrowing):
        book = make_book(total_copies=2)
        member = make_member()
        returned = make_borrowing(book["id"], member["id"])
        client.post(f"/api/v1/borrowings/{returned['id']}/return")
        member2 = make_member(email="member2@example.com")
        still_borrowed = make_borrowing(book["id"], member2["id"])

        response = client.get("/api/v1/borrowings", params={"status": "returned"})

        ids = [item["id"] for item in response.json()["data"]["items"]]
        assert returned["id"] in ids
        assert still_borrowed["id"] not in ids

    def test_list_filters_by_member_id_and_book_id(self, client, make_book, make_member, make_borrowing):
        book1 = make_book()
        book2 = make_book()
        member1 = make_member(email="m1@example.com")
        member2 = make_member(email="m2@example.com")
        target = make_borrowing(book1["id"], member1["id"])
        make_borrowing(book2["id"], member2["id"])

        by_member = client.get("/api/v1/borrowings", params={"member_id": member1["id"]}).json()["data"]["items"]
        by_book = client.get("/api/v1/borrowings", params={"book_id": book1["id"]}).json()["data"]["items"]

        assert [item["id"] for item in by_member] == [target["id"]]
        assert [item["id"] for item in by_book] == [target["id"]]


class TestReturnBook:
    def test_return_marks_status_and_restores_available_copies(self, client, make_book, make_member, make_borrowing):
        book = make_book(total_copies=3)
        member = make_member()
        borrowing = make_borrowing(book["id"], member["id"])

        response = client.post(f"/api/v1/borrowings/{borrowing['id']}/return")

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["status"] == "returned"
        assert data["returned_at"] is not None

        book_after = client.get(f"/api/v1/books/{book['id']}").json()["data"]
        assert book_after["available_copies"] == 3

    def test_return_already_returned_borrowing_is_rejected(self, client, make_book, make_member, make_borrowing):
        book = make_book()
        member = make_member()
        borrowing = make_borrowing(book["id"], member["id"])
        client.post(f"/api/v1/borrowings/{borrowing['id']}/return")

        response = client.post(f"/api/v1/borrowings/{borrowing['id']}/return")

        assert response.status_code == 422
        assert "already" in response.json()["info"]["message"].lower()

    def test_return_missing_borrowing_returns_404(self, client):
        response = client.post("/api/v1/borrowings/999999/return")

        assert response.status_code == 404

    def test_return_after_total_copies_was_reduced_stays_consistent_with_new_total(
        self, client, make_book, make_member, make_borrowing
    ):
        book = make_book(total_copies=5)
        member1 = make_member(email="m1@example.com")
        member2 = make_member(email="m2@example.com")
        member3 = make_member(email="m3@example.com")
        borrowing = make_borrowing(book["id"], member1["id"])
        make_borrowing(book["id"], member2["id"])
        make_borrowing(book["id"], member3["id"])  # 3 borrowed, 2 available

        update = client.put(f"/api/v1/books/{book['id']}", json={"total_copies": 3})
        assert update.status_code == 200
        assert update.json()["data"]["available_copies"] == 0  # 3 total - 3 borrowed

        response = client.post(f"/api/v1/borrowings/{borrowing['id']}/return")

        assert response.status_code == 200
        book_after = client.get(f"/api/v1/books/{book['id']}").json()["data"]
        assert book_after["available_copies"] == 1
        assert book_after["available_copies"] <= book_after["total_copies"]
