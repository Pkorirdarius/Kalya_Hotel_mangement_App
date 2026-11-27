from __future__ import annotations

import pytest

from apps.accounts.models import User, UserRole
from apps.rooms.models import Room

pytestmark = pytest.mark.django_db

LIST_URL = "/api/v1/staff/rooms/"


@pytest.fixture
def rooms(room_type):
    return [
        Room.objects.create(number="201", room_type=room_type),
        Room.objects.create(number="202", room_type=room_type),
    ]


def staff(role: UserRole, username: str):
    return User.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password="strong-test-password",
        role=role,
        is_staff=True,
    )


def test_room_list_requires_staff_session(api, rooms):
    assert api.get(LIST_URL).status_code == 401


def test_front_desk_sees_numbered_rooms_and_house_status(api, rooms):
    api.force_login(staff(UserRole.FRONT_DESK, "desk"))

    response = api.get(LIST_URL)

    assert response.status_code == 200
    rows = response.data
    assert [row["number"] for row in rows] == ["201", "202"]
    assert all(row["status"] == "free" for row in rows)
    assert rows[0]["room_type"] == "standard"


def test_front_desk_marks_a_room_occupied_and_free_again(api, rooms):
    api.force_login(staff(UserRole.FRONT_DESK, "desk"))
    room = rooms[0]

    occupied = api.patch(f"{LIST_URL}{room.pk}/status/", {"status": "occupied"}, format="json")
    assert occupied.status_code == 200
    assert occupied.data["status"] == "occupied"
    room.refresh_from_db()
    assert room.status == Room.Status.OCCUPIED

    freed = api.patch(f"{LIST_URL}{room.pk}/status/", {"status": "free"}, format="json")
    assert freed.status_code == 200
    room.refresh_from_db()
    assert room.status == Room.Status.FREE


def test_marketing_cannot_read_or_change_room_status(api, rooms):
    api.force_login(staff(UserRole.MARKETING, "marketing"))

    assert api.get(LIST_URL).status_code == 403
    assert (
        api.patch(
            f"{LIST_URL}{rooms[0].pk}/status/", {"status": "occupied"}, format="json"
        ).status_code
        == 403
    )


def test_unknown_house_status_is_rejected(api, rooms):
    api.force_login(staff(UserRole.FRONT_DESK, "desk"))

    response = api.patch(
        f"{LIST_URL}{rooms[0].pk}/status/", {"status": "cleaning"}, format="json"
    )

    assert response.status_code == 400
    rooms[0].refresh_from_db()
    assert rooms[0].status == Room.Status.FREE
