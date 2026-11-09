"""Expose the authenticated user to non-view code such as audit helpers."""

from apps.common.context import reset_current_user, set_current_user


class CurrentUserMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        token = set_current_user(getattr(request, "user", None))
        try:
            response = self.get_response(request)
        finally:
            reset_current_user(token)
        return response
