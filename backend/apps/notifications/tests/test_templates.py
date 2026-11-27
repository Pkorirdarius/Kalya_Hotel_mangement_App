from __future__ import annotations

import re
from pathlib import Path

import pytest
from django.conf import settings

from apps.bookings.models import Booking
from apps.notifications.services import notify_booking_confirmed

pytestmark = pytest.mark.django_db

EMAIL_TEMPLATES = Path(settings.BASE_DIR) / "templates" / "emails"

GUEST_TEMPLATE_PAIRS = (
    "booking_confirmation",
    "booking_cancelled",
    "booking_reminder",
    "table_booking_update",
    "table_booking_reminder",
    "conference_enquiry_update",
    "conference_enquiry_reminder",
)

ENGLISH_MONTHS = re.compile(
    r"\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b"
)


@pytest.mark.parametrize("stem", GUEST_TEMPLATE_PAIRS)
def test_guest_email_templates_exist_in_both_languages(stem):
    en = EMAIL_TEMPLATES / f"{stem}_en.txt"
    sw = EMAIL_TEMPLATES / f"{stem}_sw.txt"

    assert en.exists(), f"Missing {en.name}"
    assert sw.exists(), f"Missing {sw.name}"
    assert en.read_text(encoding="utf-8").strip()
    assert sw.read_text(encoding="utf-8").strip()


def test_swahili_templates_avoid_english_month_names():
    for path in EMAIL_TEMPLATES.glob("*_sw.txt"):
        assert not ENGLISH_MONTHS.search(path.read_text(encoding="utf-8")), path.name


class _CapturingSmsProvider:
    def __init__(self):
        self.messages: list[str] = []

    def send(self, *, recipient: str, message: str):
        self.messages.append(message)
        return True, "stub"


@pytest.mark.parametrize("language", ["en", "sw"])
def test_booking_sms_uses_the_guest_language(
    api, booking_payload, language, monkeypatch
):
    provider = _CapturingSmsProvider()
    monkeypatch.setattr(
        "apps.notifications.services.get_sms_provider", lambda: provider
    )
    response = api.post("/api/v1/bookings/", booking_payload, format="json")
    assert response.status_code == 201, response.content
    booking = Booking.objects.get(reference=response.json()["booking"]["reference"])
    provider.messages.clear()

    notify_booking_confirmed(booking, language=language)

    assert len(provider.messages) == 1
    message = provider.messages[0]
    assert booking.reference in message
    if language == "sw":
        assert "imethibitishwa" in message
        assert booking.checkin.strftime("%b") not in message
        assert f"{booking.checkin:%d/%m/%Y}" in message
    else:
        assert "confirmed" in message
