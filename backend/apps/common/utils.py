"""Small shared helpers used across apps."""

from __future__ import annotations

import secrets
import string
from datetime import date, datetime
from decimal import ROUND_HALF_UP, Decimal
from zoneinfo import ZoneInfo

from django.conf import settings
from django.utils import timezone

REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def hotel_display_name() -> str:
    """Public hotel name, preferring the editable admin record.

    Imported lazily so this helper stays safe to use during app loading.
    """

    from apps.common.models import HotelSetting

    return HotelSetting.load().name or settings.HOTEL["NAME"]


def hotel_brand_token() -> str:
    """Compact uppercase brand token for QR payloads and references."""

    return settings.HOTEL["SHORT_NAME"].replace(" ", "").upper()


def hotel_tz() -> ZoneInfo:
    return ZoneInfo(settings.TIME_ZONE)


def hotel_now() -> datetime:
    return timezone.now().astimezone(hotel_tz())


def hotel_today() -> date:
    return hotel_now().date()


def as_kes_int(value: Decimal | int | float | str) -> int:
    """Round a money value to whole Kenyan shillings.

    KES has no circulating subunit in normal hotel pricing. The API therefore
    exposes integer shillings; the database keeps Decimal for exact arithmetic.
    """

    return int(Decimal(value).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def make_reference(prefix: str, length: int = 6) -> str:
    token = "".join(secrets.choice(REFERENCE_ALPHABET) for _ in range(length))
    return f"{prefix}-{token}"


def unique_reference(model, prefix: str, field: str = "reference", length: int = 6) -> str:
    for _ in range(20):
        candidate = make_reference(prefix, length)
        if not model.objects.filter(**{field: candidate}).exists():
            return candidate
    # Extremely unlikely; widen the token rather than fail the request.
    return make_reference(prefix, length + 4)


def normalise_kenyan_phone(value: str) -> str:
    """Return 2547XXXXXXXX / 2541XXXXXXXX or raise ValueError."""

    digits = "".join(character for character in value if character.isdigit())
    if digits.startswith("0"):
        digits = "254" + digits[1:]
    elif digits.startswith("7") or digits.startswith("1"):
        digits = "254" + digits
    if len(digits) == 12 and digits.startswith(("2547", "2541")):
        return digits
    raise ValueError("Enter a Kenyan mobile number, for example 0712 345 678.")
