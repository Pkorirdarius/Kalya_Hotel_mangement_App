from __future__ import annotations

import pytest
from django.core.exceptions import ImproperlyConfigured

from apps.payments.production import enforce_production_payment_settings


def _valid(**overrides):
    values = {
        "payments_sandbox": False,
        "payment_simulation_allowed": False,
        "mpesa_simulate": False,
        "card_gateway": "stub",
        "card_callback_secret": "",
        "mpesa_callback_secret": "callback-secret",
        "mpesa_allowed_ips": (),
    }
    values.update(overrides)
    return values


def test_valid_production_payment_settings_pass():
    enforce_production_payment_settings(**_valid())
    enforce_production_payment_settings(
        **_valid(card_gateway="pesapal", card_callback_secret="card-secret")
    )
    enforce_production_payment_settings(
        **_valid(mpesa_callback_secret="", mpesa_allowed_ips=("196.201.214.200",))
    )


@pytest.mark.parametrize(
    "overrides",
    [
        {"payments_sandbox": True},
        {"payment_simulation_allowed": True},
        {"mpesa_simulate": True},
        {"card_gateway": "pesapal", "card_callback_secret": ""},
        {"card_gateway": "PESAPAL", "card_callback_secret": "   "},
    ],
)
def test_unsafe_production_payment_settings_refuse_to_start(overrides):
    with pytest.raises(ImproperlyConfigured):
        enforce_production_payment_settings(**_valid(**overrides))


def test_mpesa_callbacks_need_a_secret_or_an_ip_allowlist():
    with pytest.raises(ImproperlyConfigured) as excinfo:
        enforce_production_payment_settings(
            **_valid(mpesa_callback_secret="", mpesa_allowed_ips=())
        )
    assert "MPESA_CALLBACK_SECRET" in str(excinfo.value)
