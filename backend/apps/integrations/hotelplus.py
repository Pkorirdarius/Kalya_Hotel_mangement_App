from __future__ import annotations

import csv
import io
from datetime import date

from django.conf import settings
from django.utils import timezone

from apps.bookings.models import Booking, BookingStatus


class HotelPlusAdapter:
    """Vendor boundary.

    HotelPlus does not allow third-party API access. The default adapter writes
    a daily file for staff to key in manually. The API stub exists only to make
    a future replacement easy and must not be enabled in production.
    """

    def export(self, day: date, fmt: str = "csv") -> tuple[bytes, str, str]:
        raise NotImplementedError


def _rows(day: date):
    bookings = (
        Booking.objects.filter(status=BookingStatus.CONFIRMED, checkin=day)
        .select_related("room_type", "meal_plan")
        .order_by("checkin", "reference")
    )
    for booking in bookings:
        payment = booking.payments.filter(status="succeeded").order_by("-paid_at").first()
        yield [
            booking.reference,
            booking.guest_name,
            booking.phone,
            booking.email,
            booking.room_type.name_en,
            booking.checkin.isoformat(),
            booking.checkout.isoformat(),
            str(booking.nights),
            str(booking.guests),
            booking.meal_plan.name_en,
            str(int(booking.total)),
            payment.get_provider_display() if payment else "unpaid",
            booking.get_source_display(),
        ]


HEADERS = [
    "Reference",
    "Guest",
    "Phone",
    "Email",
    "Room type",
    "Check-in",
    "Check-out",
    "Nights",
    "Guests",
    "Meal plan",
    "Total KES",
    "Payment",
    "Source",
]


class ManualExportAdapter(HotelPlusAdapter):
    def export(self, day: date, fmt: str = "csv") -> tuple[bytes, str, str]:
        if fmt == "pdf":
            return self._pdf(day), "application/pdf", f"hotelplus-{day}.pdf"
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(HEADERS)
        writer.writerows(_rows(day))
        return buffer.getvalue().encode("utf-8-sig"), "text/csv", f"hotelplus-{day}.csv"

    def _pdf(self, day: date) -> bytes:
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4, landscape
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
        except ImportError as exc:
            raise RuntimeError(
                "PDF export requires the reportlab package. Use CSV or install it."
            ) from exc

        buffer = io.BytesIO()
        document = SimpleDocTemplate(buffer, pagesize=landscape(A4))
        styles = getSampleStyleSheet()
        elements = [
            styles["Title"],
        ]
        from reportlab.platypus import Paragraph

        elements = [
            Paragraph(f"West Premier Hotel · HotelPlus export · {day}", styles["Title"]),
            Paragraph(
                f"Generated {timezone.localtime():%d %b %Y %H:%M} · confirmed arrivals",
                styles["Normal"],
            ),
        ]
        data = [HEADERS] + [list(row) for row in _rows(day)]
        table = Table(data, repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B3B2E")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTSIZE", (0, 0), (-1, -1), 7),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E3DCCD")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ]
            )
        )
        elements.append(table)
        document.build(elements)
        return buffer.getvalue()


class ApiStubAdapter(HotelPlusAdapter):
    def export(self, day: date, fmt: str = "csv") -> tuple[bytes, str, str]:
        raise RuntimeError("The HotelPlus API integration is not available.")


def get_adapter() -> HotelPlusAdapter:
    if settings.HOTELPLUS_ADAPTER == "api_stub":
        return ApiStubAdapter()
    return ManualExportAdapter()
