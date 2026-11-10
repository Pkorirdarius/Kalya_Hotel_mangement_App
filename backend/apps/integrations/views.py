from __future__ import annotations

from datetime import date

from django.http import HttpResponse
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import CanExportGuestData
from apps.common.utils import hotel_today
from apps.frontdesk.reports import occupancy_report, overview
from apps.integrations.hotelplus import get_adapter


def _parse_day(raw: str | None, default=None) -> date:
    if not raw:
        return default or hotel_today()
    try:
        return date.fromisoformat(raw)
    except ValueError as exc:
        raise ValidationError({"date": "Use an ISO date (YYYY-MM-DD)."}) from exc


@extend_schema(tags=["staff reports"])
class OverviewView(APIView):
    permission_classes = [CanExportGuestData]

    @extend_schema(parameters=[OpenApiParameter("date", str, required=False)])
    def get(self, request):
        day = _parse_day(request.query_params.get("date"))
        return Response(overview(day))


@extend_schema(tags=["staff reports"])
class OccupancyReportView(APIView):
    permission_classes = [CanExportGuestData]

    @extend_schema(
        parameters=[
            OpenApiParameter("start", str, required=False),
            OpenApiParameter("end", str, required=False),
        ]
    )
    def get(self, request):
        end = _parse_day(request.query_params.get("end"))
        start = _parse_day(request.query_params.get("start"), default=end)
        if end < start:
            raise ValidationError({"end": "End date must not be before start."})
        if (end - start).days > 366:
            raise ValidationError({"end": "Choose a range of at most one year."})
        return Response({"results": occupancy_report(start, end)})


@extend_schema(tags=["staff reports"])
class HotelPlusExportView(APIView):
    permission_classes = [CanExportGuestData]

    @extend_schema(
        parameters=[
            OpenApiParameter("date", str, required=False),
            OpenApiParameter("format", str, required=False),
        ]
    )
    def get(self, request):
        day = _parse_day(request.query_params.get("date"))
        fmt = (request.query_params.get("format") or "csv").lower()
        if fmt not in ("csv", "pdf"):
            raise ValidationError({"format": "Choose csv or pdf."})
        try:
            payload, content_type, filename = get_adapter().export(day, fmt=fmt)
        except RuntimeError as exc:
            return Response(
                {"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        response = HttpResponse(payload, content_type=content_type)
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response
