from __future__ import annotations

import io
from datetime import timedelta

import qrcode
from django.http import HttpResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.models import HotelSetting
from apps.common.utils import as_kes_int, hotel_today

from .models import ConferenceEnquiry, GymDayPass, MenuItem, TableBooking
from .serializers import (
    ConferenceAvailabilitySerializer,
    ConferenceEnquiryCreateResponseSerializer,
    ConferenceEnquiryCreateSerializer,
    ConferenceEnquirySerializer,
    GymAvailabilitySerializer,
    GymDayPassCreateResponseSerializer,
    GymDayPassCreateSerializer,
    GymDayPassSerializer,
    MenuItemSerializer,
    RestaurantSlotSerializer,
    TableBookingCreateResponseSerializer,
    TableBookingCreateSerializer,
    TableBookingSerializer,
)
from .services import (
    FacilityError,
    conference_availability,
    create_conference_enquiry,
    create_gym_day_pass,
    create_table_booking,
    gym_remaining,
    restaurant_slot_capacity,
)


def _raise_facility_error(exc: FacilityError):
    raise ValidationError(exc.fields)


@extend_schema(tags=["restaurant"])
class RestaurantSlotsView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        parameters=[OpenApiParameter("date", str, required=True)],
        responses=RestaurantSlotSerializer(many=True),
    )
    def get(self, request):
        raw = request.query_params.get("date")
        if not raw:
            raise ValidationError({"date": "Choose a date."})
        from datetime import date as date_cls

        try:
            day = date_cls.fromisoformat(raw)
        except ValueError:
            raise ValidationError({"date": "Enter a valid date."})
        return Response(restaurant_slot_capacity(day))


@extend_schema(tags=["restaurant"], request=TableBookingCreateSerializer)
class TableBookingCreateView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "enquiry"

    @extend_schema(responses={201: TableBookingCreateResponseSerializer})
    def post(self, request):
        serializer = TableBookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            booking = create_table_booking(
                date_value=data["date"],
                slot=data["time"],
                party_size=data["party_size"],
                first_name=data["first_name"],
                last_name=data["last_name"],
                phone=data["phone"],
                email=data.get("email", ""),
                occasion=data.get("occasion", ""),
                notes=data.get("notes", ""),
            )
        except FacilityError as exc:
            _raise_facility_error(exc)
        return Response(
            {"booking": TableBookingSerializer(booking).data},
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["restaurant"])
class TableBookingDetailView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "lookup"

    @extend_schema(responses=TableBookingSerializer)
    def get(self, request, reference: str):
        phone = request.query_params.get("phone", "")
        booking = TableBooking.objects.filter(reference__iexact=reference).first()
        if booking is None or (phone and booking.phone != phone):
            raise NotFound("We could not find that table booking.")
        return Response(TableBookingSerializer(booking).data)


@extend_schema(tags=["conference"])
class ConferenceAvailabilityView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        parameters=[
            OpenApiParameter("date", str, required=False),
            OpenApiParameter("session", str, required=False),
        ],
        responses=ConferenceAvailabilitySerializer(many=True),
    )
    def get(self, request):
        raw = request.query_params.get("date")
        session = request.query_params.get("session", "full_day")
        if raw:
            from datetime import date as date_cls

            try:
                day = date_cls.fromisoformat(raw)
            except ValueError:
                raise ValidationError({"date": "Enter a valid date."})
            result = conference_availability(day, session)
            return Response(
                [
                    {
                        "date": day.isoformat(),
                        "session": session,
                        "status": result["status"],
                        "label": result["label"],
                    }
                ]
            )
        start = hotel_today()
        payload = []
        for offset in range(10):
            day = start + timedelta(days=offset)
            result = conference_availability(day, session)
            payload.append(
                {
                    "date": day.isoformat(),
                    "session": session,
                    "status": result["status"],
                    "label": result["label"],
                }
            )
        return Response(payload)


