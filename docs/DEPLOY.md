# Deploy runbook — short form

This is the entry point for the next operator. The full, annotated procedure is
in [`DEPLOYMENT.md`](DEPLOYMENT.md); the release gates are in
[`LAUNCH-CHECKLIST.md`](LAUNCH-CHECKLIST.md) and are executed with
[`UAT-SCRIPT.md`](UAT-SCRIPT.md).

**Release gate:** do not deploy to production while any P0 item is open or UAT
is unsigned. This feature branch is a release candidate only: no merge to
`main`, no tag and no production deploy are part of it.

## 1. Preflight

- [ ] Record the commit SHA and the green CI run for that exact commit.
- [ ] Confirm every P0 owner, status and verification entry in
      `docs/LAUNCH-CHECKLIST.md` section 1; **TBC means not closed**.
- [ ] Confirm UAT scenarios pass and the go/no-go line is signed in
      `docs/UAT-SCRIPT.md`.
- [ ] Fill the host environment from `.env.example`; keep real secrets in the
      host's secret store, never in Git. Leave analytics, demo users and
      retention writes off unless explicitly approved.
- [ ] Confirm the hotel has supplied the address/map pin, phone/WhatsApp/email,
      social links, real prices, approved claims, Swahili review, policy wording,
      payment/SMTP/SMS credentials and named staff accounts.

## 2. Build and release

From `backend/`:

```powershell
..\.venv\Scripts\python.exe manage.py check --deploy --settings=config.settings.prod
..\.venv\Scripts\python.exe manage.py migrate --settings=config.settings.prod
..\.venv\Scripts\python.exe manage.py seed_hotel --settings=config.settings.prod
..\.venv\Scripts\python.exe manage.py collectstatic --noinput --settings=config.settings.prod
```

From `frontend/`, with the `VITE_HOTEL_*` build-time values set for the target
environment:

```powershell
npm ci
npm run check
npm run build
```

`npm run build` must report 26 prerendered pages from 13 indexable routes and
pass the static performance budgets in `scripts/check_performance_budget.mjs`
(entry JS, total JS, CSS, prerendered HTML and largest WebP).

Start the workers exactly as described in `docs/DEPLOYMENT.md` (gunicorn web
process plus one supervised `qcluster` worker). Do not install a retention
schedule; `apply_retention --apply` needs `RETENTION_APPLY_ENABLED=true` and
hotel approval.

## 3. Verify staging before production

```powershell
python scripts/check_staging_stack.py
python scripts/staging_smoke.py --api-base http://localhost:8080 --site-base http://localhost:8080
```

The smoke script checks health, core public JSON routes, hidden/approved policy
behaviour, prerendered EN/SW HTML (including `/cancellation`) and the real-client
IP throttle identity. It sends bad logins from documentation-only test IPs, so
point it only at staging. Then walk the manual checks in `docs/DEPLOYMENT.md`
section 6 and the UAT script.

## 4. Rollback

Keep the previous commit/image and a tested database backup. If a release fails,
restore the previous image and database, re-run `migrate` and `seed_hotel`, then
repeat the smoke checks. Record the incident and the reverted SHA; do not clear a
P0 blocker to make a rollback look clean.

Detailed proxy, TLS/HSTS, backup/restore, payment and monitoring notes are in
`docs/DEPLOYMENT.md`.
