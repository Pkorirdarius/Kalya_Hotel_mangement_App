from __future__ import annotations

import csv
from datetime import date, timedelta
from io import StringIO

from django.http import HttpResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status, serializers
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import CanExportGuestData
from apps.common.utils import hotel_today
from apps.frontdesk.reports import occupancy_report, overview, payment_report
from apps.integrations.hotelplus import get_adapter
from apps.payments.models import Payment


class PendingSerializer(serializers.Serializer):
    room_bookings = serializers.IntegerField()
    table_bookings = serializers.IntegerField()
    conference_enquiries = serializers.IntegerField()
    gym_day_passes = serializers.IntegerField()


class OverviewSerializer(serializers.Serializer):
    date = serializers.DateField()
    arrivals = serializers.IntegerField()
    departures = serializers.IntegerField()
    in_house_bookings = serializers.IntegerField()
    in_house_guests = serializers.IntegerField()
    total_rooms = serializers.IntegerField()
    occupancy_percent = serializers.FloatField()
    revenue_today = serializers.IntegerField()
    pending = PendingSerializer()


class OccupancyRowSerializer(serializers.Serializer):
    date = serializers.DateField()
    in_house_bookings = serializers.IntegerField()
    in_house_guests = serializers.IntegerField()
    occupancy_percent = serializers.FloatField()
    revenue_today = serializers.IntegerField()


class OccupancyResponseSerializer(serializers.Serializer):
    results = OccupancyRowSerializer(many=True)


class PaymentReportRowSerializer(serializers.Serializer):
    reference = serializers.CharField()
    booking_reference = serializers.CharField(allow_blank=True)
    gym_pass_reference = serializers.CharField(allow_blank=True)
    purpose = serializers.CharField()
    purpose_display = serializers.CharField()
    provider = serializers.CharField()
    provider_display = serializers.CharField()
    status = serializers.CharField()
    status_display = serializers.CharField()
    amount = serializers.IntegerField()
    currency = serializers.CharField()
    phone = serializers.CharField(allow_blank=True)
    provider_reference = serializers.CharField(allow_blank=True)
    requires_review = serializers.BooleanField()
    created_at = serializers.DateTimeField()
    paid_at = serializers.DateTimeField(allow_null=True)


class PaymentReportResponseSerializer(serializers.Serializer):
    results = PaymentReportRowSerializer(many=True)
    count = serializers.IntegerField()
    total_amount = serializers.IntegerField()


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

    @extend_schema(
        parameters=[OpenApiParameter("date", str, required=False)],
        responses=OverviewSerializer,
    )
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
        ],
        responses=OccupancyResponseSerializer,
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
class PaymentReportView(APIView):
    permission_classes = [CanExportGuestData]

    @extend_schema(
        parameters=[
            OpenApiParameter("start", str, required=False),
            OpenApiParameter("end", str, required=False),
            OpenApiParameter("provider", str, required=False),
            OpenApiParameter("status", str, required=False),
            OpenApiParameter("format", str, required=False),
        ],
        responses={
            200: PaymentReportResponseSerializer,
            (200, "text/csv"): OpenApiTypes.BINARY,
        },
    )
    def get(self, request):
        end = _parse_day(request.query_params.get("end"))
        start = _parse_day(
            request.query_params.get("start"), default=end - timedelta(days=29)
        )
        if end < start:
            raise ValidationError({"end": "End date must not be before start."})
        if (end - start).days > 366:
            raise ValidationError({"end": "Choose a range of at most one year."})

        provider = (request.query_params.get("provider") or "").strip()
        if provider and provider not in Payment.Provider.values:
            raise ValidationError({"provider": "Choose a supported payment method."})
        payment_status = (request.query_params.get("status") or "").strip()
        if payment_status and payment_status not in Payment.Status.values:
            raise ValidationError({"status": "Choose a supported payment status."})

        fmt = (request.query_params.get("format") or "csv").lower()
        if fmt not in ("csv", "json"):
            raise ValidationError({"format": "Choose csv or json."})

        rows = payment_report(
            start,
            end,
            provider=provider,
            status=payment_status,
        )
        total_amount = sum(
            row["amount"]
            for row in rows
            if row["status"] == Payment.Status.SUCCEEDED
        )

        if fmt == "json":
            return Response(
                {
                    "results": rows,
                    "count": len(rows),
                    "total_amount": total_amount,
                }
            )

        buffer = StringIO()
        writer = csv.writer(buffer)
        writer.writerow(
            [
                "Reference",
                "Booking",
                "Gym pass",
                "Purpose",
                "Provider",
                "Status",
                "Amount (KES)",
                "Currency",
                "Phone",
                "Provider reference",
                "Needs review",
                "Created at",
                "Paid at",
            ]
        )
        for row in rows:
            writer.writerow(
                [
                    _csv_safe(row["reference"]),
                    _csv_safe(row["booking_reference"]),
                    _csv_safe(row["gym_pass_reference"]),
                    _csv_safe(row["purpose_display"]),
                    _csv_safe(row["provider_display"]),
                    _csv_safe(row["status_display"]),
                    row["amount"],
                    _csv_safe(row["currency"]),
                    _csv_safe(row["phone"]),
                    _csv_safe(row["provider_reference"]),
                    "yes" if row["requires_review"] else "no",
                    _csv_safe(row["created_at"]),
                    _csv_safe(row["paid_at"]),
                ]
            )
        writer.writerow([])
        writer.writerow(
            [
                "TOTAL (succeeded)",
                "",
                "",
                "",
                "",
                "",
                total_amount,
                "KES",
                "",
                "",
                "",
                "",
                "",
            ]
        )
        response = HttpResponse(
            "\ufeff" + buffer.getvalue(),
            content_type="text/csv; charset=utf-8",
        )
        response["Content-Disposition"] = (
            f'attachment; filename="payments-{start.isoformat()}-to-{end.isoformat()}.csv"'
        )
        return response


def _csv_safe(value) -> str:
    """Keep spreadsheet apps from evaluating exported cells as formulas."""

    text = "" if value is None else str(value)
    if text.startswith(("=", "+", "-", "@", "\t", "\r")):
        return "'" + text
    return text


@extend_schema(tags=["staff reports"])
class HotelPlusExportView(APIView):
    permission_classes = [CanExportGuestData]

    @extend_schema(
        parameters=[
            OpenApiParameter("date", str, required=False),
            OpenApiParameter("format", str, required=False),
        ],
        responses={(200, "text/csv"): OpenApiTypes.BINARY, (200, "application/pdf"): OpenApiTypes.BINARY},
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
