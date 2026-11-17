# Security notes

This document describes the security model of the hotel site and the checks that
must stay true. It is not a substitute for a penetration test before launch.

## 1. Accounts and access control

- Only staff sign in. Guests book and manage bookings with a reference plus one
  contact detail; there are no guest accounts or passwords.
- Roles (`backend/apps/accounts/models.py`):

  | Capability | Director | Data manager | Front desk | Marketing | ICT admin |
  | --- | --- | --- | --- | --- | --- |
  | `view_guest_data` | yes | yes | yes | no | no |
  | `export_guest_data` | yes | yes | no | no | no |
  | `manage_bookings` | yes | yes | yes | no | no |
  | `manage_content` | yes | no | no | yes | no |
  | `manage_system` | yes | no | no | no | yes |

- Superusers bypass role checks. Keep the superuser count minimal and use named
  staff accounts; never share logins.
- Sessions last 12 hours (one front desk shift). Cookies are `HttpOnly` and
  `SameSite=Lax`. The CSRF cookie is intentionally readable by JavaScript so the
  React client can send `X-CSRFToken`; it is not a session secret.
- Staff endpoints require both an authenticated session and the role permission.
  The frontend hides actions the API would reject, but the API is the boundary.
- Login is throttled (`login: 10/min`) and passwords are validated with Django's
  validators (minimum 10 characters, common-password and numeric checks).
- Public write endpoints use two layers: scoped DRF throttles and the hidden
  honeypot / minimum-time check described in section 5. Both are configuration,
  not a substitute for a WAF or a penetration test.
- `seed_hotel --demo-users` is refused unless `ALLOW_DEMO_USERS=true`, and
  production forces that setting back to false. Never create demo accounts on a
  deployed environment; create named staff accounts instead.

## 2. Guest data and privacy

- A booking lookup requires the reference **and** the matching email or phone.
  Responses are still scoped to that booking only.
- Cancellation eligibility (`can_cancel`, cutoff hours) is decided by the
  backend, not the browser. A client cannot extend the window.
- Personal data stored: names, email, phone, optional notes/company, booking and
  payment references, notification logs and audit logs. Never collect more than
  the forms require.
- `HotelSetting.data_retention_months` (default 24) is the agreed retention
  target. A scheduled anonymisation/deletion routine must be run by operations;
  the setting alone does not delete anything.
- Reports and CSV exports are restricted to `export_guest_data` (director and
  data manager). Treat downloaded files as personal data: store them on managed
  devices only and delete them when done.
- Do not put guest names or contact details in URLs, analytics events or frontend
  logs.

## 3. Payments

The site never collects or stores raw card numbers, CVV/CVC or expiry dates.
There is no card-number field in the database or the React forms. Card payments
use a redirect/hosted gateway; only the gateway's references and status are
stored.

- `Payment.raw_request` / `raw_response` and `PaymentWebhookEvent.payload` are
  provider metadata for reconciliation and debugging. Before enabling a new card
  gateway, confirm its payloads contain no card data and add redaction if they do.
- M-Pesa callbacks are unsigned. Production therefore requires
  `MPESA_CALLBACK_SECRET` embedded in the callback URL and/or an
  `MPESA_ALLOWED_IPS` allow-list. Both is preferred.
- Callbacks validate the event shape, `CheckoutRequestID`, `ResultCode`, receipt
  and the exact amount against the stored payment. A mismatch is rejected and
  logged, never used to confirm a booking.
- Webhook events are deduplicated by `(provider, event_id)` so a replay cannot
  confirm twice.
- Booking confirmation is idempotent and protected by a row lock on Postgres.
  Tests cover the concurrent case when Postgres is available.
- Money that arrives after a hold/booking is no longer payable is flagged
  `requires_review` for a human, not silently accepted.
- Sandbox completion endpoints are available only when **both**
  `PAYMENTS_SANDBOX` and `PAYMENT_SIMULATION_ALLOWED` are true. Production forces
  both false and refuses to start otherwise.
