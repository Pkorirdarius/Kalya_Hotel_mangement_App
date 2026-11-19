from __future__ import annotations

from datetime import time, timedelta

import pytest
from django.core import mail

from apps.common.utils import hotel_today, unique_reference
from apps.facilities.models import ConferenceEnquiry, TableBooking
from apps.notifications import services
from apps.notifications.models import NotificationLog
from apps.notifications.reminders import send_facility_reminders
from apps.notifications.services import (
    notify_booking_cancelled,
    notify_conference_enquiry,
    notify_table_booking,
)

pytestmark = pytest.mark.django_db


def _table(status: str, language: str = "en", days: int = 2) -> TableBooking:
    return TableBooking.objects.create(
        reference=unique_reference(TableBooking, "TB"),
        date=hotel_today() + timedelta(days=days),
        time=time(19, 0),
        party_size=2,
        first_name="Grace",
        last_name="Wanjiku",
        phone="254700000001",
        email="grace@example.com",
        language=language,
        status=status,
    )


def _enquiry(status: str, language: str = "en", days: int = 5) -> ConferenceEnquiry:
    return ConferenceEnquiry.objects.create(
        reference=unique_reference(ConferenceEnquiry, "KQ"),
        date=hotel_today() + timedelta(days=days),
        session=ConferenceEnquiry.Session.HALF_DAY,
        people=24,
        layout=ConferenceEnquiry.Layout.BOARDROOM,
        first_name="Peter",
        last_name="Mwangi",
        company="Acacia Ltd",
        email="peter@example.com",
        phone="254700000002",
        language=language,
        status=status,
    )


def _capture_sms(monkeypatch):
    messages: list[dict] = []

    def fake_send_sms(**kwargs):
        messages.append(kwargs)
        return True

    monkeypatch.setattr(services, "send_sms", fake_send_sms)
    return messages


def test_table_confirmation_emails_and_texts_the_guest(hotel):
    table = _table(TableBooking.Status.CONFIRMED)

    notify_table_booking(table)

    assert len(mail.outbox) == 1
    message = mail.outbox[0]
    assert message.to == ["grace@example.com"]
    assert "confirmed" in message.subject.lower()
    assert table.reference in message.body
    assert NotificationLog.objects.filter(kind="table_booking", status="sent").count() == 2


def test_table_decline_uses_an_update_subject(hotel):
    table = _table(TableBooking.Status.DECLINED)

    notify_table_booking(table)

    assert len(mail.outbox) == 1
    assert "update" in mail.outbox[0].subject.lower()
    assert "could not confirm" in mail.outbox[0].body.lower()


@pytest.mark.parametrize(
    ("status", "expected"),
    [
        (TableBooking.Status.CONFIRMED, "imethibitishwa"),
        (TableBooking.Status.DECLINED, "haikuweza kuthibitishwa"),
    ],
)
def test_table_confirmation_and_decline_are_swahili_when_requested(
    hotel, monkeypatch, status, expected
):
    table = _table(status, language="sw")
    sms = _capture_sms(monkeypatch)

    notify_table_booking(table)

    assert "meza" in mail.outbox[0].subject.lower()
    assert "Habari Grace" in mail.outbox[0].body
    assert expected in sms[0]["message"]
    assert (
        "imethibitishwa" if status == TableBooking.Status.CONFIRMED else "kuthibitisha"
    ) in mail.outbox[0].body


def test_table_language_falls_back_to_english(hotel):
    table = _table(TableBooking.Status.CONFIRMED, language="")

    notify_table_booking(table)

    assert "Table confirmed" in mail.outbox[0].subject


