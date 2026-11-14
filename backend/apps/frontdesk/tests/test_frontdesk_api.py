from __future__ import annotations

from datetime import time, timedelta
from decimal import Decimal

import pytest
from django.utils import timezone

from apps.accounts.models import User, UserRole
from apps.bookings.models import Booking, BookingStatus, BookingStatusEvent
from apps.common.models import AuditLog
from apps.common.utils import hotel_today, unique_reference
from apps.facilities.models import ConferenceEnquiry, GymDayPass, TableBooking
from apps.frontdesk.models import DeskAction
from apps.notifications.models import NotificationLog
from apps.payments.models import Payment

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def frontdesk_settings(hotel):
    hotel.frontdesk_target_minutes = 10
    hotel.frontdesk_escalate_minutes = 5
    hotel.frontdesk_undo_seconds = 10
    hotel.save()
    return hotel


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


@pytest.fixture
def marketing_user():
    return User.objects.create_user(
        username="marketing",
        email="marketing@example.com",
        password="strong-test-password",
        first_name="Maya",
        last_name="Njeri",
        role=UserRole.MARKETING,
        is_staff=True,
    )


def _backdate_event(event: BookingStatusEvent, minutes: int) -> None:
    BookingStatusEvent.objects.filter(pk=event.pk).update(
        created_at=timezone.now() - timedelta(minutes=minutes)
    )


@pytest.fixture
def create_booking(room_type, meal_plan, stay_dates):
    counter = {"value": 0}

    def _create(
        *,
        status: str = BookingStatus.PENDING_PAYMENT,
        minutes_ago: int = 1,
        **overrides,
    ) -> Booking:
        counter["value"] += 1
        checkin, checkout = stay_dates
        values = {
            "reference": f"WP-TEST-{counter['value']:04d}",
            "room_type": room_type,
            "rate_plan": room_type.rate_plans.first(),
            "meal_plan": meal_plan,
            "checkin": checkin,
            "checkout": checkout,
            "guests": 2,
            "first_name": "Amina",
            "last_name": "Wanjiku",
            "email": "amina@example.com",
            "phone": "254712345678",
            "status": status,
            "total": Decimal("19400.00"),
        }
        values.update(overrides)
        booking = Booking.objects.create(**values)
        event = BookingStatusEvent.objects.create(
            booking=booking,
            from_status="",
            to_status=status,
            reason="Test fixture",
        )
        _backdate_event(event, minutes_ago)
        return booking

    return _create


@pytest.fixture
def pending_booking(create_booking):
    return create_booking()


@pytest.fixture
def table_booking():
    booking = TableBooking.objects.create(
        reference=unique_reference(TableBooking, "TB"),
        date=hotel_today() + timedelta(days=2),
        time=time(19, 0),
        party_size=2,
        first_name="Grace",
        last_name="Wanjiku",
        phone="254700000001",
    )
    TableBooking.objects.filter(pk=booking.pk).update(
        created_at=timezone.now() - timedelta(minutes=2)
    )
    return booking


@pytest.fixture
def conference_enquiry():
    enquiry = ConferenceEnquiry.objects.create(
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
    )
    ConferenceEnquiry.objects.filter(pk=enquiry.pk).update(
        created_at=timezone.now() - timedelta(minutes=3)
    )
    return enquiry


@pytest.fixture
def gym_pass():
    day_pass = GymDayPass.objects.create(
        reference=unique_reference(GymDayPass, "GY"),
        date=hotel_today() + timedelta(days=1),
        full_name="Daniel Otieno",
        phone="254700000003",
        email="daniel@example.com",
        amount=Decimal("500.00"),
        payment_method=GymDayPass.PaymentMethod.RECEPTION,
        status=GymDayPass.Status.PENDING_CONFIRMATION,
    )
    GymDayPass.objects.filter(pk=day_pass.pk).update(
        created_at=timezone.now() - timedelta(minutes=4)
    )
    return day_pass


