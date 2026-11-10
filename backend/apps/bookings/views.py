from __future__ import annotations

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.exceptions import Conflict
from apps.notifications.models import NewsletterSubscriber
from apps.rooms.models import RoomType

from .serializers import (
    AvailabilityQuerySerializer,
    AvailabilityRowSerializer,
    BookingCreateResponseSerializer,
    BookingCreateSerializer,
    BookingLookupQuerySerializer,
    BookingPublicSerializer,
    CancelBookingSerializer,
    QuoteRequestSerializer,
    QuoteResponseSerializer,
)
from .services.availability import available_rooms
from .services.bookings import (
    CancellationError,
    SoldOutError,
    cancel_booking,
    create_booking,
    lookup_booking,
    quote_for_request,
)
from .services.pricing import QuoteError


def _client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _quote_data(data) -> dict:
    room_type = data["room_type"]
    quote = quote_for_request(
        room_type=room_type,
        meal_plan=data["meal_plan"],
        checkin=data["checkin"],
        checkout=data["checkout"],
        guests=data["guests"],
        rate_plan_id=data.get("rate_plan"),
    )
    payload = quote.as_dict()
    payload["available_rooms"] = available_rooms(
        room_type, data["checkin"], data["checkout"]
    )
    return payload


@extend_schema(tags=["bookings"])
class AvailabilityView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        parameters=[
            OpenApiParameter("checkin", str, required=True),
            OpenApiParameter("checkout", str, required=True),
            OpenApiParameter("guests", int, required=False),
        ],
        responses=AvailabilityRowSerializer(many=True),
    )
    def get(self, request):
        query = AvailabilityQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        data = query.validated_data
        rows = []
        for room_type in RoomType.objects.filter(active=True).prefetch_related(
            "rate_plans"
        ):
            rows.append(
                {
                    "room_type": room_type.slug,
                    "name": room_type.name_en,
                    "available_rooms": available_rooms(
                        room_type, data["checkin"], data["checkout"]
                    ),
                    "sleeps": room_type.sleeps,
                    "fits_guests": data["guests"] <= room_type.sleeps,
                    "from_price": room_type.from_price,
                }
            )
        return Response(rows)


@extend_schema(tags=["bookings"], request=QuoteRequestSerializer)
class QuoteView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "booking"

    @extend_schema(responses=QuoteResponseSerializer)
    def post(self, request):
        serializer = QuoteRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payload = _quote_data(serializer.validated_data)
        except QuoteError as exc:
            raise ValidationError(exc.fields)
        return Response(payload)


@extend_schema(tags=["bookings"], request=BookingCreateSerializer)
class BookingCreateView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "booking"

    @extend_schema(responses={201: BookingCreateResponseSerializer})
    def post(self, request):
        serializer = BookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        quote_data = data["quote"]

        try:
            booking, _quote = create_booking(
                room_type=quote_data["room_type"],
                meal_plan=quote_data["meal_plan"],
                checkin=quote_data["checkin"],
                checkout=quote_data["checkout"],
                guests=quote_data["guests"],
                rate_plan_id=quote_data.get("rate_plan"),
                first_name=data["first_name"],
                last_name=data["last_name"],
                email=data["email"],
                phone=data["phone"],
                country=data.get("country", ""),
                notes=data.get("notes", ""),
                language=data["language"],
                consent_privacy=data["consent_privacy"],
                guest_ip=_client_ip(request),
                request_id=getattr(request, "request_id", ""),
                client_request_id=data.get("client_request_id") or None,
            )
        except QuoteError as exc:
            raise ValidationError(exc.fields)
        except SoldOutError as exc:
            raise Conflict(str(exc))

        if data.get("marketing_consent"):
            email = data["email"].strip().lower()
            subscriber, _created = NewsletterSubscriber.objects.get_or_create(
                email=email,
                defaults={
                    "consent": True,
                    "language": data["language"],
                    "source": "booking",
                },
            )
            if not subscriber.consent:
                subscriber.consent = True
                subscriber.unsubscribed_at = None
                subscriber.save(update_fields=("consent", "unsubscribed_at", "updated_at"))

        booking = (
            booking.__class__.objects.select_related(
                "room_type", "rate_plan", "meal_plan"
            )
            .prefetch_related("payments", "status_events")
            .get(pk=booking.pk)
        )
        return Response(
            {"booking": BookingPublicSerializer(booking).data},
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["bookings"])
class BookingDetailView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "lookup"

    @extend_schema(
        parameters=[
            OpenApiParameter("email", str, required=False),
            OpenApiParameter("phone", str, required=False),
        ],
        responses=BookingPublicSerializer,
    )
    def get(self, request, reference: str):
        query = BookingLookupQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        booking = lookup_booking(
            reference,
            email=query.validated_data.get("email", ""),
            phone=query.validated_data.get("phone", ""),
        )
        if booking is None:
            return Response(
                {
                    "error": {
                        "code": "not_found",
                        "message": "We could not find a booking with those details.",
                        "fields": None,
                    }
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        booking = (
            booking.__class__.objects.select_related(
                "room_type", "rate_plan", "meal_plan"
            )
            .prefetch_related("payments", "status_events")
            .get(pk=booking.pk)
        )
        return Response(BookingPublicSerializer(booking).data)


@extend_schema(tags=["bookings"])
class BookingCancelView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "lookup"

    @extend_schema(
        parameters=[
            OpenApiParameter("email", str, required=False),
            OpenApiParameter("phone", str, required=False),
        ],
        request=CancelBookingSerializer,
        responses=BookingPublicSerializer,
    )
    def post(self, request, reference: str):
        query = BookingLookupQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        booking = lookup_booking(
            reference,
            email=query.validated_data.get("email", ""),
            phone=query.validated_data.get("phone", ""),
        )
        if booking is None:
            return Response(
                {
                    "error": {
                        "code": "not_found",
                        "message": "We could not find a booking with those details.",
                        "fields": None,
                    }
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        body = CancelBookingSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        try:
            cancel_booking(
                booking,
                reason=body.validated_data.get("reason")
                or "Cancelled by guest",
                request=request,
                request_id=getattr(request, "request_id", ""),
            )
        except CancellationError as exc:
            raise Conflict(str(exc))
        booking.refresh_from_db()
        return Response(BookingPublicSerializer(booking).data)
