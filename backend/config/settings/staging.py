"""Staging settings: Postgres, gunicorn and qcluster behind the proxy.

Staging is production-like in the ways that matter for release testing (real
Postgres, DEBUG off, gunicorn, a supervised qcluster worker and one trusted
reverse proxy) without requiring live payment or SMTP credentials. The strict
production payment guards live in ``config.settings.prod`` and are checked in
that environment only; never put real payment credentials in staging.
"""

import os

# ``base.py`` builds DATABASES at import time, so force Postgres before it runs.
os.environ.setdefault("USE_SQLITE", "false")

from .base import *  # noqa: E402,F401,F403

DEBUG = False
ALLOW_DEMO_USERS = False

SITE_URL = env("SITE_URL", default="http://localhost:8080")  # noqa: F405
API_BASE_URL = env("API_BASE_URL", default="http://localhost:8080")  # noqa: F405

# The compose proxy terminates plain HTTP locally; set these to true when the
# staging host is behind a real TLS-terminating proxy.
SECURE_SSL_REDIRECT = env.bool(  # noqa: F405
    "SECURE_SSL_REDIRECT", default=False
)
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=0)  # noqa: F405
SESSION_COOKIE_SECURE = env.bool(  # noqa: F405
    "SESSION_COOKIE_SECURE", default=False
)
CSRF_COOKIE_SECURE = env.bool("CSRF_COOKIE_SECURE", default=False)  # noqa: F405
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# The staging nginx container appends the client address; Django must trust one
# proxy and no more (see docs/DEPLOYMENT.md "Choosing NUM_PROXIES").
NUM_PROXIES = env.int("NUM_PROXIES", default=1)  # noqa: F405