@extend_schema(tags=["conference"], request=ConferenceEnquiryCreateSerializer)
class ConferenceEnquiryCreateView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "enquiry"

    @extend_schema(responses={201: ConferenceEnquiryCreateResponseSerializer})
    def post(self, request):
        serializer = ConferenceEnquiryCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            enquiry = create_conference_enquiry(
                date_value=data["date"],
                session=data["session"],
                people=data["people"],
                layout=data["layout"],
                catering=data.get("catering", []),
                first_name=data["first_name"],
                last_name=data["last_name"],
                company=data.get("company", ""),
                email=data["email"],
                phone=data["phone"],
                notes=data.get("notes", ""),
            )
        except FacilityError as exc:
            _raise_facility_error(exc)
        return Response(
            {"enquiry": ConferenceEnquirySerializer(enquiry).data},
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["conference"])
class ConferenceEnquiryDetailView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "lookup"

    @extend_schema(responses=ConferenceEnquirySerializer)
    def get(self, request, reference: str):
        email = request.query_params.get("email", "").strip().lower()
        enquiry = ConferenceEnquiry.objects.filter(reference__iexact=reference).first()
        if enquiry is None or (email and enquiry.email.lower() != email):
            raise NotFound("We could not find that enquiry.")
        return Response(ConferenceEnquirySerializer(enquiry).data)


@extend_schema(tags=["gym"])
class GymAvailabilityView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        parameters=[OpenApiParameter("date", str, required=False)],
        responses=GymAvailabilitySerializer,
    )
    def get(self, request):
        raw = request.query_params.get("date")
        from datetime import date as date_cls

        try:
            day = date_cls.fromisoformat(raw) if raw else hotel_today()
        except ValueError:
            raise ValidationError({"date": "Enter a valid date."})
        settings_obj = HotelSetting.load()
        return Response(
            GymAvailabilitySerializer(
                {
                    "date": day,
                    "remaining": gym_remaining(day),
                    "price": as_kes_int(settings_obj.gym_day_pass_price),
                }
            ).data
        )


@extend_schema(tags=["gym"], request=GymDayPassCreateSerializer)
class GymDayPassCreateView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "enquiry"

    @extend_schema(responses={201: GymDayPassCreateResponseSerializer})
    def post(self, request):
        serializer = GymDayPassCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            gym_pass = create_gym_day_pass(
                date_value=data["date"],
                full_name=data["full_name"],
                phone=data["phone"],
                email=data.get("email", ""),
                payment_method=data["payment_method"],
            )
        except FacilityError as exc:
            _raise_facility_error(exc)
        return Response(
            {"day_pass": GymDayPassSerializer(gym_pass, context={"request": request}).data},
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["gym"])
class GymDayPassDetailView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "lookup"

    @extend_schema(responses=GymDayPassSerializer)
    def get(self, request, reference: str):
        phone = request.query_params.get("phone", "")
        gym_pass = GymDayPass.objects.filter(reference__iexact=reference).first()
        if gym_pass is None or (phone and gym_pass.phone != phone):
            raise NotFound("We could not find that day pass.")
        return Response(
            GymDayPassSerializer(gym_pass, context={"request": request}).data
        )


@extend_schema(tags=["gym"])
class GymDayPassQrView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        parameters=[OpenApiParameter("token", str, required=False)],
        responses={(200, "image/png"): OpenApiTypes.BINARY},
    )
    def get(self, request, reference: str):
        gym_pass = GymDayPass.objects.filter(reference__iexact=reference).first()
        if gym_pass is None or gym_pass.qr_token is None:
            raise NotFound("That QR code is not available.")
        token = request.query_params.get("token", "")
        is_staff = bool(getattr(request.user, "is_staff", False))
        if not is_staff and token != str(gym_pass.qr_token):
            raise NotFound("That QR code is not available.")
        payload = f"WESTPREMIER-GYM:{gym_pass.reference}:{gym_pass.qr_token}"
        image = qrcode.make(payload)
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        return HttpResponse(buffer.getvalue(), content_type="image/png")


@extend_schema(tags=["restaurant"])
class MenuView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        parameters=[
            OpenApiParameter("venue", str, required=False),
            OpenApiParameter("category", str, required=False),
        ],
        responses=MenuItemSerializer(many=True),
    )
    def get(self, request):
        queryset = MenuItem.objects.filter(active=True)
        venue = request.query_params.get("venue")
        category = request.query_params.get("category")
        if venue:
            queryset = queryset.filter(venue=venue)
        if category:
            queryset = queryset.filter(category__iexact=category)
        return Response(MenuItemSerializer(queryset, many=True).data)
