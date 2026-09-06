"""Integration tests for /api/v1/books: full route -> service -> repository -> db stack."""


class TestCreateBook:
    def test_create_returns_201_with_available_copies_seeded_from_total(self, client, make_book):
        book = make_book(total_copies=5)

        assert book["total_copies"] == 5
        assert book["available_copies"] == 5
        assert book["id"] > 0
        assert book["created_at"] and book["updated_at"]

    def test_create_rejects_blank_title(self, client, make_book):
        response = client.post(
            "/api/v1/books",
            json={
                "title": "   ",
                "author": "Someone",
                "isbn": "ISBN-BLANK",
                "category": "Fiction",
                "total_copies": 1,
            },
        )

        assert response.status_code == 422

    def test_create_rejects_negative_total_copies(self, client):
        response = client.post(
            "/api/v1/books",
            json={
                "title": "Some Title",
                "author": "Someone",
                "isbn": "ISBN-NEG",
                "category": "Fiction",
                "total_copies": -1,
            },
        )

        assert response.status_code == 422

    def test_create_rejects_title_exceeding_max_length(self, client):
        response = client.post(
            "/api/v1/books",
            json={
                "title": "x" * 256,
                "author": "Someone",
                "isbn": "ISBN-LONG",
                "category": "Fiction",
                "total_copies": 1,
            },
        )

        assert response.status_code == 422

    def test_create_rejects_duplicate_isbn(self, client, make_book):
        make_book(isbn="ISBN-DUP")

        response = client.post(
            "/api/v1/books",
            json={
                "title": "Another Book",
                "author": "Another Author",
                "isbn": "ISBN-DUP",
                "category": "Fiction",
                "total_copies": 1,
            },
        )

        assert response.status_code == 409
        assert "isbn" in response.json()["info"]["message"].lower()


class TestGetBook:
    def test_get_existing_book(self, client, make_book):
        book = make_book()

        response = client.get(f"/api/v1/books/{book['id']}")

        assert response.status_code == 200
        assert response.json()["data"] == book

    def test_get_missing_book_returns_404(self, client):
        response = client.get("/api/v1/books/999999")

        assert response.status_code == 404


class TestUpdateBook:
    def test_update_fields_partially(self, client, make_book):
        book = make_book(title="Original Title", author="Original Author")

        response = client.put(f"/api/v1/books/{book['id']}", json={"author": "New Author"})

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["author"] == "New Author"
        assert data["title"] == "Original Title"

    def test_update_missing_book_returns_404(self, client):
        response = client.put("/api/v1/books/999999", json={"author": "New Author"})

        assert response.status_code == 404

    def test_update_isbn_conflict_with_another_book(self, client, make_book):
        book_a = make_book(isbn="ISBN-A")
        book_b = make_book(isbn="ISBN-B")

        response = client.put(f"/api/v1/books/{book_b['id']}", json={"isbn": book_a["isbn"]})

        assert response.status_code == 409

    def test_update_isbn_to_its_own_current_value_is_allowed(self, client, make_book):
        book = make_book(isbn="ISBN-SAME")

        response = client.put(f"/api/v1/books/{book['id']}", json={"isbn": "ISBN-SAME"})

        assert response.status_code == 200
        assert response.json()["data"]["isbn"] == "ISBN-SAME"

    def test_increasing_total_copies_increases_available_by_the_same_delta(self, client, make_book):
        book = make_book(total_copies=3)

        response = client.put(f"/api/v1/books/{book['id']}", json={"total_copies": 5})

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["total_copies"] == 5
        assert data["available_copies"] == 5

    def test_reducing_total_copies_accounts_for_already_borrowed_copies(
        self, client, make_book, make_member, make_borrowing
    ):
        book = make_book(total_copies=5)
        member = make_member()
        make_borrowing(book["id"], member["id"])  # 1 borrowed, 4 available

        response = client.put(f"/api/v1/books/{book['id']}", json={"total_copies": 3})

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["total_copies"] == 3
        assert data["available_copies"] == 2  # 3 total - 1 still borrowed

    def test_reducing_total_copies_below_currently_borrowed_is_rejected(
        self, client, make_book, make_member, make_borrowing
    ):
        book = make_book(total_copies=5)
        member = make_member()
        make_borrowing(book["id"], member["id"])
        member2 = make_member(email="second.member@example.com")
        make_borrowing(book["id"], member2["id"])  # 2 borrowed

        response = client.put(f"/api/v1/books/{book['id']}", json={"total_copies": 1})

        assert response.status_code == 422
        assert "borrowed" in response.json()["info"]["message"].lower()


