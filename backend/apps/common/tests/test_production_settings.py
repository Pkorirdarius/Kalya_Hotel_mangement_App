from __future__ import annotations

import pytest
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

from apps.common.production import enforce_production_hotel_settings

KEYS = ("PHONE", "PHONE_HREF", "EMAIL", "ADDRESS", "MAP_QUERY")


def _placeholders() -> dict[str, str]:
    return {key: settings.HOTEL_PLACEHOLDERS[key] for key in KEYS}


def test_confirmed_production_hotel_values_pass():
    values = {key: f"confirmed-{key.lower()}" for key in KEYS}

    enforce_production_hotel_settings(
        values=values, placeholders=_placeholders()
    )


def test_unconfirmed_placeholders_refuse_to_start():
    with pytest.raises(ImproperlyConfigured) as excinfo:
        enforce_production_hotel_settings(
            values=_placeholders(), placeholders=_placeholders()
        )

    message = str(excinfo.value)
    for key in KEYS:
        assert f"HOTEL_{key}" in message


def test_empty_contact_value_refuses_to_start():
    values = _placeholders()
    values["PHONE"] = "   "

    with pytest.raises(ImproperlyConfigured) as excinfo:
        enforce_production_hotel_settings(
            values=values, placeholders=_placeholders()
        )

    assert "HOTEL_PHONE" in str(excinfo.value)
