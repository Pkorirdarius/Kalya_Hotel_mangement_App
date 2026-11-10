from __future__ import annotations

from django.conf import settings

from .base import BaseProvider, ProviderResult


class StubCardProvider(BaseProvider):
    """Gateway-agnostic card adapter placeholder.

    The production adapter (Pesapal/Flutterwave/DPO) must implement the same
    contract. The stub never asks for or stores card details; it returns a
    sandbox marker so the development UI can complete the payment explicitly.
    """

    code = "card"
    label = "Card"

    def initiate(self, *, payment, phone: str = "") -> ProviderResult:
        if settings.CARD_GATEWAY != "stub" and not settings.CARD_CONSUMER_KEY:
            return ProviderResult(
                ok=False,
                status="failed",
                failure_code="not_configured",
                failure_message="Card payments are not configured yet.",
            )
        return ProviderResult(
            ok=True,
            status="pending",
            provider_reference=f"CARD-{payment.reference}",
            message=(
                "Card gateway sandbox. In production this returns the hosted "
                "payment page URL."
            ),
            sandbox=True,
        )


class BankTransferProvider(BaseProvider):
    code = "bank_transfer"
    label = "Bank transfer"

    def initiate(self, *, payment, phone: str = "") -> ProviderResult:
        return ProviderResult(
            ok=True,
            status="pending",
            provider_reference=f"BANK-{payment.reference}",
            message="Use the bank details below and send proof of payment.",
        )

    def instructions(self) -> dict:
        return {
            "bank_name": settings.BANK_NAME,
            "account_name": settings.BANK_ACCOUNT_NAME,
            "account_number": settings.BANK_ACCOUNT_NUMBER,
            "branch": settings.BANK_BRANCH,
            "swift": settings.BANK_SWIFT,
        }
