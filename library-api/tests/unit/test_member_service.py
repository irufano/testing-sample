"""Unit tests for MemberService business logic, isolated from the database.

The repositories are collaborators, not the code under test: they're
replaced with mocks so each test exercises only the service's own decision
rules (conflict checks, delete guards).
"""

from unittest.mock import MagicMock

import pytest

from app.core.exceptions import ConflictException, NotFoundException, UnprocessableEntityException
from app.models.member import Member
from app.schemas.member import MemberCreate, MemberUpdate
from app.services.member_service import MemberService


def _service() -> MemberService:
    service = MemberService(db=MagicMock())
    service.repo = MagicMock()
    service.borrowing_repo = MagicMock()
    return service


def _member(**overrides) -> Member:
    defaults = dict(id=1, name="Name", email="member@example.com", phone=None, status="active")
    defaults.update(overrides)
    return Member(**defaults)


class TestCreate:
    def test_raises_conflict_when_email_already_exists(self):
        service = _service()
        service.repo.get_by_email.return_value = _member()
        payload = MemberCreate(name="New", email="member@example.com")

        with pytest.raises(ConflictException):
            service.create(payload)

        service.repo.create.assert_not_called()

    def test_creates_member_when_email_is_unique(self):
        service = _service()
        service.repo.get_by_email.return_value = None
        service.repo.create.side_effect = lambda member: member
        payload = MemberCreate(name="New", email="new@example.com", status="suspended")

        result = service.create(payload)

        assert result.email == "new@example.com"
        assert result.status == "suspended"


class TestUpdate:
    def test_raises_not_found_when_member_missing(self):
        service = _service()
        service.repo.get_by_id.return_value = None

        with pytest.raises(NotFoundException):
            service.update(1, MemberUpdate(name="X"))

    def test_raises_conflict_when_new_email_belongs_to_another_member(self):
        service = _service()
        service.repo.get_by_id.return_value = _member(id=1, email="a@example.com")
        service.repo.get_by_email.return_value = _member(id=2, email="b@example.com")

        with pytest.raises(ConflictException):
            service.update(1, MemberUpdate(email="b@example.com"))

    def test_allows_email_update_to_its_own_current_value(self):
        service = _service()
        member = _member(id=1, email="a@example.com")
        service.repo.get_by_id.return_value = member
        service.repo.update.side_effect = lambda m: m

        result = service.update(1, MemberUpdate(email="a@example.com"))

        assert result.email == "a@example.com"
        service.repo.get_by_email.assert_not_called()

    def test_updates_status(self):
        service = _service()
        member = _member(status="active")
        service.repo.get_by_id.return_value = member
        service.repo.update.side_effect = lambda m: m

        result = service.update(1, MemberUpdate(status="suspended"))

        assert result.status == "suspended"


class TestDelete:
    def test_raises_not_found_when_member_missing(self):
        service = _service()
        service.repo.get_by_id.return_value = None

        with pytest.raises(NotFoundException):
            service.delete(1)

    def test_raises_unprocessable_when_member_has_active_borrowing(self):
        service = _service()
        service.repo.get_by_id.return_value = _member()
        service.borrowing_repo.has_active_for_member.return_value = True

        with pytest.raises(UnprocessableEntityException):
            service.delete(1)

        service.repo.delete.assert_not_called()

    def test_raises_conflict_when_member_has_borrowing_history(self):
        service = _service()
        service.repo.get_by_id.return_value = _member()
        service.borrowing_repo.has_active_for_member.return_value = False
        service.borrowing_repo.has_any_for_member.return_value = True

        with pytest.raises(ConflictException):
            service.delete(1)

        service.repo.delete.assert_not_called()

    def test_deletes_when_no_borrowing_history(self):
        service = _service()
        member = _member()
        service.repo.get_by_id.return_value = member
        service.borrowing_repo.has_active_for_member.return_value = False
        service.borrowing_repo.has_any_for_member.return_value = False

        service.delete(1)

        service.repo.delete.assert_called_once_with(member)
