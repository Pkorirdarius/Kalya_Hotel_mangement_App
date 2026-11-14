"""Base settings shared by every hotel environment."""

from pathlib import Path

import environ

# backend/config/settings/base.py -> backend/config/settings -> backend -> repo root
BASE_DIR = Path(__file__).resolve().parent.parent.parent
REPO_ROOT = BASE_DIR.parent

env = environ.Env(
    DEBUG=(bool, False),
    USE_SQLITE=(bool, False),
    ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
    SECURE_SSL_REDIRECT=(bool, True),
    SECURE_HSTS_SECONDS=(int, 0),
    SESSION_COOKIE_SECURE=(bool, True),
    CSRF_COOKIE_SECURE=(bool, True),
    CORS_ALLOWED_ORIGINS=(list, []),
    CSRF_TRUSTED_ORIGINS=(list, []),
)

for candidate in (REPO_ROOT / ".env", BASE_DIR / ".env"):
    if candidate.exists():
        environ.Env.read_env(str(candidate))
        break

SECRET_KEY = env("SECRET_KEY", default="insecure-dev-key-not-for-production")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")

SITE_URL = env("SITE_URL", default="http://localhost:5173")
API_BASE_URL = env("API_BASE_URL", default="http://localhost:8000")

# ---------------------------------------------------------------------------
# Hotel business settings - safe defaults, all overridable in admin
# ---------------------------------------------------------------------------
# Brand-neutral environment names (HOTEL_*): the hotel may rename the brand
# later, so no env var or setting may carry a brand-specific prefix. The
# values below are launch placeholders confirmed for this repo; contact and
# location details are flagged "needs hotel confirmation" (see
# docs/LAUNCH-CHECKLIST.md).
HOTEL = {
    "NAME": env("HOTEL_NAME", default="West Premier Hotel"),
    "SHORT_NAME": env("HOTEL_SHORT_NAME", default="West Premier"),
    "LEGAL_NAME": env("HOTEL_LEGAL_NAME", default="West Premier Hotel Ltd"),
    "TOWN": env("HOTEL_TOWN", default="Kapenguria"),
    "COUNTY": env("HOTEL_COUNTY", default="West Pokot"),
    "COUNTRY": env("HOTEL_COUNTRY", default="Kenya"),
    "CURRENCY": "KES",
    "PHONE": env("HOTEL_PHONE", default="+254 20 765 4321"),
    "PHONE_HREF": env("HOTEL_PHONE_HREF", default="tel:+254207654321"),
    "EMAIL": env("HOTEL_EMAIL", default="stay@westpremierhotel.co.ke"),
    "ADDRESS": env("HOTEL_ADDRESS", default="Kapenguria, West Pokot, Kenya"),
    # Values below are launch placeholders and must be confirmed by the hotel.
    "CANCELLATION_CUTOFF_HOURS": env.int(
        "HOTEL_CANCELLATION_CUTOFF_HOURS", default=48
    ),
    "HOLD_TTL_MINUTES": env.int("HOTEL_HOLD_TTL_MINUTES", default=15),
    "FRONTDESK_TARGET_MINUTES": env.int("HOTEL_FRONTDESK_TARGET_MINUTES", default=10),
    "FRONTDESK_ESCALATE_MINUTES": env.int(
        "HOTEL_FRONTDESK_ESCALATE_MINUTES", default=8
    ),
    "CLAIMS_VERIFIED": env.bool("HOTEL_CLAIMS_VERIFIED", default=False),
    "GOOGLE_REVIEWS_ENABLED": env.bool("HOTEL_GOOGLE_REVIEWS_ENABLED", default=False),
}


def _email_on_hotel_domain(local_part: str) -> str:
    domain = HOTEL["EMAIL"].split("@")[-1]
    return f"{local_part}@{domain}"


def _brand_token() -> str:
    """Compact brand token for SMS sender IDs and M-Pesa references."""
    return HOTEL["SHORT_NAME"].replace(" ", "")

# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.humanize",
]

THIRD_PARTY_APPS = [
    "corsheaders",
    "django_filters",
    "django_q",
    "rest_framework",
    "drf_spectacular",
]