def test_queue_requires_manage_bookings_permission(api, marketing_user, staff_user):
    assert api.get("/api/v1/staff/frontdesk/queue/").status_code == 401

    api.force_login(marketing_user)
    assert api.get("/api/v1/staff/frontdesk/queue/").status_code == 403
    assert (
        api.post(
            "/api/v1/staff/frontdesk/actions/",
            {"entity_type": "booking", "entity_id": 1, "action": "confirm"},
            format="json",
        ).status_code
        == 403
    )

    api.force_login(staff_user)
    assert api.get("/api/v1/staff/frontdesk/queue/").status_code == 200


def test_queue_lists_open_booking_and_facility_requests(
    api,
    staff_user,
    pending_booking,
    table_booking,
    conference_enquiry,
    gym_pass,
    create_booking,
):
    create_booking(status=BookingStatus.CONFIRMED)

    api.force_login(staff_user)
    response = api.get("/api/v1/staff/frontdesk/queue/")

    assert response.status_code == 200
    assert response.data["target_minutes"] == 10
    assert response.data["escalate_minutes"] == 5
    assert response.data["undo_seconds"] == 10

    items = response.data["items"]
    entity_types = {item["entity_type"] for item in items}
    assert entity_types == {
        "booking",
        "table_booking",
        "conference_enquiry",
        "gym_pass",
    }

    booking_item = next(item for item in items if item["entity_type"] == "booking")
    assert booking_item["id"] == pending_booking.pk
    assert booking_item["reference"] == pending_booking.reference
    assert booking_item["guest_name"] == "Amina Wanjiku"
    assert booking_item["phone"] == "254712345678"
    assert booking_item["amount"] == 19400
    assert booking_item["status"] == BookingStatus.PENDING_PAYMENT
    assert booking_item["payment_status"] == "unpaid"
    assert booking_item["actions"] == ["confirm", "decline"]
    assert booking_item["seconds_remaining"] <= 10 * 60
    assert booking_item["overdue"] is False
    assert "Standard" in booking_item["summary"]

    gym_item = next(item for item in items if item["entity_type"] == "gym_pass")
    assert gym_item["payment_status"] == "paid"
    assert gym_item["amount"] == 500


