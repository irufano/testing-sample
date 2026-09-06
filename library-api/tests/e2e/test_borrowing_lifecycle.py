"""Backend end-to-end test for the full borrow -> return business workflow.

Backend E2E is optional per the test-selection criteria; it's added here
because borrowing is this API's core workflow spanning multiple endpoints
and two aggregate resources (books, members), and the per-endpoint
integration tests don't by themselves prove the whole journey - including
the delete guards before/after history exists - holds together end to end.
"""


def test_full_borrow_and_return_lifecycle(client, make_book, make_member):
    book = make_book(total_copies=1)
    member = make_member()

    # 1. Borrowing the only copy succeeds and the book becomes unavailable.
    borrow_response = client.post(
        "/api/v1/borrowings", json={"book_id": book["id"], "member_id": member["id"]}
    )
    assert borrow_response.status_code == 201
    borrowing = borrow_response.json()["data"]
    assert borrowing["status"] == "borrowed"

    book_after_borrow = client.get(f"/api/v1/books/{book['id']}").json()["data"]
    assert book_after_borrow["available_copies"] == 0

    # 2. The active borrowing shows up when listing/filtering.
    listed = client.get(
        "/api/v1/borrowings", params={"status": "borrowed", "book_id": book["id"]}
    ).json()["data"]["items"]
    assert any(item["id"] == borrowing["id"] for item in listed)

    # 3. Neither the book nor the member can be deleted while borrowed.
    assert client.delete(f"/api/v1/books/{book['id']}").status_code == 422
    assert client.delete(f"/api/v1/members/{member['id']}").status_code == 422

    # 4. Returning restores availability and closes the loan.
    return_response = client.post(f"/api/v1/borrowings/{borrowing['id']}/return")
    assert return_response.status_code == 200
    assert return_response.json()["data"]["status"] == "returned"

    book_after_return = client.get(f"/api/v1/books/{book['id']}").json()["data"]
    assert book_after_return["available_copies"] == 1

    # 5. Returning the same borrowing again is rejected.
    assert client.post(f"/api/v1/borrowings/{borrowing['id']}/return").status_code == 422

    # 6. Borrowing history now blocks deletion for referential-integrity reasons.
    assert client.delete(f"/api/v1/books/{book['id']}").status_code == 409
    assert client.delete(f"/api/v1/members/{member['id']}").status_code == 409
