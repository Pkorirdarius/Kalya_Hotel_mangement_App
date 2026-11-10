from __future__ import annotations

from django.db.models import Q
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import CanManageBookings
from apps.bookings.models import Booking, BookingStatus

from .serializers import StaffBookingSerializer


@extend_schema(tags=["staff bookings"])
class StaffBookingListView(generics.ListAPIView):
    permission_classes = [CanManageBookings]
    serializer_class = StaffBookingSerializer

    @extend_schema(
        parameters=[
            OpenApiParameter("status", str, required=False),
            OpenApiParameter("checkin", str, required=False),
            OpenApiParameter("search", str, required=False),
        ]
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        queryset = Booking.objects.select_related(
            "room_type", "rate_plan", "meal_plan"
        ).prefetch_related("payments", "status_events")
        status_value = self.request.query_params.get("status")
        if status_value in BookingStatus.values:
            queryset = queryset.filter(status=status_value)
        checkin = self.request.query_params.get("checkin")
        if checkin:
            queryset = queryset.filter(checkin=checkin)
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(reference__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
            ).distinct()
        return queryset


@extend_schema(tags=["staff bookings"])
class StaffBookingDetailView(generics.RetrieveAPIView):
    permission_classes = [CanManageBookings]
    serializer_class = StaffBookingSerializer
    lookup_field = "reference"

    def get_queryset(self):
        return Booking.objects.select_related(
            "room_type", "rate_plan", "meal_plan"
        ).prefetch_related("payments", "status_events")
