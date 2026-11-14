"""Fail-fast checks for production payment configuration.

Keeping these checks in a small pure module means they can be unit tested
without reloading Django settings, while ``config.settings.prod`` still refuses
to start the application when any of them fails.
"""

from __future__ import annotations

from collections.abc import Iterable

from django.core.exceptions import ImproperlyConfigured


def enforce_production_payment_settings(
    *,
    payments_sandbox: bool,
    payment_simulation_allowed: bool,
    mpesa_simulate: bool,
    card_gateway: str,
    card_callback_secret: str,
    mpesa_callback_secret: str = "",
    mpesa_allowed_ips: Iterable[str] = (),
) -> None:
    """Raise ``ImproperlyConfigured`` when production could simulate payments."""

    if payments_sandbox:
        raise ImproperlyConfigured(
            "PAYMENTS_SANDBOX must be false in production; sandbox completion "
            "would let anyone mark a booking as paid."
        )
    if payment_simulation_allowed:
        raise ImproperlyConfigured(
            "PAYMENT_SIMULATION_ALLOWED must be false in production."
        )
    if mpesa_simulate:
        raise ImproperlyConfigured(
            "MPESA_SIMULATE must be false in production; configure Daraja "
            "credentials instead."
        )

    if card_gateway.strip().lower() != "stub" and not card_callback_secret.strip():
        raise ImproperlyConfigured(
            "CARD_CALLBACK_SECRET is required when CARD_GATEWAY is not 'stub'. "
            "Without it the card callback endpoint cannot authenticate the gateway."
        )

    # Safaricom does not sign callbacks, so production needs at least one way to
    # reject forgeries: the shared secret embedded in the callback URL or the
    # Safaricom IP allow-list (ideally both).
    if not mpesa_callback_secret.strip() and not tuple(mpesa_allowed_ips):
        raise ImproperlyConfigured(
            "Set MPESA_CALLBACK_SECRET and/or MPESA_ALLOWED_IPS in production. "
            "M-Pesa callbacks are unsigned and would otherwise be forgeable."
        )
