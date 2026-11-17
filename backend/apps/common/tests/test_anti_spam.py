"""Hidden honeypot and minimum-time checks on every public form.

A bot must receive the same success response as a guest while no row is
written, no email is queued and no booking lookup is performed.
"""

from __future__ import annotations

import time
from datetime import timedelta

import pytest

from apps.bookings.models import Booking
from apps.common import anti_spam
from apps.common.utils import hotel_today
from apps.facilities.models import ConferenceEnquiry, GymDayPass, TableBooking
from apps.notifications.models import ContactMessage, NewsletterSubscriber

pytestmark = pytest.mark.django_db

NEWSLETTER_URL = "/api/v1/marketing/newsletter/"
CONTACT_URL = "/api/v1/marketing/contact/"
TABLE_URL = "/api/v1/facilities/restaurant/bookings/"
CONFERENCE_URL = "/api/v1/facilities/conference/enquiries/"
GYM_URL = "/api/v1/facilities/gym/day-passes/"


def _past_ms(seconds: int = 10) -> int:
    return int(time.time() * 1000) - seconds * 1000


def _newsletter_payload(**overrides):
    payload = {"email": "guest@example.com", "language": "en", "source": "test"}
    payload.update(overrides)
    return payload


def _contact_payload(**overrides):
    payload = {
        "name": "Grace Wanjiku",
        "email": "grace@example.com",
        "topic": "general",
        "message": "Do you have a room for two nights?",
        "language": "en",
    }
    payload.update(overrides)
    return payload


def _table_payload(**overrides):
    payload = {
        "date": (hotel_today() + timedelta(days=2)).isoformat(),
        "time": "19:00",
        "party_size": 2,
        "first_name": "Grace",
        "last_name": "Wanjiku",
        "phone": "0712 345 678",
        "email": "grace@example.com",
    }
    payload.update(overrides)
    return payload


def _conference_payload(**overrides):
    payload = {
        "date": (hotel_today() + timedelta(days=4)).isoformat(),
        "session": "full_day",
        "people": 20,
        "layout": "theatre",
        "first_name": "Grace",
        "last_name": "Wanjiku",
        "company": "Acme",
        "email": "grace@example.com",
        "phone": "0712 345 678",
    }
    payload.update(overrides)
    return payload


def _gym_payload(**overrides):
    payload = {
        "date": hotel_today().isoformat(),
        "full_name": "Grace Wanjiku",
        "phone": "0712 345 678",
        "email": "",
        "payment_method": "reception",
    }
    payload.update(overrides)
    return payload


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def test_honeypot_value_marks_the_submission_as_a_bot():
    assert anti_spam.is_bot_submission({"website": "http://spam.example"})


def test_blank_honeypot_is_human():
    assert not anti_spam.is_bot_submission({"website": ""})


def test_instant_submission_is_a_bot():
    assert anti_spam.is_bot_submission({"form_started_at": int(time.time() * 1000)})


def test_slow_submission_is_human():
    assert not anti_spam.is_bot_submission({"form_started_at": _past_ms()})


def test_missing_timestamp_stays_compatible_with_older_clients():
    assert not anti_spam.is_bot_submission({})


def test_unparseable_timestamp_is_a_bot():
    assert anti_spam.is_bot_submission({"form_started_at": "yesterday"})


# ---------------------------------------------------------------------------
# Endpoints: honeypot filled
# ---------------------------------------------------------------------------


def test_newsletter_honeypot_returns_success_without_storing(api):
    response = api.post(NEWSLETTER_URL, _newsletter_payload(website="spam"), format="json")

    assert response.status_code == 201
    assert response.json()["subscribed"] is True
    assert not NewsletterSubscriber.objects.exists()


def test_contact_honeypot_returns_success_without_storing(api):
    response = api.post(CONTACT_URL, _contact_payload(website="spam"), format="json")

    assert response.status_code == 201
    assert response.json()["message"]["reference"]
    assert not ContactMessage.objects.exists()


def test_table_booking_honeypot_returns_success_without_storing(api):
    response = api.post(TABLE_URL, _table_payload(website="spam"), format="json")

    assert response.status_code == 201
    assert response.json()["booking"]["reference"]
    assert not TableBooking.objects.exists()