class TestDeleteBook:
    def test_delete_missing_book_returns_404(self, client):
        response = client.delete("/api/v1/books/999999")

        assert response.status_code == 404

    def test_delete_book_with_no_borrowings_succeeds(self, client, make_book):
        book = make_book()

        response = client.delete(f"/api/v1/books/{book['id']}")

        assert response.status_code == 200
        assert client.get(f"/api/v1/books/{book['id']}").status_code == 404

    def test_delete_book_with_active_borrowing_is_rejected(self, client, make_book, make_member, make_borrowing):
        book = make_book()
        member = make_member()
        make_borrowing(book["id"], member["id"])

        response = client.delete(f"/api/v1/books/{book['id']}")

        assert response.status_code == 422

    def test_delete_book_with_returned_borrowing_history_is_rejected_as_conflict(
        self, client, make_book, make_member, make_borrowing
    ):
        book = make_book()
        member = make_member()
        borrowing = make_borrowing(book["id"], member["id"])
        client.post(f"/api/v1/borrowings/{borrowing['id']}/return")

        response = client.delete(f"/api/v1/books/{book['id']}")

        assert response.status_code == 409


class TestListBooks:
    def test_search_matches_title_author_or_isbn_case_insensitively(self, client, make_book):
        book = make_book(title="The Pragmatic Programmer", author="Andrew Hunt", isbn="ISBN-PRAGMA-1")

        for query in ["pragmatic", "ANDREW HUNT", "isbn-pragma-1"]:
            response = client.get("/api/v1/books", params={"search": query})
            ids = [item["id"] for item in response.json()["data"]["items"]]
            assert book["id"] in ids, f"expected match for search={query!r}"

    def test_filter_by_category(self, client, make_book):
        make_book(category="Fiction")
        make_book(category="Fiction")
        make_book(category="History")

        response = client.get("/api/v1/books", params={"category": "Fiction"})

        data = response.json()["data"]
        assert data["pagination"]["total"] == 2
        assert all(item["category"] == "Fiction" for item in data["items"])

    def test_pagination_splits_results_by_limit(self, client, make_book):
        created_ids = {make_book()["id"] for _ in range(5)}

        page1 = client.get("/api/v1/books", params={"page": 1, "limit": 2}).json()["data"]
        page2 = client.get("/api/v1/books", params={"page": 2, "limit": 2}).json()["data"]
        page3 = client.get("/api/v1/books", params={"page": 3, "limit": 2}).json()["data"]

        assert page1["pagination"]["total"] == 5
        assert page1["pagination"]["total_pages"] == 3
        assert len(page1["items"]) == 2
        assert len(page2["items"]) == 2
        assert len(page3["items"]) == 1

        seen_ids = [item["id"] for page in (page1, page2, page3) for item in page["items"]]
        assert len(seen_ids) == len(set(seen_ids)) == 5
        assert set(seen_ids) == created_ids

    def test_limit_out_of_range_returns_422(self, client):
        assert client.get("/api/v1/books", params={"limit": 0}).status_code == 422
        assert client.get("/api/v1/books", params={"limit": 101}).status_code == 422

    def test_search_input_is_not_vulnerable_to_sql_injection(self, client, make_book):
        book = make_book(title="Safe Book")

        injection_payloads = [
            "'; DROP TABLE books; --",
            "' OR '1'='1",
            "%' UNION SELECT * FROM books --",
        ]
        for payload in injection_payloads:
            response = client.get("/api/v1/books", params={"search": payload})
            assert response.status_code == 200
            assert response.json()["data"]["items"] == []

        # The table must still exist and hold the original data untouched.
        response = client.get(f"/api/v1/books/{book['id']}")
        assert response.status_code == 200
        assert response.json()["data"]["title"] == "Safe Book"
