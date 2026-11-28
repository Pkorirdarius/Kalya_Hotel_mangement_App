import pytest
from django.conf import settings
from django.http import HttpResponse
from django.test import RequestFactory
from rest_framework.test import APIClient

from apps.common.middleware import CSPReportOnlyMiddleware

pytestmark = pytest.mark.django_db


def test_api_responses_carry_report_only_csp():
    response = APIClient().get("/api/v1/health/")

    header = response["Content-Security-Policy-Report-Only"]
    assert header == settings.CSP_REPORT_ONLY_POLICY
    assert "default-src 'self'" in header
    assert "frame-ancestors 'none'" in header
    assert "Content-Security-Policy" not in response
    assert "Content-Security-Policy-Report-Only" in response


def test_admin_paths_also_carry_report_only_csp():
    middleware = CSPReportOnlyMiddleware(lambda _request: HttpResponse("ok"))

    response = middleware(RequestFactory().get("/admin/login/"))

    assert response["Content-Security-Policy-Report-Only"] == (
        settings.CSP_REPORT_ONLY_POLICY
    )
