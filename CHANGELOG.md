# Changelog

All notable changes to the West Premier Hotel release candidate are documented
here. The format follows Keep a Changelog; versions use semantic versioning.

## [Unreleased]

- No production release has been made. This branch is a release candidate only:
  no merge to `main`, no production deploy.
- Launch blockers remain tracked in `docs/LAUNCH-CHECKLIST.md` and must be
  signed off in `docs/UAT-SCRIPT.md` before a release is cut.

## [0.1.0-rc1] — 2026-11-26

### Added

- **C7 — guest language for facilities:** `TableBooking` and
  `ConferenceEnquiry` store the active UI language (`en`/`sw`), with indexed
  fields, backfill migrations and `en` fallback. Email/SMS confirmations,
  declines and reminders use the stored language, including localized
  conference labels and numeric Swahili dates.
- **C8 — URL-based language routing:** unprefixed paths are English and `/sw`
  paths are Kiswahili across the whole site. Internal links and navigation
  preserve the prefix, query and hash; a stored preference never redirects a
  crawler. Per-language canonical/OG/hreflang tags are emitted on every page.
- **C9 — manifest-driven SEO and blog routes:** `SITE_ROUTES` is the single
  source for the router, sitemap and robots. `/blog` and `/blog/:slug` render
  CMS content in both languages; concrete slugs are refreshed from the API.
- **C10 — prerendered marketing pages:** `npm run build` now renders 12 static
  indexable routes in EN and SW (24 pages) with unique head metadata, H1s and
  JSON-LD; `/blog/:slug` remains client-rendered by design.
- **E1 — staging stack:** `docker-compose.staging.yml`, staging settings,
  gunicorn + supervised `qcluster`, one nginx proxy, report-only CSP and a
  prerendered-file-first SPA fallback. `scripts/check_staging_stack.py` and
  `scripts/staging_smoke.py` validate the manifest and live staging behaviour.
- **E2 — backup/restore drill:** `scripts/postgres_backup_restore.py` provides
  custom-format backup/restore commands plus a CI drill using scratch databases.
  The drill never touches the application database.
- **E3 — monitoring and retention:** opt-in `SENTRY_DSN` (off by default),
  `LOG_FORMAT=json` with redacted structured extras, and
  `manage.py apply_retention` with a safe dry-run default. `--apply` deletes
  expired `FormGuardEvent` rows and anonymises old `AuditLog`/`NotificationLog`
  rows.
- **E4 — staff content review:** read-only
  `GET /api/v1/staff/common/content-confirmation/` behind `CanManageContent`,
  plus a private `/content-review` page linked from the dashboard. It aggregates
  all `needs_confirmation` rows without modifying them.
- **E5 — UAT:** `docs/UAT-SCRIPT.md` provides executable scenarios and sign-off
  for hotel, front desk, marketing and ICT owners.

### Changed

- **D1:** interaction motion normalized to 150–350 ms, transform/opacity only,
  with a reduced-motion override and a static motion budget check.
- **D2:** axe-core jsdom checks cover six public pages in EN/SW; the real-browser
  Playwright spec adds keyboard, focus and reduced-motion assertions.
- **D3:** Playwright specs a–g run in CI against the production Vite bundle via
  `vite preview` with deterministic API mocks. No Django/DB/mail/payment service
  is needed. `PLAYWRIGHT_CHANNEL` is only a local opt-in.
- **D4:** optimized images, self-hosted fonts, subset Material Symbols font and
  scoped below-the-fold deferral. Mobile Lighthouse performance is ≥85 on the
  measured pages.
- **D5:** report-only CSP on frontend, API and admin; enforcement deliberately
  deferred until real violations are reviewed.
- Documentation updated: `docs/ACCEPTANCE-REPORT.md`, `docs/LAUNCH-CHECKLIST.md`
  and `docs/DEPLOYMENT.md` now carry D/E evidence and CI links.

### Fixed

- Postgres-only defects found by the concurrency test: notification
  `entity_type` length and `select_for_update` over nullable joins.
- Fallback test language value shortened to two characters for `varchar(2)`.
- Staging proxy now serves nested prerendered `index.html` files before the SPA
  fallback, so `/rooms` and `/sw/rooms` are served as static HTML.
- CI backup drill hardened to use a portable SQL dump/restore path and emit
  explicit diagnostics (see the acceptance report for the green run link).

### Security / privacy

- No live payment, SMTP or SMS credentials are used in staging or CI.
- `needs_confirmation`, `claims_verified`, prices, address and
  `privacy_notice_version` remain unchanged pending hotel sign-off.
- Retention is dry-run by default; writes require an explicit `--apply`.
- Structured logs redact guest/card data and error monitoring is opt-in.

## [0.1.0] — not released

Reserved for the first production release after all launch blockers are closed
and UAT sign-off is recorded.
