import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.common.models import AuditLog

from ..models import User, UserRole

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def clear_throttle_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def staff_user():
    return User.objects.create_user(
        username="frontdesk",
        email="frontdesk@example.com",
        password="strong-test-password",
        first_name="Amina",
        last_name="Kip",
        role=UserRole.FRONT_DESK,
        is_staff=True,
    )


def test_csrf_endpoint_sets_cookie_and_returns_token():
    client = APIClient(enforce_csrf_checks=True)
    response = client.get("/api/v1/auth/csrf/")

    assert response.status_code == 200
    assert response.data["csrfToken"]
    assert "csrftoken" in response.cookies


def test_login_sets_session_and_returns_capabilities(staff_user):
    client = APIClient()
    response = client.post(
        "/api/v1/staff/auth/login/",
        {"username": "frontdesk", "password": "strong-test-password"},
        format="json",
    )

    assert response.status_code == 200
    user = response.data["user"]
    assert user["role"] == UserRole.FRONT_DESK
    assert user["capabilities"]["manage_bookings"] is True
    assert user["capabilities"]["export_guest_data"] is False
    assert client.session["_auth_user_id"] == str(staff_user.pk)

    log = AuditLog.objects.get(action="staff.login")
    assert log.actor == staff_user
    assert log.request_id
    assert response["X-Request-ID"] == log.request_id


def test_login_accepts_email_identifier(staff_user):
    client = APIClient()
    response = client.post(
        "/api/v1/staff/auth/login/",
        {"username": staff_user.email, "password": "strong-test-password"},
        format="json",
    )

    assert response.status_code == 200
    assert response.data["user"]["username"] == "frontdesk"


def test_login_rejects_bad_password_with_error_envelope(staff_user):
    client = APIClient()
    response = client.post(
        "/api/v1/staff/auth/login/",
        {"username": "frontdesk", "password": "wrong-password"},
        format="json",
    )

    assert response.status_code == 401
    assert response.data["error"]["code"] == "authentication_failed"
    assert response.data["error"]["request_id"]
    assert response.data["error"]["message"] == "Invalid username or password."


def test_login_rejects_non_staff_account():
    User.objects.create_user(
        username="guest",
        email="guest@example.com",
        password="strong-test-password",
        is_staff=False,
    )
    client = APIClient()
    response = client.post(
        "/api/v1/staff/auth/login/",
        {"username": "guest", "password": "strong-test-password"},
        format="json",
    )

    assert response.status_code == 403
    assert response.data["error"]["code"] == "permission_denied"


def test_login_requires_csrf_when_enforced(staff_user):
    client = APIClient(enforce_csrf_checks=True)
    response = client.post(
        "/api/v1/staff/auth/login/",
        {"username": "frontdesk", "password": "strong-test-password"},
        format="json",
    )
    assert response.status_code == 403

    csrf_response = client.get("/api/v1/auth/csrf/")
    token = csrf_response.data["csrfToken"]
    response = client.post(
        "/api/v1/staff/auth/login/",
        {"username": "frontdesk", "password": "strong-test-password"},
        format="json",
        HTTP_X_CSRFTOKEN=token,
    )
    assert response.status_code == 200


def test_me_requires_auth_and_returns_current_user(staff_user):
    client = APIClient()
    assert client.get("/api/v1/staff/auth/me/").status_code == 401

    client.force_login(staff_user)
    response = client.get("/api/v1/staff/auth/me/")
    assert response.status_code == 200
    assert response.data["user"]["username"] == "frontdesk"


def test_logout_clears_session(staff_user):
    client = APIClient()
    client.force_login(staff_user)

    response = client.post("/api/v1/staff/auth/logout/")
    assert response.status_code == 204
    assert client.get("/api/v1/staff/auth/me/").status_code == 401
    assert AuditLog.objects.filter(action="staff.logout", actor=staff_user).exists()


@pytest.mark.parametrize(
    ("role", "expected"),
    [
        (UserRole.DIRECTOR, {"export_guest_data": True, "manage_system": True}),
        (UserRole.DATA_MANAGER, {"export_guest_data": True, "manage_content": False}),
        (UserRole.FRONT_DESK, {"manage_bookings": True, "export_guest_data": False}),
        (UserRole.MARKETING, {"manage_content": True, "manage_bookings": False}),
        (UserRole.ICT_ADMIN, {"manage_system": True, "view_guest_data": False}),
    ],
)
def test_role_capabilities(role, expected):
    user = User.objects.create_user(
        username=f"user-{role}",
        email=f"{role}@example.com",
        password="strong-test-password",
        role=role,
        is_staff=True,
    )

    assert all(user.capabilities[key] is value for key, value in expected.items())
