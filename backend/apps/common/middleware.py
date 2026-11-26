"""Request ID propagation for logs, errors and responses."""

import re
import uuid

from django.conf import settings

from .context import reset_request_id, set_request_id

_REQUEST_ID_RE = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


class RequestIDMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        incoming = request.META.get("HTTP_X_REQUEST_ID", "").strip()
        request_id = incoming if _REQUEST_ID_RE.fullmatch(incoming) else uuid.uuid4().hex
        request.request_id = request_id
        token = set_request_id(request_id)
        try:
            response = self.get_response(request)
        finally:
            reset_request_id(token)
        response[getattr(settings, "REQUEST_ID_HEADER", "X-Request-ID")] = request_id
        return response


class CSPReportOnlyMiddleware:
    """Add the audit-only CSP header to API and admin responses.

    The policy is deliberately report-only: monitoring comes first, enforcement
    is a later change once real traffic and Django admin usage have been reviewed.
    """

    HEADER = "Content-Security-Policy-Report-Only"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        policy = getattr(settings, "CSP_REPORT_ONLY_POLICY", "")
        if policy and not response.has_header(self.HEADER):
            response[self.HEADER] = policy
        return response
