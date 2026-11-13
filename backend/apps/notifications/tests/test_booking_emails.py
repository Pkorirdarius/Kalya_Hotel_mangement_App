from __future__ import annotations

import pytest
from django.core import mail

from apps.bookings.models import Booking
from apps.notifications.services import notify_booking_confirmed

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize("language", ["en", "sw"])
def test_booking_confirmation_email_includes_manage_link(
    api, booking_payload, language
):
    response = api.post("/api/v1/bookings/", booking_payload, format="json")

    assert response.status_code == 201, response.content
    reference = response.json()["booking"]["reference"]
    booking = Booking.objects.select_related("room_type", "meal_plan").get(
        reference=reference
    )

    mail.outbox.clear()
    notify_booking_confirmed(booking, language=language)

    assert len(mail.outbox) == 1
    assert f"/booking/manage?reference={reference}" in mail.outbox[0].body