def test_conference_confirmation_and_decline_notify_the_enquirer(hotel):
    confirmed = _enquiry(ConferenceEnquiry.Status.CONFIRMED)
    notify_conference_enquiry(confirmed)

    assert len(mail.outbox) == 1
    assert "confirmed" in mail.outbox[0].subject.lower()
    assert confirmed.reference in mail.outbox[0].body

    declined = _enquiry(ConferenceEnquiry.Status.DECLINED)
    notify_conference_enquiry(declined)

    assert len(mail.outbox) == 2
    assert "update" in mail.outbox[1].subject.lower()
    assert "could not confirm" in mail.outbox[1].body.lower()
    assert NotificationLog.objects.filter(kind="conference_enquiry", status="sent").count() == 4


@pytest.mark.parametrize(
    ("status", "expected"),
    [
        (ConferenceEnquiry.Status.CONFIRMED, "limethibitishwa"),
        (ConferenceEnquiry.Status.DECLINED, "halikuweza kuthibitishwa"),
    ],
)
def test_conference_confirmation_and_decline_are_swahili_when_requested(
    hotel, monkeypatch, status, expected
):
    enquiry = _enquiry(status, language="sw")
    sms = _capture_sms(monkeypatch)

    notify_conference_enquiry(enquiry)

    assert "mkutano" in mail.outbox[0].subject.lower()
    assert "Habari Peter" in mail.outbox[0].body
    assert expected in sms[0]["message"]
    assert (
        "limethibitishwa" if status == ConferenceEnquiry.Status.CONFIRMED else "kuthibitisha"
    ) in mail.outbox[0].body
    assert "Nusu siku" in mail.outbox[0].body
    assert "Bodi" in mail.outbox[0].body
    assert "Nusu siku" in sms[0]["message"]
    assert "Half day" not in mail.outbox[0].body
    assert "Boardroom" not in mail.outbox[0].body


def test_conference_language_falls_back_to_english(hotel):
    enquiry = _enquiry(ConferenceEnquiry.Status.CONFIRMED, language="unknown")

    notify_conference_enquiry(enquiry)

    assert "Conference confirmed" in mail.outbox[0].subject


@pytest.mark.parametrize("language", ["en", "sw"])
def test_facility_reminders_use_the_stored_language(hotel, monkeypatch, language):
    table = _table(TableBooking.Status.CONFIRMED, language=language, days=1)
    enquiry = _enquiry(ConferenceEnquiry.Status.CONFIRMED, language=language, days=1)
    sms = _capture_sms(monkeypatch)

    assert send_facility_reminders() == 2

    assert len(mail.outbox) == 2
    assert all("reminder" in message.subject.lower() or "Kumbusho" in message.subject
               for message in mail.outbox)
    if language == "sw":
        assert all("Habari" in message.body for message in mail.outbox)
        assert all("kumbusho" in item["message"].lower() for item in sms)
        assert "Nusu siku" in mail.outbox[1].body
        assert "Bodi" in mail.outbox[1].body
        assert "Nusu siku" in sms[1]["message"]
        assert "Half day" not in mail.outbox[1].body
        assert "Boardroom" not in mail.outbox[1].body
    else:
        assert all("reminder" in message.body.lower() for message in mail.outbox)
        assert all("reminder" in item["message"].lower() for item in sms)
        assert "Half day" in mail.outbox[1].body
        assert "Boardroom" in mail.outbox[1].body
    assert {item["entity"].pk for item in sms} == {table.pk, enquiry.pk}


@pytest.mark.parametrize("language", ["en", "sw"])
def test_booking_cancellation_uses_the_stored_language(api, hotel, booking_payload, language):
    from apps.bookings.models import Booking

    booking_payload["language"] = language
    # Room booking language is accepted by the public API and persisted.
    response = api.post("/api/v1/bookings/", booking_payload, format="json")
    assert response.status_code == 201, response.content
    booking = Booking.objects.get(reference=response.json()["booking"]["reference"])

    notify_booking_cancelled(booking)

    assert len(mail.outbox) == 1
    if language == "sw":
        assert "imeghairiwa" in mail.outbox[0].subject
        assert "imeghairiwa" in mail.outbox[0].body
    else:
        assert "cancelled" in mail.outbox[0].subject.lower()
