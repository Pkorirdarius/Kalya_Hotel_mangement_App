"""Role boundaries around guest data.

Marketing and ICT accounts exist for content and system work respectively. They
must never reach the booking list, front desk queue/actions, reports or guest
exports. Director access is asserted alongside each denial so a broken URL
cannot masquerade as a passing permission check.
"""

from __future__ import annotations

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.content.models import BlogPost, Offer
from apps.facilities.models import MenuItem

pytestmark = pytest.mark.django_db


def _staff(role: str, username: str) -> User:
    return User.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password="strong-test-password",
        role=role,
        is_staff=True,
    )


@pytest.fixture
def marketing():
    return _staff(UserRole.MARKETING, "marketing-user")


@pytest.fixture
def ict_admin():
    return _staff(UserRole.ICT_ADMIN, "ict-user")


@pytest.fixture
def director():
    return _staff(UserRole.DIRECTOR, "director-user")


@pytest.fixture
def client_for():
    def _client(user):
        client = APIClient()
        client.force_login(user)
        return client

    return _client


@pytest.mark.parametrize(
    ("method", "path", "payload"),
    [
        ("get", "/api/v1/staff/bookings/bookings/", None),
        ("get", "/api/v1/staff/frontdesk/queue/", None),
        ("get", "/api/v1/staff/frontdesk/activity/", None),
        (
            "post",
            "/api/v1/staff/frontdesk/actions/",
            {"entity_type": "booking", "entity_id": 1, "action": "confirm"},
        ),
        ("get", "/api/v1/staff/reports/overview/", None),
        ("get", "/api/v1/staff/reports/payments/", None),
        ("get", "/api/v1/staff/reports/hotelplus-export/", None),
    ],
)
def test_marketing_cannot_reach_guest_data(
    client_for, marketing, method, path, payload
):
    client = client_for(marketing)
    if method == "get":
        response = client.get(path)
    else:
        response = client.post(path, payload, format="json")

    assert response.status_code == 403, (path, response.status_code, response.data)


def test_ict_admin_cannot_reach_guest_data(client_for, ict_admin):
    client = client_for(ict_admin)

    assert client.get("/api/v1/staff/bookings/bookings/").status_code == 403
    assert client.get("/api/v1/staff/frontdesk/queue/").status_code == 403
    assert client.get("/api/v1/staff/reports/overview/").status_code == 403


def test_director_keeps_access_to_the_same_endpoints(client_for, director):
    client = client_for(director)

    assert client.get("/api/v1/staff/bookings/bookings/").status_code == 200
    assert client.get("/api/v1/staff/frontdesk/queue/").status_code == 200
    assert client.get("/api/v1/staff/reports/overview/").status_code == 200


def test_marketing_still_manages_content(client_for, marketing):
    client = client_for(marketing)

    assert client.get("/api/v1/staff/content/posts/").status_code == 200


def test_marketing_can_create_and_edit_menus_blog_and_promotions(client_for, marketing):
    """Marketing must be able to do real content work, not just read lists."""
    client = client_for(marketing)

    post = client.post(
        "/api/v1/staff/content/posts/",
        {"slug": "marketing-post", "title_en": "Launch journal"},
        format="json",
    )
    assert post.status_code == 201, post.data
    patched = client.patch(
        "/api/v1/staff/content/posts/marketing-post/",
        {"title_en": "Approved journal title", "needs_confirmation": False},
        format="json",
    )
    assert patched.status_code == 200, patched.data
    assert BlogPost.objects.get(slug="marketing-post").title_en == "Approved journal title"

    offer = client.post(
        "/api/v1/staff/content/offers/",
        {"slug": "marketing-offer", "title_en": "Seasonal offer", "price_label": "Ask"},
        format="json",
    )
    assert offer.status_code == 201, offer.data
    assert Offer.objects.filter(slug="marketing-offer", needs_confirmation=True).exists()

    item = client.post(
        "/api/v1/staff/facilities/menu-items/",
        {
            "venue": MenuItem.Venue.RESTAURANT,
            "category": "Mains",
            "name_en": "Test main",
            "price": 1250,
        },
        format="json",
    )
    assert item.status_code == 201, item.data
    item_id = item.data["id"]
    patched = client.patch(
        f"/api/v1/staff/facilities/menu-items/{item_id}/",
        {"name_en": "Reviewed main", "needs_confirmation": False},
        format="json",
    )
    assert patched.status_code == 200, patched.data
    assert MenuItem.objects.get(pk=item_id).name_en == "Reviewed main"


@pytest.mark.parametrize(
    "role",
    (UserRole.FRONT_DESK, UserRole.DATA_MANAGER, UserRole.ICT_ADMIN),
)
def test_non_content_staff_cannot_write_content(client_for, role):
    client = client_for(_staff(role, f"content-denied-{role}"))

    assert (
        client.post(
            "/api/v1/staff/content/posts/",
            {"slug": "denied-post", "title_en": "Denied"},
            format="json",
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/api/v1/staff/facilities/menu-items/",
            {"venue": MenuItem.Venue.RESTAURANT, "name_en": "Denied", "price": 1250},
            format="json",
        ).status_code
        == 403
    )


def test_marketing_cannot_reach_numbered_rooms(client_for, marketing):
    client = client_for(marketing)

    assert client.get("/api/v1/staff/rooms/").status_code == 403
    assert (
        client.patch(
            "/api/v1/staff/rooms/1/status/", {"status": "occupied"}, format="json"
        ).status_code
        == 403
    )
