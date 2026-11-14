from __future__ import annotations

from datetime import time, timedelta

import pytest
from django.core import mail

from apps.common.utils import hotel_today, unique_reference
from apps.facilities.models import ConferenceEnquiry, TableBooking
from apps.notifications.models import NotificationLog
from apps.notifications.services import (
    notify_conference_enquiry,
    notify_table_booking,
)

pytestmark = pytest.mark.django_db


def _table(status: str) -> TableBooking:
    return TableBooking.objects.create(
        reference=unique_reference(TableBooking, "TB"),
        date=hotel_today() + timedelta(days=2),
        time=time(19, 0),
        party_size=2,
        first_name="Grace",
        last_name="Wanjiku",
        phone="254700000001",
        email="grace@example.com",
        status=status,
    )


def _enquiry(status: str) -> ConferenceEnquiry:
    return ConferenceEnquiry.objects.create(
        reference=unique_reference(ConferenceEnquiry, "KQ"),
        date=hotel_today() + timedelta(days=5),
        session=ConferenceEnquiry.Session.HALF_DAY,
        people=24,
        layout=ConferenceEnquiry.Layout.BOARDROOM,
        first_name="Peter",
        last_name="Mwangi",
        company="Acacia Ltd",
        email="peter@example.com",
        phone="254700000002",
        status=status,
    )


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
