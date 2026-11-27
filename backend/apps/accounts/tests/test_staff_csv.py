"""CSV staff provisioning never invents or stores credentials."""

from __future__ import annotations

import csv
from io import StringIO

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError

from apps.accounts.models import UserRole

pytestmark = pytest.mark.django_db

HEADER = ("username", "email", "role", "first_name", "last_name", "phone")


@pytest.fixture
def write_csv(tmp_path):
    def _write(rows, header=HEADER):
        path = tmp_path / "staff.csv"
        with path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=header)
            writer.writeheader()
            writer.writerows(rows)
        return path

    return _write


def _run(path, **options):
    stdout = StringIO()
    stderr = StringIO()
    call_command(
        "create_staff_from_csv", csv=path, stdout=stdout, stderr=stderr, **options
    )
    return stdout.getvalue(), stderr.getvalue()


def test_creates_named_staff_without_usable_passwords(write_csv):
    path = write_csv(
        [
            {
                "username": "amina",
                "email": "amina@example.com",
                "role": UserRole.FRONT_DESK,
                "first_name": "Amina",
                "last_name": "Kip",
                "phone": "254700000001",
            },
            {
                "username": "maya",
                "email": "maya@example.com",
                "role": UserRole.MARKETING,
            },
        ]
    )

    output, _ = _run(path)

    amina = get_user_model().objects.get(username="amina")
    assert amina.email == "amina@example.com"
    assert amina.role == UserRole.FRONT_DESK
    assert amina.first_name == "Amina"
    assert amina.phone == "254700000001"
    assert amina.is_staff is True
    assert amina.is_active is True
    assert amina.is_superuser is False
    assert amina.has_usable_password() is False
    assert amina.check_password("ChangeMe-2026!") is False
    assert not get_user_model().objects.get(username="maya").has_usable_password()
    assert "changepassword" in output
    assert "Created 2 account(s)" in output


def test_dry_run_validates_but_writes_nothing(write_csv):
    path = write_csv(
        [
            {
                "username": "director-one",
                "email": "director@example.com",
                "role": UserRole.DIRECTOR,
            }
        ]
    )

    output, _ = _run(path, dry_run=True)

    assert "Would create director-one" in output
    assert "Nothing was written" in output
    assert get_user_model().objects.count() == 0


@pytest.mark.parametrize(
    ("rows", "message"),
    [
        (
            [
                {
                    "username": "good",
                    "email": "good@example.com",
                    "role": UserRole.DIRECTOR,
                },
                {
                    "username": "bad",
                    "email": "bad@example.com",
                    "role": "receptionist",
                },
            ],
            "unknown role",
        ),
        (
            [
                {
                    "username": "bad-email",
                    "email": "not-an-email",
                    "role": UserRole.DIRECTOR,
                }
            ],
            "invalid email",
        ),
        (
            [
                {
                    "username": "duplicate",
                    "email": "one@example.com",
                    "role": UserRole.DIRECTOR,
                },
                {
                    "username": "duplicate",
                    "email": "two@example.com",
                    "role": UserRole.DIRECTOR,
                },
            ],
            "duplicate username",
        ),
    ],
)
def test_invalid_csv_creates_nothing(write_csv, rows, message):
    path = write_csv(rows)

    with pytest.raises(CommandError, match=message):
        _run(path)

    assert get_user_model().objects.count() == 0


def test_missing_required_column_is_rejected(write_csv):
    path = write_csv(
        [{"username": "no-role", "email": "no-role@example.com", "phone": ""}],
        header=("username", "email", "phone"),
    )

    with pytest.raises(CommandError, match="missing required column"):
        _run(path)

    assert get_user_model().objects.count() == 0


def test_existing_username_is_left_unchanged(write_csv):
    user_model = get_user_model()
    existing = user_model.objects.create_user(
        username="existing",
        email="old@example.com",
        password="a-real-password-set-by-operator",
        role=UserRole.FRONT_DESK,
        is_staff=True,
    )
    path = write_csv(
        [
            {
                "username": "existing",
                "email": "new@example.com",
                "role": UserRole.DIRECTOR,
            }
        ]
    )

    output, _ = _run(path)

    existing.refresh_from_db()
    assert existing.email == "old@example.com"
    assert existing.role == UserRole.FRONT_DESK
    assert existing.has_usable_password() is True
    assert "Skipped existing" in output
