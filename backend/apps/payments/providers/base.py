"""Payment provider contract.

Every provider returns provider-neutral data; the domain service is responsible
for persisting Payment rows and moving booking/gym state. Providers never store
card data and never log full request/response payloads containing personal data.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ProviderResult:
    ok: bool
    status: str = "pending"
    provider_reference: str = ""
    checkout_request_id: str = ""
    merchant_request_id: str = ""
    redirect_url: str = ""
    failure_code: str = ""
    failure_message: str = ""
    message: str = ""
    raw_request: dict = field(default_factory=dict)
    raw_response: dict = field(default_factory=dict)
    sandbox: bool = False


class PaymentProviderError(RuntimeError):
    pass


class BaseProvider:
    code = ""
    label = ""

    def initiate(self, *, payment, phone: str = "") -> ProviderResult:
        raise NotImplementedError

    def instructions(self) -> dict:
        return {}
