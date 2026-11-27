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
- confirmed `HOTEL_PHONE`, `HOTEL_EMAIL`, `HOTEL_ADDRESS` and `HOTEL_MAP_QUERY`
  (placeholder values are rejected);
- `PAYMENTS_SANDBOX=false`, `PAYMENT_SIMULATION_ALLOWED=false`,
  `MPESA_SIMULATE=false`;
- a real `EMAIL_BACKEND` (console is rejected);
- `CARD_CALLBACK_SECRET` when `CARD_GATEWAY` is not `stub`;
- `MPESA_CALLBACK_SECRET` and/or `MPESA_ALLOWED_IPS` (M-Pesa callbacks are
  unsigned);
- no browsable API renderer;
- secure cookies, HSTS and HTTPS redirects.

The checks live in `backend/apps/common/production.py` and
`backend/apps/payments/production.py` and fail the process at startup, so a
misconfigured deploy cannot silently publish placeholder contact details or
take fake payments.

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
# Set every VITE_HOTEL_* value listed in ../.env.example. They are build-time
# public values (no secrets); an explicitly empty social URL removes that link.
npm run check
npm run build
```

`npm run check` runs typecheck, lint, tests and the brand check. The
`VITE_HOTEL_*` variables are read both by client code and by `vite.config.ts`,
so the injected HTML, robots, sitemap and prerendered metadata all use the same
values. The build also emits `dist/robots.txt` and `dist/sitemap.xml` from
`HOTEL.websiteUrl`, injects
the `Hotel` JSON-LD block and OG/Twitter tags, and then runs
`node scripts/prerender.mjs`.

The prerender step loads the real `App` and router through Vite SSR and writes
one static HTML file for each of the 13 indexable routes in both languages:
`/`, `/rooms`, `/booking`, `/facilities`, `/dining`, `/conference`, `/gym`,
`/offers`, `/blog`, `/contact`, `/privacy`, `/terms` and `/cancellation`, plus
their `/sw` variants — 26 pages and `dist/prerender-report.json`. Each page contains the
rendered H1 in the body, a unique title/description/canonical/OG URL and a
`WebPage` JSON-LD node with a unique `@id`. The static copy is also the fallback
when the API is unreachable; React Query refreshes CMS data after hydration.
Dynamic `/blog/{slug}` pages are deliberately not prerendered and use the SPA
fallback. No routes were dropped.

Serve `frontend/dist` over HTTPS. The host must serve an existing nested
`index.html` before applying the SPA fallback; unknown routes then fall back to
`dist/index.html`. This must include the whole Kiswahili tree: `/sw`,
`/sw/rooms`, `/sw/booking/manage`, `/sw/dashboard` and any other `/sw/*` path.

- Netlify / Cloudflare Pages: `frontend/public/_redirects`
  (`/* /index.html 200`, copied into the build) supplies the fallback for
  `/sw/*`; verify it is not marked as forced/shadowing so prerendered files win.
- Vercel: `frontend/vercel.json` (`/(.*) → /index.html`) supplies the fallback;
  verify the filesystem check happens before the rewrite.
- nginx: `index index.html; try_files $uri $uri/index.html /index.html;` serves
  nested prerendered files before the fallback.

Do not add a language redirect at the edge. The URL determines the active
language: unprefixed paths are English and `/sw` paths are Kiswahili. A stored
`hotel.language` preference must never redirect a crawler or direct visitor.

Keep `/dashboard`, `/sw/dashboard`, `/booking/manage` and
`/sw/booking/manage` out of search results. The pages mark themselves `noindex`
and the generated `robots.txt` disallows all four paths, but do not rely on that
as access control — the staff API still requires a session and the right role.
They are not prerendered.

The sitemap and robots files are generated from `frontend/src/lib/routes.ts`, so
adding a page there updates the router, sitemap and prerender target set. Re-run
the full `npm run build` (not just `vite build`) after changing routes, page
copy, metadata keys, translations or layout; `npm run prerender` alone only
regenerates HTML from the existing `dist/index.source.html`. CI runs the full
build on every push and fails if a critical page loses its H1 or metadata.
Blog post URLs are dynamic: after publishing posts in the CMS, run
`python scripts/refresh_blog_routes.py` with `SITE_API_URL` pointing at the
public API before `npm run build`, so `/blog/{slug}` and `/sw/blog/{slug}` are
included in the sitemap.

## 5. Reverse proxy notes

- Route `https://api.example.com/api/` to Django and
  `https://www.example.com/` to the static frontend.
- Forward `X-Forwarded-Proto` (Django trusts it via
  `SECURE_PROXY_SSL_HEADER`).
- Do not cache `/api/v1/staff/` or `/api/v1/payments/` responses.
- Allow request bodies large enough for the admin uploads you expect.
- Add basic rate limiting at the proxy in addition to DRF throttles.

### Content-Security-Policy (report-only)

Both deployables send `Content-Security-Policy-Report-Only`, not the enforcing
header:

- The static host config `frontend/vercel.json` applies the policy to `/(.*)`:
  `default-src 'self'`, `base-uri 'self'`, `object-src 'none'`,
  `frame-ancestors 'none'`, `form-action 'self'`, self/data images and fonts,
  `style-src 'self' 'unsafe-inline'`, Plausible for script/connect (only used
  when analytics is opted in), and Google Maps for `frame-src`. The SPA rewrite
  still works.
- `backend/apps/common/middleware.py` adds `settings.CSP_REPORT_ONLY_POLICY` to
  API and Django admin responses. The backend policy is slightly more permissive
  (`'unsafe-inline'` scripts/styles and `img-src https:`) because the built-in
  admin needs them.

No `report-uri` or `report-to` collector is configured yet, so violations show
in browser developer tools until a collector is chosen. Keep the headers
report-only through staging and early production, review violations (especially
admin pages and the map iframe), then switch to enforcing headers in a separate
release. Tests assert the report-only headers and the absence of the enforcing
header; CI evidence: [45782053634](https://github.com/Pkorirdarius/Kalya_Hotel_mangement_App/actions/runs/45782053634).

### Choosing `NUM_PROXIES`

DRF throttles (and the audit log) identify a guest by client IP. Behind a
reverse proxy `REMOTE_ADDR` is the proxy address, so Django reads
`X-Forwarded-For` instead. `NUM_PROXIES` is the number of trusted proxies
between the internet and Django, counted from the right of that header.

| Setup | `NUM_PROXIES` |
| --- | --- |
| Django exposed directly (local dev) | `0` |
| One nginx/Caddy in front of Django | `1` |
| CDN (for example Cloudflare), then nginx | `2` |
| CDN, load balancer, then nginx | `3` |

Use the number of proxies you actually operate, never more. The single-VM
topology in this guide uses `NUM_PROXIES=1`. Each proxy should *append* the
address it received (nginx:
`proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`; Caddy does
this by default).

What goes wrong:

- **Too low** (for example `0` behind a proxy): every guest shares the proxy's
  bucket, so the first requests across all guests spend the limit and everyone
  gets 429. Audit rows also record the proxy address instead of the guest's.
- **Too high** (for example `2` with one proxy): Django reads an entry the
  client can control. An attacker rotates that value to bypass throttles, and
  the audit log records a fake IP. A single-entry header still works, which
  makes this mistake easy to miss.

To verify, run the staging smoke check in section 6. If throttles never trip
while several web workers run, the throttle counters are per worker: configure
a shared `CACHES` backend (Redis or the database cache) so all workers share
them.

## 6. Post-deploy smoke test

Run the automated checks against staging first:

```powershell
python scripts/staging_smoke.py --api-base https://api.staging.example.com
```

It verifies the health endpoint and then proves the throttle key is the real
client IP: the same fake client is throttled, a second fake client is not, and
a spoofed left-hand `X-Forwarded-For` entry does not move the bucket. It sends
bad logins from the documentation-only `198.51.100.0/24` range, so it must only
be pointed at staging; it leaves that fake bucket blocked for about a minute.
The identity check assumes the recommended single proxy that appends to
`X-Forwarded-For`; if a CDN rewrites the header, confirm `NUM_PROXIES` from the
proxy configuration instead.

Then walk the manual list:

- [ ] `GET https://api.example.com/api/v1/health/` returns 200.
- [ ] `/admin/` loads over HTTPS and an admin can sign in.
- [ ] Home page loads, fonts and images resolve, no console errors.
- [ ] `GET /rooms` and `GET /sw/rooms` return prerendered HTML with the H1 and
      metadata before JavaScript runs; a dynamic `/blog/{slug}` falls back to
      the app shell and loads from the CMS.
- [ ] Language switch EN ⇄ SW works on every page.
- [ ] Availability + quote works for a future date; a test booking reaches
      `pending_payment`.
- [ ] One real low-value M-Pesa payment completes and the booking confirms.
- [ ] Manage-booking lookup + cancellation works with the confirmation email.
- [ ] Front desk login, queue action and undo work; reports CSV downloads.
- [ ] Confirmation/reminder email and SMS arrive (check `NotificationLog` too).
- [ ] `robots.txt` and `sitemap.xml` show the production domain.
- [ ] Frontend and API responses include
      `Content-Security-Policy-Report-Only` and no enforcing CSP; review browser
      console violation reports.
- [ ] Sentry/host logs show no startup warnings or 5xx responses.

## 7. Staging stack

`docker-compose.staging.yml` is the production-like rehearsal stack: one
`postgres:16-alpine` database, one gunicorn web process (`config.settings.staging`,
`DEBUG=False`), one supervised `python manage.py qcluster` worker and one nginx
proxy on port 8080. Staging deliberately has no live payment, SMTP or SMS
credentials: `.env.staging.example` keeps sandbox/stub settings and the hotel
decision flags false.

```powershell
Copy-Item .env.staging.example .env.staging
docker compose -f docker-compose.staging.yml up --build -d
python scripts/check_staging_stack.py
python scripts/staging_smoke.py --api-base http://localhost:8080 --site-base http://localhost:8080
```

The proxy config `ops/nginx-staging.conf` serves prerendered nested `index.html`
files before the SPA fallback (`try_files $uri $uri/index.html /index.html;`),
so `/rooms`, `/sw/rooms` and other static routes are delivered as HTML without
JavaScript. It appends `X-Forwarded-For`, so `NUM_PROXIES=1` in staging settings
and `.env.staging`. Behind real TLS, set `SECURE_SSL_REDIRECT`,
`SECURE_HSTS_SECONDS`, `SESSION_COOKIE_SECURE` and `CSRF_COOKIE_SECURE` to their
secure values.

`scripts/check_staging_stack.py` validates the manifest statically and CI runs
`python manage.py check --settings=config.settings.staging` plus
`docker compose -f docker-compose.staging.yml config --quiet`. Green CI evidence:
[45785986169](https://github.com/Pkorirdarius/Kalya_Hotel_mangement_App/actions/runs/45785986169).
Docker Desktop was unavailable for a live local Compose run, so the deployed
smoke test remains an operational sign-off item in `docs/UAT-SCRIPT.md`.

## 8. Backup and restore

`scripts/postgres_backup_restore.py` uses pg_dump/pg_restore (already installed
with the backend dependencies) and psycopg for scratch-database administration.

```powershell
# Operational custom-format backup and restore
python scripts/postgres_backup_restore.py backup --db hotel --file backups/hotel.dump
python scripts/postgres_backup_restore.py restore --db hotel_restore --file backups/hotel.dump --clean

# CI-safe rehearsal: creates and drops hotel_backup_source / hotel_backup_restore
python scripts/postgres_backup_restore.py drill
```

`drill` never touches the application database. It writes a marker row, dumps
the scratch source with plain SQL, restores it into the scratch target with
`psql -v ON_ERROR_STOP=1`, verifies the marker and drops both databases. Newer
pg_dump clients can emit `SET transaction_timeout = 0;`, which older servers
reject; the drill removes that client-only setting. Postgres 16 CI proof:
[45790178207](https://github.com/Pkorirdarius/Kalya_Hotel_mangement_App/actions/runs/45790178207).

Schedule backups outside this repository (host snapshot plus logical dumps),
retain them according to the hotel's policy, and perform one real restore drill
against a scratch database before launch. Do not restore into a live database
without a recorded payment replay window; see Rollback below.

## 9. Monitoring, logs and retention

- `SENTRY_DSN` is empty by default. Set it (optionally with `SENTRY_RELEASE` and
  `SENTRY_ENVIRONMENT`) to opt into error reporting; no SDK call or network
  request is made while it is empty.
- `LOG_FORMAT=json` switches Django logging to `SafeJSONFormatter`, which emits
  one JSON object per record with a request ID. Structured extras are redacted
  for sensitive keys (`password`, `token`, `phone`, `email`, `card`, …) and
  obvious email/number identifiers.
- Monitor `GET /api/v1/health/` and the `qcluster` worker; alert on failed health
  checks, 5xx spikes and a stopped worker. The staging stack exposes the health
  endpoint through the proxy.

Retention is opt-in; no recurring job installs it and nothing is written by
default:

```powershell
python manage.py apply_retention --dry-run
# Only after hotel approval of the retention period:
$env:RETENTION_APPLY_ENABLED = "true"
python manage.py apply_retention --apply
```

`--apply` refuses to write while `RETENTION_APPLY_ENABLED` is false (the
default), so a scheduled or accidental invocation can only report counts.
The period comes from `HotelSetting.data_retention_months` (default 24 months)
and can be overridden per run. `--apply` deletes expired `FormGuardEvent` rows,
anonymises old `AuditLog` rows (actor, IP, request ID and metadata) and clears
recipient/subject/error on old `NotificationLog` rows. Business records are kept
for evidence; guest identifiers are removed. CI proves the dry run on
[45790178207](https://github.com/Pkorirdarius/Kalya_Hotel_mangement_App/actions/runs/45790178207).
The hotel must approve the period before the first `--apply` run.

Staff can review every `needs_confirmation` row at `/content-review` (also
`/sw/content-review`), linked from the dashboard. The page is private,
`noindex` and read-only; its API requires `CanManageContent`.

## 10. Rollback

1. Keep the previous frontend `dist` and backend release directory.
2. Roll back the code, then run `migrate` only if the previous release's
   migrations are already applied (never reverse a migration with guest data
   unless you have a backup).
3. Restart the web process and the `qcluster` worker.
4. Re-run the health check and a read-only booking lookup.
5. Restore the Postgres backup only as a last resort; record the time window of
   any payments that will be replayed.

## 11. Local development

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
