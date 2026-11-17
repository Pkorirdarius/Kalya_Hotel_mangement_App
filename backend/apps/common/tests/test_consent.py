from __future__ import annotations

import pytest

from apps.common.models import ConsentRecord, HotelSetting

pytestmark = pytest.mark.django_db


def test_booking_purchase_records_privacy_consent(api, booking_payload):
    payload = {**booking_payload, "language": "sw"}
    response = api.post("/api/v1/bookings/", payload, format="json")

    assert response.status_code == 201
    reference = response.json()["booking"]["reference"]
    record = ConsentRecord.objects.get(reference=reference)
    assert record.scope == ConsentRecord.Scope.BOOKING_PRIVACY
    assert record.subject == "amina@example.com"
    assert record.language == "sw"
    assert record.policy_version == HotelSetting.load().privacy_notice_version
    assert record.policy_url == HotelSetting.load().privacy_notice_url


def test_booking_without_privacy_consent_is_rejected_and_not_recorded(api, booking_payload):
    response = api.post(
        "/api/v1/bookings/",
        {**booking_payload, "consent_privacy": False},
        format="json",
    )

    assert response.status_code == 400
    assert not ConsentRecord.objects.exists()


def test_newsletter_records_marketing_consent(api):
    response = api.post(
        "/api/v1/marketing/newsletter/",
        {"email": "reader@example.com", "consent": True, "language": "sw"},
        format="json",
    )

    assert response.status_code == 201
    record = ConsentRecord.objects.get(scope=ConsentRecord.Scope.NEWSLETTER)
    assert record.subject == "reader@example.com"
    assert record.language == "sw"
    assert record.policy_version == HotelSetting.load().privacy_notice_version
    assert record.text_hash == ""
