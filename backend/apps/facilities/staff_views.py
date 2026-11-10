from __future__ import annotations

from drf_spectacular.utils import extend_schema
from rest_framework import viewsets

from apps.accounts.permissions import CanManageContent, CanManageFacilities

from .models import (
    ConferenceBlock,
    ConferenceEnquiry,
    GymDayPass,
    GymMembershipEnquiry,
    MenuItem,
    TableBooking,
)
from .serializers import (
    ConferenceBlockSerializer,
    ConferenceEnquiryStaffSerializer,
    GymDayPassStaffSerializer,
    GymMembershipEnquirySerializer,
    MenuItemStaffSerializer,
    TableBookingStaffSerializer,
)


@extend_schema(tags=["staff facilities"])
class MenuItemViewSet(viewsets.ModelViewSet):
    permission_classes = [CanManageContent]
    serializer_class = MenuItemStaffSerializer
    queryset = MenuItem.objects.all()
    filterset_fields = ("venue", "category", "active")
    search_fields = ("name_en", "name_sw")


@extend_schema(tags=["staff facilities"])
class TableBookingViewSet(viewsets.ModelViewSet):
    permission_classes = [CanManageFacilities]
    serializer_class = TableBookingStaffSerializer
    queryset = TableBooking.objects.all()
    http_method_names = ["get", "patch", "head", "options"]
    filterset_fields = ("status", "date")
    search_fields = ("reference", "first_name", "last_name", "phone", "email")
    ordering_fields = ("date", "time", "created_at")


@extend_schema(tags=["staff facilities"])
class ConferenceEnquiryViewSet(viewsets.ModelViewSet):
    permission_classes = [CanManageFacilities]
    serializer_class = ConferenceEnquiryStaffSerializer
    queryset = ConferenceEnquiry.objects.all()
    http_method_names = ["get", "patch", "head", "options"]
    filterset_fields = ("status", "date", "session")
    search_fields = ("reference", "first_name", "last_name", "company", "email", "phone")


@extend_schema(tags=["staff facilities"])
class ConferenceBlockViewSet(viewsets.ModelViewSet):
    permission_classes = [CanManageFacilities]
    serializer_class = ConferenceBlockSerializer
    queryset = ConferenceBlock.objects.all()
    filterset_fields = ("date", "session")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


@extend_schema(tags=["staff facilities"])
class GymDayPassViewSet(viewsets.ModelViewSet):
    permission_classes = [CanManageFacilities]
    serializer_class = GymDayPassStaffSerializer
    queryset = GymDayPass.objects.all()
    http_method_names = ["get", "patch", "head", "options"]
    filterset_fields = ("status", "date", "payment_method")
    search_fields = ("reference", "full_name", "phone", "email")


@extend_schema(tags=["staff facilities"])
class GymMembershipEnquiryViewSet(viewsets.ModelViewSet):
    permission_classes = [CanManageFacilities]
    serializer_class = GymMembershipEnquirySerializer
    queryset = GymMembershipEnquiry.objects.all()
    filterset_fields = ("status",)
    search_fields = ("full_name", "phone", "email")
