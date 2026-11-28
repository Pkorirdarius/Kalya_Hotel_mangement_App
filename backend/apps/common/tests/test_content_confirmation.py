import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.content.models import BlogPost, Offer, PolicyPage, Review
from apps.facilities.models import MenuItem
from apps.rooms.models import RoomType

pytestmark = pytest.mark.django_db

URL = "/api/v1/staff/common/content-confirmation/"


@pytest.fixture
def marketing_user(db):
    return User.objects.create_user(
        username="content-marketing",
        email="marketing@example.com",
        password="strong-test-password",
        role=UserRole.MARKETING,
        is_staff=True,
    )


@pytest.fixture
def front_desk_user(db):
    return User.objects.create_user(
        username="content-desk",
        email="desk@example.com",
        password="strong-test-password",
        role=UserRole.FRONT_DESK,
        is_staff=True,
    )


def seed_content():
    flagged = [
        BlogPost.objects.create(slug="needs-review", title_en="City guide"),
        Offer.objects.create(slug="needs-price", title_en="Weekend deal"),
        PolicyPage.objects.create(slug="privacy", title_en="Privacy notice"),
        Review.objects.create(author="Guest One", quote_en="Lovely stay"),
        RoomType.objects.create(slug="suite", name_en="Suite"),
        MenuItem.objects.create(venue="restaurant", name_en="Pilau", price=850),
    ]
    BlogPost.objects.create(
        slug="confirmed", title_en="Confirmed guide", needs_confirmation=False
    )
    return flagged


def test_content_confirmation_lists_every_flagged_model(marketing_user):
    seed_content()
    client = APIClient()
    client.force_authenticate(user=marketing_user)

    response = client.get(URL)

    assert response.status_code == 200
    body = response.data
    assert body["total"] == 6
    assert body["counts"] == {
        "blog-post": 1,
        "offer": 1,
        "policy-page": 1,
        "review": 1,
        "room-type": 1,
        "menu-item": 1,
    }
    kinds = {item["kind"] for item in body["items"]}
    assert kinds == set(body["counts"])
    assert all(item["needs_confirmation"] is True for item in body["items"])
    assert all(item["label"] for item in body["items"])
    assert all(item["model"] and item["id"] for item in body["items"])
    assert [
        item["updated_at"] for item in body["items"]
    ] == sorted(
        [item["updated_at"] for item in body["items"]], reverse=True
    )


def test_content_confirmation_respects_limit(marketing_user):
    seed_content()
    client = APIClient()
    client.force_authenticate(user=marketing_user)

    response = client.get(URL, {"limit": 2})

    assert response.status_code == 200
    assert response.data["total"] == 6
    assert len(response.data["items"]) == 2


def test_content_confirmation_requires_content_permission(front_desk_user):
    seed_content()
    client = APIClient()
    client.force_authenticate(user=front_desk_user)

    assert client.get(URL).status_code == 403


def test_content_confirmation_requires_authentication():
    assert APIClient().get(URL).status_code in (401, 403)
