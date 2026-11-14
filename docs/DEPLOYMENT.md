# Deployment

The site is two deployables:

| Part | Stack | Output |
| --- | --- | --- |
| Frontend | React 19 + Vite 6 | static files in `frontend/dist` |
| Backend | Django 5.2 + DRF + Postgres + django-q2 | WSGI app + static files |

Recommended topology: one small VM/container for Django and one worker process
on the same host, Postgres as a managed service, and the frontend on any static
host or the same reverse proxy.

## 1. Prerequisites

- Python 3.12+ (the repo's `.venv` is created at the repository root).
- Node.js 20+ and npm.
- Postgres 15+.
- A public HTTPS domain for the API (for M-Pesa callbacks) and for the site.
- A reverse proxy (nginx/Caddy) that terminates TLS.

## 2. Backend configuration

Copy `.env.example` to `.env` at the repository root (or `backend/.env`) and set
at least:

```dotenv
DJANGO_SETTINGS_MODULE=config.settings.prod
SECRET_KEY=<long random value>
DEBUG=false
ALLOWED_HOSTS=api.example.com,www.example.com
SITE_URL=https://www.example.com
API_BASE_URL=https://api.example.com
POSTGRES_DB=hotel
POSTGRES_USER=hotel
POSTGRES_PASSWORD=<secret>
POSTGRES_HOST=<db host>
POSTGRES_PORT=5432
SECURE_SSL_REDIRECT=true
SECURE_HSTS_SECONDS=31536000
CORS_ALLOWED_ORIGINS=https://www.example.com
CSRF_TRUSTED_ORIGINS=https://www.example.com,https://api.example.com
```

Production settings (`config/settings/prod.py`) enforce:

- a non-default `SECRET_KEY` and a non-empty `ALLOWED_HOSTS`;
- `PAYMENTS_SANDBOX=false`, `PAYMENT_SIMULATION_ALLOWED=false`,
  `MPESA_SIMULATE=false`;
- a real `EMAIL_BACKEND` (console is rejected);
- `CARD_CALLBACK_SECRET` when `CARD_GATEWAY` is not `stub`;
- `MPESA_CALLBACK_SECRET` and/or `MPESA_ALLOWED_IPS` (M-Pesa callbacks are
  unsigned);
- no browsable API renderer;
- secure cookies, HSTS and HTTPS redirects.

The checks live in `backend/apps/payments/production.py` and fail the process at
startup, so a misconfigured deploy cannot silently take fake payments.

### Payments

Set `PAYMENTS_SANDBOX=false` and real Daraja credentials:

```dotenv
MPESA_ENV=production
MPESA_BASE_URL=https://api.safaricom.co.ke
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_SHORTCODE=...
MPESA_PASSKEY=...
MPESA_CALLBACK_URL=https://api.example.com/api/v1/payments/webhooks/mpesa/
MPESA_CALLBACK_SECRET=<random shared secret>
MPESA_ALLOWED_IPS=<Safaricom production IPs, comma separated>
```

If cards are enabled, set `CARD_GATEWAY` to the real provider (not `stub`) and
provide `CARD_CONSUMER_KEY`, `CARD_CONSUMER_SECRET` and `CARD_CALLBACK_SECRET`.
The site never collects or stores card numbers; the gateway handles card entry.

### Email and SMS

```dotenv
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=...
EMAIL_PORT=587
EMAIL_HOST_USER=...
EMAIL_HOST_PASSWORD=...
EMAIL_USE_TLS=true
DEFAULT_FROM_EMAIL=reservations@example.com
FRONT_DESK_EMAIL=frontdesk@example.com
MANAGER_EMAIL=manager@example.com

SMS_PROVIDER=africastalking
SMS_USERNAME=...
SMS_API_KEY=...
SMS_SENDER_ID=...
SMS_SEND_ENABLED=true
```

## 3. Backend install and release

Run from `backend/`:

```powershell
..\.venv\Scripts\python.exe -m pip install -r requirements.txt
..\.venv\Scripts\python.exe manage.py check --deploy --settings=config.settings.prod
..\.venv\Scripts\python.exe manage.py migrate --settings=config.settings.prod
..\.venv\Scripts\python.exe manage.py seed_hotel --settings=config.settings.prod
..\.venv\Scripts\python.exe manage.py setup_schedules --settings=config.settings.prod
..\.venv\Scripts\python.exe manage.py collectstatic --noinput --settings=config.settings.prod
```

`seed_hotel` is idempotent and writes the editable placeholders. Re-run it after
changing the brand env vars; it updates the `HotelSetting` record but does not
overwrite content staff have edited. Fill in the launch blockers in
`docs/LAUNCH-CHECKLIST.md` in Django admin before going live.

Start the web process with a production WSGI server (example using Gunicorn;
add it to the deployment image if it is not already installed):

```powershell
..\.venv\Scripts\python.exe -m gunicorn config.wsgi:application --bind 127.0.0.1:8000 --workers 3 --timeout 60
```

Start exactly one worker process group for background jobs:

```powershell
..\.venv\Scripts\python.exe manage.py qcluster
```

The worker sends arrival reminders, expires stale holds and escalates overdue
front desk items. Without it the site still serves requests, but those jobs stop.

### Static files

WhiteNoise serves Django admin/static assets from `backend/staticfiles`. Make
sure the reverse proxy forwards `/admin/`, `/api/`, `/static/` and `/media/` to
Django. `collectstatic` is required on every deploy that changes static files.

## 4. Frontend build

```powershell
cd frontend
npm ci
$env:VITE_API_URL = "https://api.example.com/api/v1"
# Optional, opt-in analytics:
# $env:VITE_ANALYTICS_DOMAIN = "www.example.com"
npm run check
npm run build
```

`npm run check` runs typecheck, lint, tests and the brand check. The build also
emits `dist/robots.txt` and `dist/sitemap.xml` from `HOTEL.websiteUrl`, and
injects the `Hotel` JSON-LD block and OG/Twitter tags into `dist/index.html`.

Serve `frontend/dist` over HTTPS. Because the app uses `BrowserRouter`, unknown
routes must fall back to `index.html`:

- Netlify / Cloudflare Pages: `frontend/public/_redirects` (copied into the build).
- Vercel: `frontend/vercel.json`.
- nginx: `try_files $uri $uri/ /index.html;`.

Keep `/dashboard` and `/booking/manage` out of search results. The pages mark
themselves `noindex` and `robots.txt` disallows them, but do not rely on that as
access control — the staff API still requires a session and the right role.

## 5. Reverse proxy notes

- Route `https://api.example.com/api/` to Django and
  `https://www.example.com/` to the static frontend.
- Forward `X-Forwarded-Proto` (Django trusts it via
  `SECURE_PROXY_SSL_HEADER`).
- Do not cache `/api/v1/staff/` or `/api/v1/payments/` responses.
- Allow request bodies large enough for the admin uploads you expect.
- Add basic rate limiting at the proxy in addition to DRF throttles.

## 6. Post-deploy smoke test

- [ ] `GET https://api.example.com/api/v1/health/` returns 200.
- [ ] `/admin/` loads over HTTPS and an admin can sign in.
- [ ] Home page loads, fonts and images resolve, no console errors.
- [ ] Language switch EN ⇄ SW works on every page.
- [ ] Availability + quote works for a future date; a test booking reaches
      `pending_payment`.
- [ ] One real low-value M-Pesa payment completes and the booking confirms.
- [ ] Manage-booking lookup + cancellation works with the confirmation email.
- [ ] Front desk login, queue action and undo work; reports CSV downloads.
- [ ] Confirmation/reminder email and SMS arrive (check `NotificationLog` too).
- [ ] `robots.txt` and `sitemap.xml` show the production domain.
- [ ] Sentry/host logs show no startup warnings or 5xx responses.

## 7. Rollback

1. Keep the previous frontend `dist` and backend release directory.
2. Roll back the code, then run `migrate` only if the previous release's
   migrations are already applied (never reverse a migration with guest data
   unless you have a backup).
3. Restart the web process and the `qcluster` worker.
4. Re-run the health check and a read-only booking lookup.
5. Restore the Postgres backup only as a last resort; record the time window of
   any payments that will be replayed.

## 8. Local development

From `backend/`:

```powershell
..\.venv\Scripts\python.exe manage.py migrate
..\.venv\Scripts\python.exe manage.py seed_hotel
..\.venv\Scripts\python.exe manage.py runserver
```

From `frontend/`:

```powershell
npm install
npm run dev
```

The dev settings use SQLite automatically, enable payment simulation and print
email to the console. Never deploy with `config.settings.dev`.
