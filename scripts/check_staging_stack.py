#!/usr/bin/env python
"""Static validation of the staging stack manifest.

This checks that every file needed by ``docker compose -f
docker-compose.staging.yml up`` exists and contains the required topology. It
runs in CI on runners where Docker Desktop is unavailable locally, so the
Compose file is also validated there with ``docker compose config``.

The script uses only the Python standard library.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REQUIREMENTS: list[tuple[str, tuple[str, ...]]] = [
    (
        "docker-compose.staging.yml",
        (
            "db:",
            "web:",
            "worker:",
            "proxy:",
            "postgres:16-alpine",
            "config.settings.staging",
            "python manage.py migrate --noinput",
            "python manage.py collectstatic --noinput",
            "python manage.py setup_schedules",
            "python manage.py qcluster",
            "gunicorn config.wsgi:application",
            '"8080:80"',
            "frontend/dist:/usr/share/nginx/html:ro",
        ),
    ),
    (
        "ops/backend.Dockerfile",
        (
            "FROM python:3.13-slim",
            "COPY backend/requirements.txt",
            "pip install --no-cache-dir -r /app/requirements.txt",
            "COPY backend/ /app/",
            'CMD ["gunicorn", "config.wsgi:application"',
        ),
    ),
    (
        "ops/nginx-staging.conf",
        (
            "upstream django",
            "server web:8000;",
            "location /api/",
            "location /admin/",
            "location /static/",
            "location /media/",
            "try_files $uri $uri/index.html /index.html;",
            "Content-Security-Policy-Report-Only",
            "X-Forwarded-For $proxy_add_x_forwarded_for",
        ),
    ),
    (
        "backend/config/settings/staging.py",
        (
            'os.environ.setdefault("USE_SQLITE", "false")',
            "from .base import *",
            "DEBUG = False",
            "SECURE_PROXY_SSL_HEADER",
            "NUM_PROXIES =",
        ),
    ),
    (
        ".env.staging.example",
        (
            "DJANGO_SETTINGS_MODULE=config.settings.staging",
            "USE_SQLITE=false",
            "NUM_PROXIES=1",
            "POSTGRES_HOST=db",
            "PAYMENTS_SANDBOX=true",
            "HOTEL_CLAIMS_VERIFIED=false",
        ),
    ),
    (
        "backend/requirements.txt",
        ("gunicorn==",),
    ),
    (
        "scripts/staging_smoke.py",
        (
            "--site-base",
            "def frontend_check",
            "CSP_REPORT_ONLY",
            "rel=\"canonical\"",
        ),
    ),
]


def main() -> int:
    failures: list[str] = []
    for relative_path, needles in REQUIREMENTS:
        path = ROOT / relative_path
        if not path.is_file():
            failures.append(f"{relative_path}: missing file")
            continue
        text = path.read_text(encoding="utf-8")
        for needle in needles:
            if needle not in text:
                failures.append(f"{relative_path}: missing {needle!r}")
        if not failures or all(
            not failure.startswith(relative_path + ":") for failure in failures
        ):
            print(f"[ok]   {relative_path}")

    if failures:
        for failure in failures:
            print(f"[FAIL] {failure}", file=sys.stderr)
        return 1

    print("\nStaging stack manifest checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