- The front desk "confirmed at desk" action can mark a pending bank transfer as
  paid. It is audited, limited to the undo window, and undo restores the payment
  to pending. Supervise this permission.
- Refunds are recorded (`refunded_at`) but must follow the hotel's finance
  procedure at the provider. There is no automated refund API.

## 4. Transport, headers and browser policy

Production settings (`backend/config/settings/prod.py` and `base.py`) set:

- HTTPS redirect, HSTS (1 year, include subdomains, preload) and secure cookies;
- `X-Frame-Options: DENY` and `SECURE_CONTENT_TYPE_NOSNIFF`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `Cross-Origin-Opener-Policy: same-origin`;
- CORS and CSRF allowed origins from environment variables only. Never use `*`
  with credentials. Keep the frontend origin in both lists;
- the browsable DRF API renderer is removed in production.

The reverse proxy must forward `X-Forwarded-Proto` and should add a Content
Security Policy. A starting policy for the static frontend is:

```text
default-src 'self';
img-src 'self' data: https://images.unsplash.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
script-src 'self' https://plausible.io;
connect-src 'self' https://api.example.com https://plausible.io;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

Adjust the API and analytics hosts to the real deployment, test the booking and
dashboard flows, then tighten rather than loosen.

## 5. Abuse controls

### 5.1 Scoped throttles

Every limit is read from the environment, so operations can tighten or relax it
without a code change. Defaults live in `backend/config/settings/base.py` and are
enforced by DRF scoped throttling. Requests over the limit receive `429` with
`error.code = "throttled"`.

| Scope | Env var | Default | Key | Applies to |
| --- | --- | --- | --- | --- |
| `browse` | `THROTTLE_BROWSE` | 1200/hour | client IP | Room list/detail, availability, quote, meal plans, menu, restaurant slots, conference availability, gym availability |
| `booking` | `THROTTLE_BOOKING` | 20/hour | client IP | Create a room booking (`POST /bookings/`) |
| `hold` | `THROTTLE_HOLD` | 40/hour | client IP | Additional hold/expiry actions |
| `enquiry` | `THROTTLE_ENQUIRY` | 10/hour | client IP | Contact message, table booking, conference enquiry, gym day pass |
| `newsletter` | `THROTTLE_NEWSLETTER` | 10/hour | client IP | Newsletter subscribe/unsubscribe |
| `lookup` | `THROTTLE_LOOKUP` | 30/hour | client IP | Booking lookup/cancel, payment status lookup |
| `payment` | `THROTTLE_PAYMENT` | 30/hour | client IP | Payment initiation and sandbox completion |
| `login` | `THROTTLE_LOGIN` | 10/min | client IP / staff user | Staff login |

`browse` is deliberately generous: many guests share one hotel, office or mobile
carrier NAT address. Browsing, comparing rooms and requesting quotes must not lock
that shared address out. Writes stay strict.

The throttle key is the client IP for anonymous traffic and the user for
authenticated staff. Behind a reverse proxy, DRF reads `X-Forwarded-For` only
when `NUM_PROXIES` is greater than zero; set it to the exact number of trusted
proxies in front of Django. Leaving it at `0` while behind a proxy would otherwise
throttle the proxy address instead of the guest. The cache backend must be shared
by every application worker (Redis in production); a per-process local cache would
let a guest multiply the limit by the number of workers.

### 5.2 Honeypot and minimum time

All public forms post two extra fields (`apps/common/anti_spam.py`):

- `website` - a hidden field placed off-screen. Real guests never see it; any
  non-blank value marks the request as a bot.
- `form_started_at` - epoch milliseconds captured when the form mounted. A
  submission that arrives faster than `FORM_MIN_SUBMIT_SECONDS` (default 2) is
  treated as automated.

Covered forms: newsletter, contact message, table booking, conference enquiry,
gym day pass, room booking and booking lookup. The view checks these **before**
serializer validation. A suspected bot gets the normal success shape (or a
generic booking-not-found for lookups) with `201`/`404`, and nothing is written,
queued or emailed. This keeps the response indistinguishable from a real success.

`form_started_at` is optional for backwards compatibility (older clients and
server-to-server callers); a missing timestamp does not block a guest, while a
malformed one is treated as a bot. The honeypot field is also sent empty from the
frontend, so a missing value is normal. Tests:
`backend/apps/common/tests/test_anti_spam.py`.

Add proxy-level rate limiting and bot filtering as a second layer. Monitor spikes
in 4xx/5xx and `429` responses; a sudden rise in honeypot hits usually means a
targeted form spam run.

## 6. Logging and audit

- Every request gets an `X-Request-ID`, echoed to the client and included in log
  lines (`apps.common.middleware.RequestIDMiddleware`).
- `AuditLog` records staff actions, including who changed a booking/payment and
  the request ID.
- `NotificationLog` records every email/SMS attempt, its status and error. It
  must never contain full message bodies with secrets.
- Do not log `SECRET_KEY`, gateway consumer secrets, callback secrets, SMS keys,
  passwords or full request bodies from the payment endpoints.
- Restrict log access to ICT and retain logs according to the hotel's policy.

## 7. Third parties and data sharing

| Service | Purpose | Data | Notes |
| --- | --- | --- | --- |
| Safaricom Daraja | M-Pesa STK Push | phone, amount, reference | Production credentials in env only. |
| Card gateway | hosted card payment | gateway handles card data | `stub` until a real provider is configured. |
| Africa's Talking | SMS | phone, short message | Disabled by default (`SMS_SEND_ENABLED=false`). |
| SMTP provider | email | guest name/email, booking details | TLS required. |
| Plausible (optional) | page analytics | path, referrer; no cookies/PII | Off unless `VITE_ANALYTICS_DOMAIN` is set. |
| Google Fonts / Material Symbols | typography/icons | IP, user agent | Consider self-hosting to reduce third-party calls. |
| Unsplash | placeholder room/facility images | IP, user agent | Replace with hotel-owned images before launch. |
| Google Maps | map link/embed | location query | Confirm the pin with the hotel. |

## 8. Secrets and operations

- Secrets live in the environment (`.env` locally, host secret store in
  production). Never commit `.env`; `.env.example` contains placeholders only.
- Rotate `SECRET_KEY`, gateway secrets and SMTP/SMS credentials on staff
  departure or suspected exposure. Rotating `SECRET_KEY` invalidates sessions.
- Keep dependencies patched: `pip list --outdated` and `npm outdated` on a
  schedule, then re-run tests.
- Back up Postgres and test restores. The database holds personal data.
- Restrict Django admin by network or SSO where possible; it is not exposed to
  guests by design.

## 9. Reporting a vulnerability

Email the hotel's ICT contact (configure a real security inbox before launch)
with the affected URL, a short reproduction, and the impact. Do not include real
guest data in the report. Do not test against production with real payments.

## 10. Pre-launch security checklist

- [ ] `python manage.py check --deploy` is clean in production settings.
- [ ] `DEBUG=false`, strong `SECRET_KEY`, real `ALLOWED_HOSTS`.
- [ ] HTTPS, HSTS and secure cookies verified in a browser.
- [ ] CORS/CSRF origins are exact HTTPS origins, no wildcards.
- [ ] Payment guards pass and simulation flags are false.
- [ ] Staff accounts follow least privilege; departed staff disabled.
- [ ] A guest cannot access another guest's booking with only a reference.
- [ ] Reports/CSV require the export capability.
- [ ] Logs contain request IDs and no secrets or card data.
- [ ] Backups and restore procedure tested.
- [ ] Privacy notice, terms and data-retention procedure published.
