from datetime import timedelta

from django.db import connection
from django.db.models import Count
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import CanManageSystem

from .models import FormGuardEvent, HotelSetting
from .serializers import (
    FormGuardSummarySerializer,
    HealthSerializer,
    PublicHotelSettingSerializer,
    StaffHotelSettingSerializer,
)


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["system"], responses={200: HealthSerializer, 503: HealthSerializer}
    )
    def get(self, request):
        try:
            connection.ensure_connection()
        except Exception:
            database_ok = False
        else:
            database_ok = True

        return Response(
            {
                "status": "ok" if database_ok else "degraded",
                "service": "west-premier-api",
                "database": database_ok,
                "time": timezone.now().isoformat(),
            },
            status=status.HTTP_200_OK
            if database_ok
            else status.HTTP_503_SERVICE_UNAVAILABLE,
        )


@extend_schema(tags=["hotel"])
class HotelSettingsView(APIView):
    """Public hotel details used to render contact and policy copy."""

    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(responses=PublicHotelSettingSerializer)
    def get(self, request):
        return Response(PublicHotelSettingSerializer(HotelSetting.load()).data)


@extend_schema(tags=["staff"])
class StaffHotelSettingsView(APIView):
    permission_classes = [CanManageSystem]

    @extend_schema(responses=StaffHotelSettingSerializer)
    def get(self, request):
        return Response(StaffHotelSettingSerializer(HotelSetting.load()).data)

    @extend_schema(
        request=StaffHotelSettingSerializer, responses=StaffHotelSettingSerializer
    )
    def patch(self, request):
        instance = HotelSetting.load()
        serializer = StaffHotelSettingSerializer(
            instance, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


@extend_schema(tags=["staff"], responses=FormGuardSummarySerializer)
class StaffFormGuardSummaryView(APIView):
    """Blocked-submission counts so staff can spot guard false positives."""

    permission_classes = [CanManageSystem]

    def get(self, request):
        try:
            window_days = int(request.query_params.get("days", 7))
        except (TypeError, ValueError):
            window_days = 7
        window_days = min(max(window_days, 1), 90)
        since = timezone.now() - timedelta(days=window_days)

        rows = (
            FormGuardEvent.objects.filter(created_at__gte=since)
            .values("form", "reason")
            .annotate(count=Count("id"))
            .order_by("-count", "form", "reason")
        )
        counts = list(rows)
        return Response(
            {
                "window_days": window_days,
                "since": since,
                "total": sum(row["count"] for row in counts),
                "counts": counts,
            }
        )
