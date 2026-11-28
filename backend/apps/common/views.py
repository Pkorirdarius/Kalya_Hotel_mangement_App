from datetime import timedelta

from django.db import connection
from django.db.models import Count
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import CanManageContent, CanManageSystem
from apps.content.models import BlogPost, Offer, PolicyPage, Review
from apps.facilities.models import MenuItem
from apps.rooms.models import RoomType

from .models import FormGuardEvent, HotelSetting
from .serializers import (
    ContentConfirmationSummarySerializer,
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


@extend_schema(tags=["staff"], responses=ContentConfirmationSummarySerializer)
class StaffContentConfirmationView(APIView):
    """Read-only list of CMS rows still flagged for hotel confirmation."""

    permission_classes = [CanManageContent]

    # (kind, model label, queryset, label field). Each model already carries a
    # `needs_confirmation` flag; this view never mutates it.
    SOURCES = (
        ("blog-post", "content.BlogPost", BlogPost, "title_en"),
        ("offer", "content.Offer", Offer, "title_en"),
        ("policy-page", "content.PolicyPage", PolicyPage, "title_en"),
        ("review", "content.Review", Review, "author"),
        ("room-type", "rooms.RoomType", RoomType, "name_en"),
        ("menu-item", "facilities.MenuItem", MenuItem, "name_en"),
    )

    def get(self, request):
        try:
            limit = int(request.query_params.get("limit", 200))
        except (TypeError, ValueError):
            limit = 200
        limit = min(max(limit, 1), 500)

        counts: dict[str, int] = {}
        items: list[dict] = []
        for kind, model_label, model, label_field in self.SOURCES:
            queryset = model.objects.filter(needs_confirmation=True).only(
                "id", label_field, "active", "updated_at"
            )
            counts[kind] = queryset.count()
            for row in queryset:
                items.append(
                    {
                        "kind": kind,
                        "model": model_label,
                        "id": str(row.pk),
                        "label": getattr(row, label_field),
                        "active": row.active,
                        "needs_confirmation": True,
                        "updated_at": row.updated_at,
                    }
                )

        items.sort(key=lambda item: item["updated_at"], reverse=True)
        return Response(
            {
                "total": sum(counts.values()),
                "counts": counts,
                "items": items[:limit],
            }
        )