def test_booking_confirm_marks_bank_transfer_paid_and_undo_reverses(
    api, staff_user, pending_booking
):
    payment = Payment.objects.create(
        reference=unique_reference(Payment, "PAY"),
        purpose=Payment.Purpose.ROOM_BOOKING,
        booking=pending_booking,
        amount=pending_booking.total,
        currency="KES",
        provider=Payment.Provider.BANK_TRANSFER,
        status=Payment.Status.PENDING,
    )
    api.force_login(staff_user)

    response = api.post(
        "/api/v1/staff/frontdesk/actions/",
        {
            "entity_type": "booking",
            "entity_id": pending_booking.pk,
            "action": "confirm",
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.data["action"] == "confirm"
    assert response.data["previous_status"] == BookingStatus.PENDING_PAYMENT
    assert response.data["new_status"] == BookingStatus.CONFIRMED
    assert response.data["actor_name"] == "Amina Kip"
    assert response.data["undo_deadline"]

    pending_booking.refresh_from_db()
    payment.refresh_from_db()
    assert pending_booking.status == BookingStatus.CONFIRMED
    assert pending_booking.confirmed_at is not None
    assert payment.status == Payment.Status.SUCCEEDED
    assert payment.paid_at is not None
    assert AuditLog.objects.filter(
        action="frontdesk.confirm.booking", entity_id=str(pending_booking.pk)
    ).exists()

    undo = api.post(
        "/api/v1/staff/frontdesk/actions/",
        {
            "entity_type": "booking",
            "entity_id": pending_booking.pk,
            "action": "undo",
        },
        format="json",
    )

    assert undo.status_code == 201
    assert undo.data["action"] == "undo"
    assert undo.data["previous_status"] == BookingStatus.CONFIRMED
    assert undo.data["new_status"] == BookingStatus.PENDING_PAYMENT

    pending_booking.refresh_from_db()
    payment.refresh_from_db()
    assert pending_booking.status == BookingStatus.PENDING_PAYMENT
    assert payment.status == Payment.Status.PENDING
    assert payment.paid_at is None
    assert DeskAction.objects.get(pk=response.data["id"]).undone_at is not None


def test_undo_is_rejected_after_the_window_closes(api, staff_user, table_booking):
    api.force_login(staff_user)
    response = api.post(
        "/api/v1/staff/frontdesk/actions/",
        {
            "entity_type": "table_booking",
            "entity_id": table_booking.pk,
            "action": "confirm",
        },
        format="json",
    )
    assert response.status_code == 201

    DeskAction.objects.filter(pk=response.data["id"]).update(
        created_at=timezone.now() - timedelta(seconds=60)
    )

    undo = api.post(
        "/api/v1/staff/frontdesk/actions/",
        {
            "entity_type": "table_booking",
            "entity_id": table_booking.pk,
            "action": "undo",
        },
        format="json",
    )

    assert undo.status_code == 400
    assert "undo window" in str(undo.data).lower()
    table_booking.refresh_from_db()
    assert table_booking.status == TableBooking.Status.CONFIRMED


def test_gym_confirmation_issues_qr_and_undo_clears_reception_payment(
    api, staff_user, gym_pass
):
    api.force_login(staff_user)

    response = api.post(
        "/api/v1/staff/frontdesk/actions/",
        {
            "entity_type": "gym_pass",
            "entity_id": gym_pass.pk,
            "action": "confirm",
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.data["new_status"] == GymDayPass.Status.CONFIRMED
    gym_pass.refresh_from_db()
    assert gym_pass.status == GymDayPass.Status.CONFIRMED
    assert gym_pass.qr_token is not None
    assert gym_pass.paid_at is not None

    undo = api.post(
        "/api/v1/staff/frontdesk/actions/",
        {
            "entity_type": "gym_pass",
            "entity_id": gym_pass.pk,
            "action": "undo",
        },
        format="json",
    )

    assert undo.status_code == 201
    assert undo.data["new_status"] == GymDayPass.Status.PENDING_CONFIRMATION
    gym_pass.refresh_from_db()
    assert gym_pass.status == GymDayPass.Status.PENDING_CONFIRMATION
    assert gym_pass.qr_token is None
    assert gym_pass.paid_at is None


def test_activity_returns_recent_actions(api, staff_user, table_booking):
    api.force_login(staff_user)
    api.post(
        "/api/v1/staff/frontdesk/actions/",
        {
            "entity_type": "table_booking",
            "entity_id": table_booking.pk,
            "action": "decline",
        },
        format="json",
    )

    response = api.get("/api/v1/staff/frontdesk/activity/?limit=1")

    assert response.status_code == 200
    assert len(response.data["results"]) == 1
    row = response.data["results"][0]
    assert row["entity_type"] == "table_booking"
    assert row["entity_id"] == table_booking.pk
    assert row["action"] == "decline"
    assert row["actor"] == "Amina Kip"
    assert row["undone_at"] is None


def test_escalation_alerts_manager_once_for_overdue_items(
    api, staff_user, create_booking
):
    booking = create_booking(minutes_ago=30)
    api.force_login(staff_user)

    response = api.post("/api/v1/staff/frontdesk/escalate/")

    assert response.status_code == 200
    assert response.data["escalated"] == 1
    booking.refresh_from_db()
    assert booking.escalated_at is not None
    assert NotificationLog.objects.filter(kind="frontdesk_escalation").exists()

    again = api.post("/api/v1/staff/frontdesk/escalate/")
    assert again.status_code == 200
    assert again.data["escalated"] == 0
