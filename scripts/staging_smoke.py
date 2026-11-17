#!/usr/bin/env python
"""Staging smoke checks for the deployed API.

Run this against the *staging* API after a deploy, never against production:
the throttle-identity check deliberately exhausts a login-throttle bucket for
fake client IPs so it can prove the bucket follows the real client address.

The script only needs the Python standard library, so it runs without the
project virtualenv:

    python scripts/staging_smoke.py --api-base https://api.staging.example.com

Checks:

1. ``GET /api/v1/health/`` answers 200 with a reachable database.
2. The login throttle keys on the real client IP taken from
   ``X-Forwarded-For``. That is what ``NUM_PROXIES`` controls:

   * the same client gets 429 once its bucket is spent;
   * a different client still gets 401;
   * an extra, left-hand ``X-Forwarded-For`` entry must not move the bucket
     (that would mean ``NUM_PROXIES`` is too high and the value is spoofable).

Prerequisites and caveats are documented in ``docs/DEPLOYMENT.md``; in short,
the identity check assumes the recommended single reverse proxy that *appends*
the client address to ``X-Forwarded-For`` (nginx's
``$proxy_add_x_forwarded_for``) and a throttle cache shared by all web workers.
"""

from __future__ import annotations

import argparse
import http.cookiejar
import json
import sys
import urllib.error
import urllib.request

TEST_CLIENT_A = "198.51.100.10"
TEST_CLIENT_B = "198.51.100.11"
SPOOFED_LEFT = "203.0.113.99"

LOGIN_PATH = "/api/v1/staff/auth/login/"
CSRF_PATH = "/api/v1/auth/csrf/"
HEALTH_PATH = "/api/v1/health/"

BAD_CREDENTIALS = {
    "username": "staging-smoke-nonexistent",
    "password": "not-a-real-password",
}


class Client:
    def __init__(self, base: str, timeout: float) -> None:
        self.base = base.rstrip("/")
        self.timeout = timeout
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.jar)
        )

    def request(
        self,
        path: str,
        *,
        method: str = "GET",
        payload: dict | None = None,
        headers: dict | None = None,
    ) -> tuple[int, bytes]:
        data = None
        merged = {"Accept": "application/json"}
        if payload is not None:
            data = json.dumps(payload).encode("utf-8")
            merged["Content-Type"] = "application/json"
        if headers:
            merged.update(headers)

        request = urllib.request.Request(
            self.base + path, data=data, headers=merged, method=method
        )
        try:
            with self.opener.open(request, timeout=self.timeout) as response:
                return response.status, response.read()
        except urllib.error.HTTPError as exc:
            return exc.code, exc.read()

    def forwarded_for(self, client_ip: str, spoofed_left: str | None = None) -> dict:
        value = f"{spoofed_left}, {client_ip}" if spoofed_left else client_ip
        return {"X-Forwarded-For": value}


def _ok(message: str) -> None:
    print(f"[ok]   {message}")


def _fail(message: str) -> None:
    print(f"[FAIL] {message}")


def health_check(client: Client) -> bool:
    status, body = client.request(HEALTH_PATH)
    if status != 200:
        _fail(f"health check returned HTTP {status}; expected 200")
        return False
    try:
        payload = json.loads(body)
    except ValueError:
        _fail("health check did not return JSON")
        return False
    if not payload.get("database"):
        _fail("health check says the database is unreachable")
        return False
    _ok(f"health check: {payload.get('status')} (database reachable)")
    return True


def csrf_token(client: Client) -> str | None:
    status, body = client.request(CSRF_PATH)
    if status != 200:
        _fail(f"could not fetch a CSRF token (HTTP {status})")
        return None
    try:
        return json.loads(body)["csrfToken"]
    except (ValueError, KeyError):
        _fail("CSRF endpoint did not return a token")
        return None


def login_probe(client: Client, token: str, client_ip: str, spoofed_left=None) -> int:
    status, _ = client.request(
        LOGIN_PATH,
        method="POST",
        payload=BAD_CREDENTIALS,
        headers={
            **client.forwarded_for(client_ip, spoofed_left),
            "X-CSRFToken": token,
            "Referer": client.base + "/",
        },
    )
    return status


def identity_check(
    client: Client, token: str, limit: int, attempts: int, probes: int
) -> bool:
    """Prove the throttle bucket follows the client IP, not the proxy."""

    # Phase 1: exhaust one client's bucket. A few extra attempts absorb the
    # uneven request distribution of a multi-worker server.
    saw_block = False
    last_status = None
    for _ in range(attempts):
        last_status = login_probe(client, token, TEST_CLIENT_A)
        if last_status == 429:
            saw_block = True
            break
        if last_status not in (400, 401):
            _fail(
                "unexpected login response "
                f"HTTP {last_status}; expected 401 for bad credentials"
            )
            return False
    if not saw_block:
        _fail(
            f"{attempts} attempts from one client never returned 429 "
            f"(last HTTP {last_status})."
        )
        print(
            "       Either the login rate limit is not 10/min (pass --limit), "
            "the throttle\n"
            "       counters live in a per-worker cache (configure a shared "
            "CACHES backend\n"
            "       or run a single worker), or the proxy is not forwarding "
            "X-Forwarded-For."
        )
        return False
    _ok(f"same client is throttled after at most {attempts} attempts")

    # Phase 2: the left-hand entry must not change the bucket. With the right
    # NUM_PROXIES the right-most value is still TEST_CLIENT_A, so it stays 429.
    for index in range(probes):
        status = login_probe(
            client, token, TEST_CLIENT_A, spoofed_left=f"{SPOOFED_LEFT}{index}"
        )
        if status == 429:
            _ok("left-hand X-Forwarded-For entries do not move the bucket")
            break
        if status not in (400, 401):
            _fail(f"unexpected login response HTTP {status}")
            return False
    else:
        _fail(
            "a spoofed left-hand X-Forwarded-For entry escaped the spent bucket. "
            "NUM_PROXIES is probably too high, so Django trusts a client-supplied "
            "address. Lower it to the number of proxies you actually operate."
        )
        return False

    # Phase 3: a different real client must get its own fresh bucket.
    for _ in range(probes):
        status = login_probe(client, token, TEST_CLIENT_B)
        if status != 429:
            _ok("a different client IP is not affected by the spent bucket")
            return True
    _fail(
        "all clients share one throttle bucket, so the key is not the real "
        "client IP. NUM_PROXIES is probably too low (0 behind a proxy), the "
        "proxy rewrites X-Forwarded-For instead of appending to it, or the "
        "throttle cache is per worker."
    )
    return False


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Smoke-check a deployed staging API."
    )
    parser.add_argument(
        "--api-base",
        required=True,
        help="Base URL of the API, e.g. https://api.staging.example.com",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=10,
        help="Login attempts allowed per minute before 429 (default: 10).",
    )
    parser.add_argument(
        "--attempts",
        type=int,
        default=60,
        help="Maximum attempts used to exhaust the first bucket (default: 60).",
    )
    parser.add_argument(
        "--probes",
        type=int,
        default=20,
        help="Maximum probes per identity assertion (default: 20).",
    )
    parser.add_argument("--timeout", type=float, default=10.0, help="Seconds.")
    args = parser.parse_args()

    client = Client(args.api_base, args.timeout)

    try:
        if not health_check(client):
            return 1
        token = csrf_token(client)
        if not token:
            return 1
        if not identity_check(client, token, args.limit, args.attempts, args.probes):
            return 1
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        _fail(f"could not reach {args.api_base}: {exc}")
        return 2

    print("\nAll staging smoke checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
