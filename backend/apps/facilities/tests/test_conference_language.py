from __future__ import annotations

from datetime import timedelta

import pytest

from apps.common.utils import hotel_today
from apps.facilities.models import ConferenceEnquiry

pytestmark = pytest.mark.django_db

ENQUIRIES_URL = "/api/v1/facilities/conference/enquiries/"


def enquiry_payload(**overrides):
    payload = {
        "date": (hotel_today() + timedelta(days=3)).isoformat(),
        "session": "half_day",
        "hall": "kopoch",
        "people": 20,
        "layout": "theatre",
        "first_name": "Peter",
        "last_name": "Mwangi",
        "email": "peter@example.com",
        "phone": "0712 345 678",
    }
    payload.update(overrides)
    return payload


@pytest.mark.parametrize(
    ("payload_language", "expected"), [(None, "en"), ("sw", "sw"), ("fr", None)]
)
def test_conference_enquiry_records_the_guest_language(api, payload_language, expected):
    overrides = {} if payload_language is None else {"language": payload_language}
    response = api.post(ENQUIRIES_URL, enquiry_payload(**overrides), format="json")

    if expected is None:
        assert response.status_code == 400
        assert "language" in response.json()["error"]["fields"]
        return
    assert response.status_code == 201, response.content
    body = response.json()["enquiry"]
    assert body["language"] == expected
    assert ConferenceEnquiry.objects.get(reference=body["reference"]).language == expected


@pytest.mark.parametrize("hall", [None, "unknown"])
def test_conference_enquiry_requires_a_known_hall(api, hall):
    overrides = {} if hall is None else {"hall": hall}
    payload = enquiry_payload(**overrides)
    if hall is None:
        payload.pop("hall")

    response = api.post(ENQUIRIES_URL, payload, format="json")

    assert response.status_code == 400
    assert "hall" in response.json()["error"]["fields"]
    assert not ConferenceEnquiry.objects.exists()


def test_conference_enquiry_stores_the_selected_hall(api):
    response = api.post(
        ENQUIRIES_URL, enquiry_payload(hall="attelo"), format="json"
    )

    assert response.status_code == 201, response.content
    body = response.json()["enquiry"]
    assert body["hall"] == "attelo"
    assert body["hall_display"] == "The Attelo Hall"
    assert ConferenceEnquiry.objects.get(reference=body["reference"]).hall == "attelo"
