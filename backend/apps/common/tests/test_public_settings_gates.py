"""Public settings must not publish unconfirmed prices or legacy plans."""

from __future__ import annotations

import pytest
from rest_framework.test import APIClient

from apps.common.models import HotelSetting

pytestmark = pytest.mark.django_db

SETTINGS_URL = "/api/v1/common/hotel/"


def test_unconfirmed_conference_prices_are_omitted():
    settings_obj = HotelSetting.load()
    settings_obj.conference_prices_confirmed = False
    settings_obj.save()

    response = APIClient().get(SETTINGS_URL)

    assert response.status_code == 200
    assert response.data["conference_prices_confirmed"] is False
    assert "conference_half_day_price" not in response.data
    assert "conference_full_day_price" not in response.data


def test_confirmed_conference_prices_are_published():
    settings_obj = HotelSetting.load()
    settings_obj.conference_prices_confirmed = True
    settings_obj.save()

    response = APIClient().get(SETTINGS_URL)

    assert response.status_code == 200
    assert response.data["conference_prices_confirmed"] is True
    assert response.data["conference_half_day_price"] is not None
    assert response.data["conference_full_day_price"] is not None


def test_legacy_dinner_plan_gate_is_public():
    settings_obj = HotelSetting.load()
    assert settings_obj.dinner_plan_enabled is False

    response = APIClient().get(SETTINGS_URL)

    assert response.status_code == 200
    assert response.data["dinner_plan_enabled"] is False