LOCAL_APPS = [
    "apps.common",
    "apps.accounts",
    "apps.rooms",
    "apps.rates",
    "apps.bookings",
    "apps.payments",
    "apps.facilities",
    "apps.frontdesk",
    "apps.content",
    "apps.notifications",
    "apps.integrations",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.common.middleware.RequestIDMiddleware",
    "apps.accounts.middleware.CurrentUserMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.template.context_processors.i18n",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ---------------------------------------------------------------------------
# Database - Postgres everywhere real, SQLite for a frictionless local run
# ---------------------------------------------------------------------------
if env.bool("USE_SQLITE", default=False):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
            "ATOMIC_REQUESTS": True,
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": env("POSTGRES_DB", default="hotel"),
            "USER": env("POSTGRES_USER", default="hotel"),
            "PASSWORD": env("POSTGRES_PASSWORD", default="hotel"),
            "HOST": env("POSTGRES_HOST", default="localhost"),
            "PORT": env("POSTGRES_PORT", default="5432"),
            "CONN_MAX_AGE": 60,
            "ATOMIC_REQUESTS": True,
        }
    }

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 10},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LOGIN_URL = "/admin/login/"
LOGIN_REDIRECT_URL = "/"

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_HTTPONLY = False  # the React client reads it for the X-CSRFToken header
SESSION_COOKIE_AGE = 60 * 60 * 12  # a front desk shift

# ---------------------------------------------------------------------------
# i18n - English and Swahili, Kenya time
# ---------------------------------------------------------------------------
LANGUAGE_CODE = "en"
LANGUAGES = [("en", "English"), ("sw", "Kiswahili")]
LOCALE_PATHS = [BASE_DIR / "locale"]
TIME_ZONE = env("TIME_ZONE", default="Africa/Nairobi")
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static and media
# ---------------------------------------------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"] if (BASE_DIR / "static").exists() else []
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

# ---------------------------------------------------------------------------
# DRF
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
    "DEFAULT_PAGINATION_CLASS": "apps.common.pagination.StandardPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "booking": "20/hour",
        "hold": "40/hour",
        "enquiry": "10/hour",
        "newsletter": "10/hour",
        "lookup": "30/hour",
        "payment": "30/hour",
        "login": "10/min",
    },
    "EXCEPTION_HANDLER": "apps.common.exceptions.api_exception_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    # Reports use ?format=csv|json for their own output format; without this,
    # DRF treats the same parameter as a renderer override and returns 404.
    "URL_FORMAT_OVERRIDE": None,
}

SPECTACULAR_SETTINGS = {
    "TITLE": f"{HOTEL['NAME']} API",
    "DESCRIPTION": "Bilingual hotel website, booking and front desk API.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SERVE_PERMISSIONS": ["rest_framework.permissions.AllowAny"],
    "COMPONENT_SPLIT_REQUEST": True,
    "SWAGGER_UI_SETTINGS": {"deepLinking": True, "persistAuthorization": True},
}

# ---------------------------------------------------------------------------
# CORS / CSRF
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS")
CORS_ALLOW_CREDENTIALS = True
CORS_EXPOSE_HEADERS = ["X-Request-ID"]
CSRF_TRUSTED_ORIGINS = env("CSRF_TRUSTED_ORIGINS")

# ---------------------------------------------------------------------------
# Security headers (production values come from env / prod.py)
# ---------------------------------------------------------------------------
SECURE_SSL_REDIRECT = env("SECURE_SSL_REDIRECT")
SECURE_HSTS_SECONDS = env("SECURE_HSTS_SECONDS")
SESSION_COOKIE_SECURE = env("SESSION_COOKIE_SECURE")
CSRF_COOKIE_SECURE = env("CSRF_COOKIE_SECURE")
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
X_FRAME_OPTIONS = "DENY"
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# ---------------------------------------------------------------------------
# Email
# ---------------------------------------------------------------------------
EMAIL_BACKEND = env(
    "EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend"
)
EMAIL_HOST = env("EMAIL_HOST", default="localhost")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_TIMEOUT = env.int("EMAIL_TIMEOUT", default=10)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default=HOTEL["EMAIL"])
FRONT_DESK_EMAIL = env(
    "FRONT_DESK_EMAIL", default=_email_on_hotel_domain("frontdesk")
)
MANAGER_EMAIL = env("MANAGER_EMAIL", default=_email_on_hotel_domain("manager"))

