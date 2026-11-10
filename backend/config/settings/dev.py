"""Local development settings."""

import os

os.environ.setdefault("USE_SQLITE", "true")

from .base import *  # noqa: F401,F403,E402

DEBUG = True
ALLOWED_HOSTS = env.list(  # noqa: F405
    "ALLOWED_HOSTS", default=["localhost", "127.0.0.1", "testserver"]
)

SECURE_SSL_REDIRECT = False
SECURE_HSTS_SECONDS = 0
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

CORS_ALLOWED_ORIGINS = env.list(  # noqa: F405
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:5173", "http://127.0.0.1:5173"],
)
CSRF_TRUSTED_ORIGINS = env.list(  # noqa: F405
    "CSRF_TRUSTED_ORIGINS",
    default=["http://localhost:5173", "http://127.0.0.1:5173"],
)

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
Q_CLUSTER["sync"] = env.bool("Q_CLUSTER_SYNC", default=True)  # noqa: F405

# Local development can complete M-Pesa/card payments without Safaricom keys
# via the sandbox completion endpoint. Production must set these false.
PAYMENTS_SANDBOX = env.bool("PAYMENTS_SANDBOX", default=True)  # noqa: F405
MPESA_SIMULATE = env.bool("MPESA_SIMULATE", default=True)  # noqa: F405

SPECTACULAR_SETTINGS["SERVE_PERMISSIONS"] = [  # noqa: F405
    "rest_framework.permissions.AllowAny"
]
