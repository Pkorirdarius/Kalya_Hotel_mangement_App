"""Production settings. All secrets and hosts must be supplied by the environment."""

from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F401,F403

DEBUG = False

SECRET_KEY = env("SECRET_KEY")  # noqa: F405
if SECRET_KEY == "insecure-dev-key-not-for-production":
    raise ImproperlyConfigured("Set a real SECRET_KEY in production.")

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS")  # noqa: F405
if not ALLOWED_HOSTS:
    raise ImproperlyConfigured("Set ALLOWED_HOSTS in production.")

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
