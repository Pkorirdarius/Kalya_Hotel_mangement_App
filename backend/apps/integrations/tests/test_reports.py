from __future__ import annotations

import csv
from datetime import timedelta
from decimal import Decimal
from io import StringIO

import pytest
from django.utils import timezone

from apps.accounts.models import User, UserRole
from apps.common.utils import hotel_today
from apps.payments.models import Payment

pytestmark = pytest.mark.django_db

REPORT_URL = "/api/v1/staff/reports/payments/"


@pytest.fixture
def staff_factory():
    def make(role: str, username: str | None = None) -> User:
        return User.objects.create_user(
            username=username or f"user-{role}",
            email=f"{role}@example.com",
            password="strong-test-password",
            role=role,
            is_staff=True,
        )

    return make


def _payment(
    *,
    reference: str,
    amount: str,
    status: str = Payment.Status.SUCCEEDED,
    provider: str = Payment.Provider.MPESA,
    phone: str = "",
    provider_reference: str = "",
    created_at=None,
) -> Payment:
    payment = Payment.objects.create(
        reference=reference,
        purpose=Payment.Purpose.ROOM_BOOKING,
        amount=Decimal(amount),
        currency="KES",
        provider=provider,
        status=status,
        phone=phone,
        provider_reference=provider_reference,
    )
    if created_at is not None:
        Payment.objects.filter(pk=payment.pk).update(created_at=created_at)
        payment.refresh_from_db()
    return payment


def _csv_rows(response) -> list[list[str]]:
    text = response.content.decode("utf-8-sig")
    return list(csv.reader(StringIO(text)))


@pytest.mark.parametrize("role", [UserRole.DIRECTOR, UserRole.DATA_MANAGER])
def test_director_and_data_manager_can_export_json_and_csv(api, staff_factory, role):
    api.force_login(staff_factory(role))
    _payment(reference="PAY-AUTH01", amount="12000")

    json_response = api.get(REPORT_URL, {"format": "json"})
    assert json_response.status_code == 200, json_response.content
    assert json_response.json()["count"] == 1
    assert json_response.json()["total_amount"] == 12000

    csv_response = api.get(REPORT_URL)
    assert csv_response.status_code == 200, csv_response.content
    assert csv_response["Content-Type"].startswith("text/csv")
    assert "payments-" in csv_response["Content-Disposition"]
    rows = _csv_rows(csv_response)
    assert rows[0][0] == "Reference"
    assert any(row[0] == "PAY-AUTH01" for row in rows)


@pytest.mark.parametrize(
    "role", [UserRole.FRONT_DESK, UserRole.MARKETING, UserRole.ICT_ADMIN]
)
def test_other_roles_cannot_export_guest_data(api, staff_factory, role):
    api.force_login(staff_factory(role))

    assert api.get(REPORT_URL, {"format": "json"}).status_code == 403
    assert api.get(REPORT_URL).status_code == 403


def test_anonymous_cannot_export(api):
    assert api.get(REPORT_URL, {"format": "json"}).status_code in (401, 403)


def test_filters_by_provider_and_status(api, staff_factory):
    api.force_login(staff_factory(UserRole.DIRECTOR))
    _payment(
        reference="PAY-MPESA01",
        amount="5000",
        provider=Payment.Provider.MPESA,
        status=Payment.Status.SUCCEEDED,
    )
    _payment(
        reference="PAY-CARD01",
        amount="7000",
        provider=Payment.Provider.CARD,
        status=Payment.Status.SUCCEEDED,
    )
    _payment(
        reference="PAY-PEND01",
        amount="9000",
        provider=Payment.Provider.MPESA,
        status=Payment.Status.PENDING,
    )

    provider_only = api.get(
        REPORT_URL, {"format": "json", "provider": Payment.Provider.MPESA}
    )
    assert {row["reference"] for row in provider_only.json()["results"]} == {
        "PAY-MPESA01",
        "PAY-PEND01",
    }

    status_only = api.get(
        REPORT_URL, {"format": "json", "status": Payment.Status.SUCCEEDED}
    )
    assert {row["reference"] for row in status_only.json()["results"]} == {
        "PAY-MPESA01",
        "PAY-CARD01",
    }
    # Totals only ever include money that actually arrived.
    assert status_only.json()["total_amount"] == 12000


