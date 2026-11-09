"""Consistent JSON error envelope for every API failure."""

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import AuthenticationFailed, NotAuthenticated, ValidationError
from rest_framework.views import exception_handler

from .context import get_request_id


def _clean_detail(value):
    if isinstance(value, dict):
        return {str(key): _clean_detail(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_clean_detail(item) for item in value]
    return str(value)


def api_exception_handler(exc, context):
    if isinstance(exc, DjangoValidationError):
        detail = getattr(exc, "message_dict", None) or exc.messages
        exc = ValidationError(detail=detail)

    response = exception_handler(exc, context)
    if response is None:
        return None

    if isinstance(exc, (AuthenticationFailed, NotAuthenticated)):
        response.status_code = 401

    if isinstance(exc, ValidationError):
        code = "validation_error"
        message = "Some fields need attention."
        fields = _clean_detail(response.data)
    else:
        code = getattr(exc, "default_code", "error")
        detail = response.data
        if isinstance(detail, dict) and "detail" in detail:
            message = str(detail["detail"])
        else:
            message = str(detail)
        fields = None

    response.data = {
        "error": {
            "code": code,
            "message": message,
            "fields": fields,
            "request_id": get_request_id(),
        }
    }
    request_id = get_request_id()
    if request_id:
        response["X-Request-ID"] = request_id
    return response