def test_conference_honeypot_returns_success_without_storing(api):
    response = api.post(CONFERENCE_URL, _conference_payload(website="spam"), format="json")

    assert response.status_code == 201
    assert response.json()["enquiry"]["reference"]
    assert not ConferenceEnquiry.objects.exists()


def test_gym_honeypot_returns_success_without_storing(api):
    response = api.post(GYM_URL, _gym_payload(website="spam"), format="json")

    assert response.status_code == 201
    assert response.json()["day_pass"]["reference"]
    assert not GymDayPass.objects.exists()


def test_booking_create_honeypot_returns_success_without_storing(api, booking_payload):
    response = api.post(
        "/api/v1/bookings/", {**booking_payload, "website": "spam"}, format="json"
    )

    assert response.status_code == 201
    assert response.json()["booking"]["reference"]
    assert not Booking.objects.exists()


def test_booking_lookup_honeypot_is_generic_not_found(api, booking_payload):
    reference = api.post("/api/v1/bookings/", booking_payload, format="json").json()["booking"][
        "reference"
    ]

    response = api.get(
        f"/api/v1/bookings/{reference}/?email=amina@example.com&website=spam"
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


# ---------------------------------------------------------------------------
# Endpoints: submitted too quickly
# ---------------------------------------------------------------------------


def test_newsletter_instant_submit_returns_success_without_storing(api):
    response = api.post(
        NEWSLETTER_URL,
        _newsletter_payload(form_started_at=int(time.time() * 1000)),
        format="json",
    )

    assert response.status_code == 201
    assert not NewsletterSubscriber.objects.exists()


def test_contact_instant_submit_returns_success_without_storing(api):
    response = api.post(
        CONTACT_URL,
        _contact_payload(form_started_at=int(time.time() * 1000)),
        format="json",
    )

    assert response.status_code == 201
    assert not ContactMessage.objects.exists()


def test_booking_lookup_instant_submit_is_generic_not_found(api, booking_payload):
    reference = api.post("/api/v1/bookings/", booking_payload, format="json").json()["booking"][
        "reference"
    ]

    response = api.get(
        f"/api/v1/bookings/{reference}/?email=amina@example.com"
        f"&form_started_at={int(time.time() * 1000)}"
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


# ---------------------------------------------------------------------------
# Real guests are unaffected
# ---------------------------------------------------------------------------


def test_newsletter_normal_submit_is_stored(api):
    response = api.post(
        NEWSLETTER_URL, _newsletter_payload(form_started_at=_past_ms()), format="json"
    )

    assert response.status_code == 201
    assert NewsletterSubscriber.objects.filter(email="guest@example.com").exists()


def test_contact_normal_submit_is_stored(api):
    response = api.post(
        CONTACT_URL, _contact_payload(form_started_at=_past_ms()), format="json"
    )

    assert response.status_code == 201
    assert ContactMessage.objects.filter(email="grace@example.com").exists()


def test_table_booking_normal_submit_is_stored(api):
    response = api.post(TABLE_URL, _table_payload(form_started_at=_past_ms()), format="json")

    assert response.status_code == 201
    assert TableBooking.objects.filter(venue=TableBooking.Venue.RESTAURANT).exists()


def test_conference_normal_submit_is_stored(api):
    response = api.post(
        CONFERENCE_URL, _conference_payload(form_started_at=_past_ms()), format="json"
    )

    assert response.status_code == 201
    assert ConferenceEnquiry.objects.exists()


def test_gym_normal_submit_is_stored(api):
    response = api.post(GYM_URL, _gym_payload(form_started_at=_past_ms()), format="json")

    assert response.status_code == 201
    assert GymDayPass.objects.exists()


def test_booking_lookup_normal_submit_succeeds(api, booking_payload):
    reference = api.post("/api/v1/bookings/", booking_payload, format="json").json()["booking"][
        "reference"
    ]

    response = api.get(
        f"/api/v1/bookings/{reference}/?email=amina@example.com"
        f"&form_started_at={_past_ms()}"
    )

    assert response.status_code == 200
    assert response.json()["reference"] == reference