def test_total_counts_only_succeeded_payments(api, staff_factory):
    api.force_login(staff_factory(UserRole.DATA_MANAGER))
    _payment(reference="PAY-OK01", amount="15000")
    _payment(
        reference="PAY-PENDING02",
        amount="8000",
        status=Payment.Status.PENDING,
    )
    _payment(
        reference="PAY-FAILED01",
        amount="5000",
        status=Payment.Status.FAILED,
    )

    response = api.get(REPORT_URL, {"format": "json"})
    body = response.json()
    assert body["count"] == 3
    assert body["total_amount"] == 15000

    rows = _csv_rows(api.get(REPORT_URL))
    total_row = next(row for row in rows if row and row[0] == "TOTAL (succeeded)")
    assert total_row[6] == "15000"


def test_phones_are_masked_in_json_and_csv(api, staff_factory):
    api.force_login(staff_factory(UserRole.DIRECTOR))
    _payment(reference="PAY-PHONE01", amount="3000", phone="254712345678")

    body = api.get(REPORT_URL, {"format": "json"}).json()
    assert body["results"][0]["phone"] == "2547***78"

    rows = _csv_rows(api.get(REPORT_URL))
    row = next(row for row in rows if row and row[0] == "PAY-PHONE01")
    assert row[8] == "2547***78"


def test_csv_escapes_formula_cells(api, staff_factory):
    api.force_login(staff_factory(UserRole.DIRECTOR))
    _payment(
        reference="=SUM(A1:A9)",
        amount="1000",
        provider_reference="@cmd|'/c calc'!A0",
    )

    rows = _csv_rows(api.get(REPORT_URL))
    row = next(row for row in rows if row and row[0].startswith("'="))
    assert row[0] == "'=SUM(A1:A9)"
    assert row[9] == "'@cmd|'/c calc'!A0"


def test_range_validation(api, staff_factory):
    api.force_login(staff_factory(UserRole.DIRECTOR))

    backwards = api.get(
        REPORT_URL, {"start": "2026-05-10", "end": "2026-05-01", "format": "json"}
    )
    assert backwards.status_code == 400
    assert "end" in backwards.json()["error"]["fields"]

    too_wide = api.get(
        REPORT_URL, {"start": "2024-01-01", "end": "2026-01-01", "format": "json"}
    )
    assert too_wide.status_code == 400
    assert "end" in too_wide.json()["error"]["fields"]

    bad_date = api.get(REPORT_URL, {"start": "not-a-date", "format": "json"})
    assert bad_date.status_code == 400
    assert "date" in bad_date.json()["error"]["fields"]


def test_unknown_filters_are_rejected(api, staff_factory):
    api.force_login(staff_factory(UserRole.DIRECTOR))

    assert api.get(REPORT_URL, {"provider": "cash"}).status_code == 400
    assert api.get(REPORT_URL, {"status": "maybe"}).status_code == 400
    assert api.get(REPORT_URL, {"format": "xlsx"}).status_code == 400


def test_default_range_is_the_last_thirty_days(api, staff_factory):
    api.force_login(staff_factory(UserRole.DIRECTOR))
    now = timezone.now()
    _payment(
        reference="PAY-RECENT01",
        amount="2000",
        created_at=now - timedelta(days=1),
    )
    _payment(
        reference="PAY-OLD01",
        amount="4000",
        created_at=now - timedelta(days=45),
    )

    default = api.get(REPORT_URL, {"format": "json"}).json()
    assert {row["reference"] for row in default["results"]} == {"PAY-RECENT01"}

    explicit = api.get(
        REPORT_URL,
        {
            "format": "json",
            "start": (hotel_today() - timedelta(days=60)).isoformat(),
            "end": hotel_today().isoformat(),
        },
    ).json()
    assert {row["reference"] for row in explicit["results"]} == {
        "PAY-RECENT01",
        "PAY-OLD01",
    }
