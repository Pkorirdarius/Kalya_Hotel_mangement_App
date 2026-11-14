"""Production settings. All secrets and hosts must be supplied by the environment."""

from django.core.exceptions import ImproperlyConfigured

from apps.payments.production import enforce_production_payment_settings

from .base import *  # noqa: F401,F403

DEBUG = False

SECRET_KEY = env("SECRET_KEY")  # noqa: F405
if SECRET_KEY == "insecure-dev-key-not-for-production":
    raise ImproperlyConfigured("Set a real SECRET_KEY in production.")

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS")  # noqa: F405
if not ALLOWED_HOSTS:
    raise ImproperlyConfigured("Set ALLOWED_HOSTS in production.")

# Refuse to start if anything could complete a payment without a gateway, or if
# callbacks cannot be authenticated. See docs/DEPLOYMENT.md.
enforce_production_payment_settings(
    payments_sandbox=PAYMENTS_SANDBOX,  # noqa: F405
    payment_simulation_allowed=PAYMENT_SIMULATION_ALLOWED,  # noqa: F405
    mpesa_simulate=MPESA_SIMULATE,  # noqa: F405
    card_gateway=CARD_GATEWAY,  # noqa: F405
    card_callback_secret=CARD_CALLBACK_SECRET,  # noqa: F405
    mpesa_callback_secret=MPESA_CALLBACK_SECRET,  # noqa: F405
    mpesa_allowed_ips=MPESA_ALLOWED_IPS,  # noqa: F405
)
PAYMENTS_SANDBOX = False
PAYMENT_SIMULATION_ALLOWED = False
MPESA_SIMULATE = False

SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)  # noqa: F405
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=31536000)  # noqa: F405
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

if EMAIL_BACKEND == "django.core.mail.backends.console.EmailBackend":  # noqa: F405
    raise ImproperlyConfigured("Configure a real EMAIL_BACKEND in production.")

if "rest_framework.renderers.BrowsableAPIRenderer" in REST_FRAMEWORK[  # noqa: F405
    "DEFAULT_RENDERER_CLASSES"
]:
    REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = [  # noqa: F405
        renderer
        for renderer in REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"]  # noqa: F405
        if renderer != "rest_framework.renderers.BrowsableAPIRenderer"
    ]