# ---------------------------------------------------------------------------
# Payments and integrations
# ---------------------------------------------------------------------------
PAYMENTS_SANDBOX = env.bool("PAYMENTS_SANDBOX", default=False)
# Separate flag for anything that can mark a payment paid without a gateway.
# Development and test enable it; production forces it off and refuses to start.
PAYMENT_SIMULATION_ALLOWED = env.bool(
    "PAYMENT_SIMULATION_ALLOWED", default=False
)

MPESA_ENV = env("MPESA_ENV", default="sandbox")
MPESA_BASE_URL = env(
    "MPESA_BASE_URL", default="https://sandbox.safaricom.co.ke"
)
MPESA_CONSUMER_KEY = env("MPESA_CONSUMER_KEY", default="")
MPESA_CONSUMER_SECRET = env("MPESA_CONSUMER_SECRET", default="")
MPESA_SHORTCODE = env("MPESA_SHORTCODE", default="")
MPESA_PASSKEY = env("MPESA_PASSKEY", default="")
MPESA_CALLBACK_URL = env(
    "MPESA_CALLBACK_URL",
    default="http://localhost:8000/api/v1/payments/webhooks/mpesa/",
)
MPESA_CALLBACK_SECRET = env("MPESA_CALLBACK_SECRET", default="")
MPESA_TRANSACTION_TYPE = env(
    "MPESA_TRANSACTION_TYPE", default="CustomerPayBillOnline"
)
MPESA_ACCOUNT_REFERENCE = env("MPESA_ACCOUNT_REFERENCE", default=_brand_token())
MPESA_SIMULATE = env.bool("MPESA_SIMULATE", default=False)
MPESA_ALLOWED_IPS = env.list("MPESA_ALLOWED_IPS", default=[])

CARD_GATEWAY = env("CARD_GATEWAY", default="stub")
CARD_BASE_URL = env("CARD_BASE_URL", default="")
CARD_CONSUMER_KEY = env("CARD_CONSUMER_KEY", default="")
CARD_CONSUMER_SECRET = env("CARD_CONSUMER_SECRET", default="")
CARD_CALLBACK_SECRET = env("CARD_CALLBACK_SECRET", default="")

BANK_NAME = env("BANK_NAME", default="Equity Bank Kenya")
BANK_ACCOUNT_NAME = env("BANK_ACCOUNT_NAME", default=HOTEL["LEGAL_NAME"])
BANK_ACCOUNT_NUMBER = env("BANK_ACCOUNT_NUMBER", default="")
BANK_BRANCH = env("BANK_BRANCH", default="")
BANK_SWIFT = env("BANK_SWIFT", default="")

SMS_PROVIDER = env("SMS_PROVIDER", default="stub")
SMS_USERNAME = env("SMS_USERNAME", default="")
SMS_API_KEY = env("SMS_API_KEY", default="")
SMS_SENDER_ID = env("SMS_SENDER_ID", default=_brand_token()[:11])
SMS_SEND_ENABLED = env.bool("SMS_SEND_ENABLED", default=False)

HOTELPLUS_ADAPTER = env("HOTELPLUS_ADAPTER", default="manual_export")

# ---------------------------------------------------------------------------
# django-q2 - database broker, no Redis
# ---------------------------------------------------------------------------
Q_CLUSTER = {
    "name": env("Q_CLUSTER_NAME", default="hotel_jobs"),
    "workers": env.int("Q_CLUSTER_WORKERS", default=2),
    "timeout": env.int("Q_CLUSTER_TIMEOUT", default=120),
    "retry": env.int("Q_CLUSTER_RETRY", default=180),
    "sync": env.bool("Q_CLUSTER_SYNC", default=False),
    "orm": "default",
    "catch_up": False,
    "save_limit": 250,
    "label": "Hotel jobs",
}

# Request ID is returned to clients and attached to log records.
REQUEST_ID_HEADER = "X-Request-ID"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "request_id": {"()": "apps.common.logging.RequestIDFilter"},
    },
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {name} [{request_id}] {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
            "filters": ["request_id"],
        },
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "apps": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "django.request": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
    },
}
