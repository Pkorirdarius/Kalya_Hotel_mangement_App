# Acceptance report — `feat/finish-frontend`

**Audit date:** 14 November 2026  
**Branch tip at audit:** `230e6a9` — `fix(analytics): queue early pageviews without double counting`  
**Target:** `v0.1.0-rc1` release candidate (no merge, no production deploy)  
**Scope:** prove the definition of done, close gaps, stage and package the release. No new guest features and no UI redesign.

Status legend:

| Status | Meaning |
| --- | --- |
| **Done** | Implemented and covered by an automated test or a directly inspected artifact. |
| **Partial** | Implemented, but a stated part of the requirement is missing, hard-coded, or only works in one language/mode. |
| **Missing** | No implementation found. |
| **Unverified** | Implementation may exist, but the required proof could not be produced in this environment. |

## 1. Commands run for this audit

All commands were run from the repository root unless stated. Backend commands run from `backend/`.

| # | Command | Result |
| --- | --- | --- |
| 1 | `git status --short` | Clean tree (no output). Tip `230e6a9`, branch `feat/finish-frontend`, tracking `origin/feat/finish-frontend`. |
| 2 | `..\.venv\Scripts\python.exe -m pytest -q` | **87 passed, 1 skipped** in 6.43s (after A1–A3 and B4). Skip: `apps/bookings/tests/test_concurrency.py:29 — Row-lock concurrency needs Postgres`. |
| 3 | `npm run typecheck` | Passed (`tsc --noEmit`, no output). |
| 4 | `npm run lint` | Passed (`eslint .`, no output). |
| 5 | `npm test` | **76 passed** across **17 test files** in 27.98s (after A2, A3 and B4). |
| 6 | `npm run build` | Passed. Vite 6.4.5 built 219 modules and emitted `dist/robots.txt` and `dist/sitemap.xml`. |
| 7 | `npm run check:brand` | `Brand check passed: no hard-coded brand strings in code or tests.` |
| 8 | `USE_SQLITE=false ... python -m pytest -q` (Postgres 16 in Docker) | **88 passed** in 16.96s, including `test_concurrency.py` (8 threads, 1 room, exactly 1 booking). Two Postgres-only defects fixed first: notification `entity_type` truncation and `select_for_update` over nullable joins. |

**Not run (therefore unverified):** Docker/Compose staging stack, Playwright browser suite, Lighthouse, `manage.py check --deploy`, live M-Pesa/card/SMTP calls, backup/restore drill. The Postgres-backed suite now runs locally and in CI.

## 2. Acceptance table

**Status after A1–A3, B4 and B5:** **33 Done**, **6 Partial**, **13 Missing**, **3 Unverified**, **1 Pending** (56 rows). Remaining P0 work is tracked in the Step 2 order below.

### 2.1 Booking and payments

| Requirement | Status | Evidence | Action |
| --- | --- | --- | --- |
| Room booking creates a time-limited hold | **Done** | `backend/apps/bookings/services/bookings.py:32-129` (`@transaction.atomic`, `RoomType.objects.select_for_update()`, `hold_expires_at`); `apps/bookings/tests/test_booking_api.py::test_create_booking_holds_inventory`; `::test_expired_hold_releases_inventory` | None. |
| No oversell when the last room is requested | **Done** | Availability runs inside `transaction.atomic()` under a `RoomType` row lock (`services/bookings.py:79-97`); tests `test_last_website_room_cannot_be_oversold` and `test_create_booking_is_idempotent_by_client_request_id`. `test_concurrency.py` now runs against a real Postgres 16 instance: 8 threads compete for 1 room and exactly 1 books while 7 get `SoldOutError` (fixed its date arithmetic). The Postgres run also exposed and fixed two production-only bugs: `NotificationLog.entity_type` overflowed `varchar(40)` because `_meta.model` was used instead of `_meta.model_name`, and `complete_payment` used `select_for_update()` with nullable `select_related()` joins. | None. |
| M-Pesa payment initiation and callback | **Done** (sandbox) | `backend/apps/payments/services.py`, `views.py`; `test_payment_api.py::test_mpesa_callback_success_is_idempotent`, `::test_mpesa_callback_with_wrong_amount_cannot_complete_payment`, `::test_mpesa_malformed_callback_is_rejected`. | Live Daraja credentials and one low-value live payment remain a launch blocker. |
| Card gateway callback (stub) | **Done** | `test_payment_api.py::test_card_callback_is_idempotent_and_logged`, `::test_card_callback_requires_secret_when_configured`, `::test_card_callback_failure_marks_payment_failed`. | None for the stub. Live gateway unverified. |
| Bank transfer extends the hold | **Done** | `test_payment_api.py::test_bank_transfer_extends_hold_beyond_stay_hold`. | Confirm real bank details with the hotel. |
| Webhook idempotency and replay protection | **Done** | `PaymentWebhookEvent` unique `(provider, event_id)` (`payments/models.py:83-101`); `test_payment_initiation_is_idempotent`, `test_mpesa_callback_success_is_idempotent`, `test_card_callback_is_idempotent_and_logged`. | None. |
| Late money is flagged for review, not silently accepted | **Done** | `Payment.requires_review` / `review_reason` (`payments/models.py:60-64`); `test_payment_received_after_booking_expired_is_flagged_for_review`. | None. |
| Payment report / export | **Done** | `backend/apps/integrations/views.py:121-240` (JSON + CSV, masked phones, formula escaping); `test_reports.py::test_director_and_data_manager_can_export_json_and_csv`, `::test_other_roles_cannot_export_guest_data`, `::test_phones_are_masked_in_json_and_csv`. | PDF/HotelPlus export exists but was not exercised by the test run. |
| Guest manage-booking lookup | **Done** | `backend/apps/bookings/views.py:180-219`; `frontend/src/pages/BookingManagePage.tsx:68-167`; `BookingManagePage.test.tsx`; `test_booking_api.py::test_lookup_requires_matching_contact`. | None. |
| Guest cancellation with deadline rules | **Done** | `views.py:222-268`; `services/bookings.py::cancel_booking`; `test_booking_api.py::test_cancel_booking`, `::test_confirmed_booking_cannot_be_cancelled_after_deadline`, `::test_confirmed_booking_can_be_cancelled_before_deadline`; `BookingManagePage.tsx:146-167`. | None. |
| Production cannot simulate payments | **Done** (code) | `backend/apps/payments/production.py:15-55`; `config/settings/prod.py:9-32`; `test_production_settings.py::test_unsafe_production_payment_settings_refuse_to_start`, `::test_mpesa_callbacks_need_a_secret_or_an_ip_allowlist`. | `manage.py check --deploy` with real production env is unverified. |

### 2.2 Facilities

| Requirement | Status | Evidence | Action |
| --- | --- | --- | --- |
| Restaurant table booking with live availability | **Done** | `backend/apps/facilities/views.py`, `services.py`; `frontend/src/pages/DiningPage.tsx:125-188`; `DiningPage.test.tsx`; `test_facility_emails.py::test_table_confirmation_emails_and_texts_the_guest`. | None. |
| Coffee shop has **no** booking | **Done** | `/dining?venue=coffee` renders a read-only panel (hours, walk-in policy, contact, WhatsApp) with no form (`DiningPage.tsx`); the slots query is disabled for that venue; the form state resets when switching venues. Backend rejects `venue=coffee` in `TableBookingCreateSerializer.validate_venue` and `create_table_booking`, persists `TableBooking.venue` (migration `0002_tablebooking_venue`), and excludes non-restaurant rows from seat capacity. `backend/apps/facilities/tests/test_table_booking_venue.py` (5 tests) and `DiningPage.test.tsx` (6 tests) cover both sides. | None. |
| Conference is enquiry-only | **Done** | `ConferenceEnquiry` has `PENDING` default (`facilities/models.py:87-107`); `ConferencePage.tsx`; `ConferencePage.test.tsx`; front desk confirms/declines in `frontdesk/services.py`. | Confirm the half-day/full-day prices (flagged below). |
| Gym day pass with QR token | **Done** | `GymDayPass.qr_token` (`facilities/models.py:183`); QR issuance in `facilities/services.py:246-247` and `payments/services.py:276-277`; public QR endpoint `facilities/views.py:299-306`; `test_frontdesk_api.py::test_gym_confirmation_issues_qr_and_undo_clears_reception_payment`. | None. |
| One gym day-pass price, KES 500 | **Done** | `HotelSetting.gym_day_pass_price` default and seed are 500; `frontend/src/config/prices.ts` exports `GYM_DAY_PASS_PRICE = 500`; Gym/Facilities pages read the live API price and fall back to 500; translations contain no `1,000`; `backend/apps/common/tests/test_gym_price.py` has 4 passing checks against backend, seed, frontend config and i18n. Price remains editable in admin and flagged for hotel confirmation. | Hotel must confirm the amount before launch. |
| Menus editable by marketing in EN and SW | **Done** | Backend supports it: `MenuItem.name_en/name_sw/description_en/description_sw` (`facilities/models.py:8-31`), staff CRUD gated by `CanManageContent` (`staff_views.py:26-32`), public `/facilities/menu/` (`views.py:315-334`), Django admin (`facilities/admin.py:13`). `DiningPage.tsx` now renders `useMenu({ venue })`, chooses `name_sw`/`description_sw` when the language is Swahili (English fallback), formats the API price, and keeps the checked-in `MENU_ITEMS` only as an offline/empty-CMS fallback. `DiningPage.test.tsx` proves an edited CMS item appears in EN and SW and that the fallback renders when the API fails. Seed items are still sample prices flagged `needs_confirmation=True`. | Hotel must review and confirm every seeded price/description in Django admin. |

### 2.3 Front desk and notifications

| Requirement | Status | Evidence | Action |
| --- | --- | --- | --- |
| Queue polls every 5 seconds | **Done** | `frontend/src/lib/query/hooks.ts:352` (`refetchInterval: 5_000`); dashboard `useFrontDeskQueue({ poll: true })` (`DashboardPage.tsx:569`). Activity feed polls at 3 s (`hooks.ts:291`). | None. |
| New-item **sound opt-in** | **Missing** | No audio element, `Audio()` or mute/volume control in `DashboardPage.tsx`; only visual counters/badges. | Add a muted-by-default opt-in with persisted preference and a test. |
| Hold countdown | **Done** | `DashboardPage.tsx:57-63` (`formatCountdown`), countdown rendered per queue item; test coverage in `DashboardPage.test.tsx`. | None. |
| Undo (with closing window) | **Done** | `frontdesk/services.py:230-293`; `hooks.ts:379`; `test_frontdesk_api.py::test_booking_confirm_marks_bank_transfer_paid_and_undo_reverses`, `::test_undo_is_rejected_after_the_window_closes`. | None. |
| Activity log | **Done** | `frontdesk/services.py:364-389`; `test_frontdesk_api.py::test_activity_returns_recent_actions`; rendered in `DashboardPage.tsx`. | None. |
| 8-minute escalation | **Done** (code/test) | `HotelSetting.frontdesk_escalate_minutes` default 8 (`common/models.py:73`); `frontdesk/services.py:395-464`; `test_frontdesk_api.py::test_escalation_alerts_manager_once_for_overdue_items`; schedule in `common/management/commands/setup_schedules.py:30`. | The scheduled job was not run end to end; verify in staging (Step 3). |
| Booking confirmation/cancellation/reminder notifications | **Done** | `notifications/services.py:111-193`, `reminders.py`; `test_booking_emails.py::test_booking_confirmation_email_includes_manage_link`; EN/SW templates. | Live SMTP test pending. |
| Table/conference guest notifications | **Partial** | `notifications/services.py:216-261` explicitly documents English-only because `TableBooking`/`ConferenceEnquiry` have no language field; tests `test_facility_emails.py`. | Add `language` fields, migration, templates and tests (Step 2.3). |
| Exports (payments, occupancy, HotelPlus) | **Done** | `integrations/views.py:87-271`; `test_reports.py` (10 tests); role gate `CanExportGuestData` (`accounts/permissions.py:49-50`). | Confirm the accounting format with finance in UAT. |

### 2.4 Language, SEO and content

| Requirement | Status | Evidence | Action |
| --- | --- | --- | --- |
| EN/SW UI and persisted language choice | **Done** | `frontend/src/i18n.ts` (full dictionary, `localStorage`, `hotel:languagechange`), `LanguageSwitch.tsx`; tests in `Page.test.tsx` / page tests. | Native Swahili review remains a hotel blocker. |
| `/sw/` URL routing on every route | **Missing** | `App.tsx:59-74` has one route table with no language prefix; language is client-side state only. No `/sw/` entry in `dist/sitemap.xml`. | Add URL-based language routing and a shared route manifest (Step 2.3–2.4). |
| hreflang and per-language canonical URLs | **Missing** | `index.html:13-17` has one canonical; `components/Page.tsx:32-35` rewrites the same canonical; no `rel="alternate"` tags. | Generate canonical + `hreflang` for each route/language. |
| Per-language sitemap entries | **Missing** | `vite.config.ts:56-66` hard-codes 9 paths; generated `dist/sitemap.xml` has 9 English URLs only. | Generate from the shared route manifest, including `/sw/`. |
| Sitemap/robots cannot drift from the router | **Missing** | Router list and sitemap list are maintained separately (`App.tsx` vs `vite.config.ts`); no test. | One shared manifest consumed by router, sitemap and tests. |
| Unique title/description/OG per page | **Done** | `Page.tsx:6-42`; `usePageMeta` on every page; brand injection and JSON-LD in `vite.config.ts:1-49`. | Prerender the tags for crawlers (Step 2.5). |
| Prerendered marketing pages | **Missing** | SPA with `vercel.json` rewrite to `index.html`; no SSG/prerender dependency or config. | Add `vite-react-ssg` (or equivalent) for Home, Rooms, Facilities, Dining, Conference, Gym, Offers, Blog index, Contact, Privacy, Terms in EN and SW. |
| Blog index and post pages | **Missing** | API exists (`content/urls.py:11-12`), but no frontend `/blog` route, page or `useBlog` hook. | Add the routes/pages required for prerendering the blog index. |
| Privacy policy and Terms pages, CMS-editable EN/SW, seeded placeholders | **Done** | New `PolicyPage` model (`content/models.py`), Django admin, public `GET /api/v1/content/policies/<slug>/` (`content/views.py`, `urls.py`); seed creates `/privacy` and `/terms` drafts in EN/SW and sets `privacy_notice_version = 2026-11-draft` (`seed_hotel.py`). Frontend `PolicyPage.tsx` renders CMS text by language, shows a draft badge, and is routed at `/privacy` and `/terms`; footer and the booking consent label link to both. `PolicyPage.test.tsx` covers EN, SW and API failure. Wording is still a draft pending hotel/legal review. | Hotel/legal must approve the wording and clear `needs_confirmation`. |
| Consent records (what, when, text version) | **Done** | New immutable `ConsentRecord` (`common/models.py`, migration `0005_consentrecord`) stores scope, subject, reference, language, `policy_version`, `policy_url`, optional `text_hash` and `created_at`; read-only in Django admin. `common/consent.py` snapshots the live `HotelSetting` version. Room bookings write `booking_privacy` plus `newsletter` when marketing consent is ticked; newsletter subscribe writes `newsletter`; the frontend newsletter form now calls the API instead of faking success. `test_consent.py` (3 tests) proves the records and the no-consent rejection. | Consent wording/version must be finalised before launch; `text_hash` stays empty until the full policy text is passed to the helper. |
| Localized dates, numbers and KES | **Done** | `i18n.ts:1370-1390` (`Intl.DateTimeFormat` switches `sw-KE`/`en-GB`, `Intl.NumberFormat('en-KE')`); `formatClock` in `DashboardPage.tsx:75`; tests cover both languages. | Number locale is fixed to `en-KE`; acceptable because Kenyan digit grouping is identical, but review with marketing. |
| Analytics is opt-in and does not double count | **Done** | `frontend/src/lib/analytics.ts` (loads only with `VITE_ANALYTICS_DOMAIN`, manual pageviews queued); `analytics.test.ts`; `RouteAnalytics` in `Page.tsx:54-59`. | None. |
| Production CSP | **Missing** | No `Content-Security-Policy` in settings, proxy config or `vercel.json`; no CSP package in requirements. | Define API/analytics/fonts/maps policy; ship report-only, test, document enforcement (Step 2.6). |

### 2.5 Quality, security and operations

| Requirement | Status | Evidence | Action |
| --- | --- | --- | --- |
| Accessibility (WCAG AA) | **Partial** | Semantic landmarks/skip target (`App.tsx:43`), labelled fields, focus-visible styles (`main.css`), `aria-live` status regions; no axe dependency/config despite `axe-core` being installed; no keyboard-only run recorded. Home/Rooms/Facilities/Offers/Contact have no component tests. | Add axe tests in EN/SW for the named pages and a keyboard booking walkthrough; fix findings (Step 2.7). |
| Motion: transform/opacity only, 150–350 ms ease-out | **Partial** | Most transitions are transform/opacity, but image zooms use `duration-500/700` (`HomePage.tsx:309,403`, `RoomsPage.tsx:142`, `FacilitiesPage.tsx:125`, `OffersPage.tsx:268`); `transition-all` in `BookingPage.tsx:705`. | Normalize to 150–350 ms ease-out and remove layout-affecting transitions. |
| Complete `prefers-reduced-motion` fallback | **Partial** | Global override at `main.css:43-56` (0.01 ms, single iteration); no automated test. | Add a reduced-motion test (Step 2.8). |
| Lighthouse mobile ≥ 85 on Home, Rooms, Booking | **Unverified** | Not run in this environment; no Lighthouse config/report in the repo. | Build, serve `dist`, run Lighthouse mobile, record scores, fix (Step 2.9). |
| Role permissions | **Done** | `accounts/permissions.py` capability classes; `test_auth.py::test_role_capabilities`; `test_frontdesk_api.py::test_queue_requires_manage_bookings_permission` (marketing → 403); `test_reports.py::test_other_roles_cannot_export_guest_data`. | Add explicit "marketing cannot see bookings/guest data" security tests in Step 2.11. |
| Throttles and honeypots | **Unverified** | Throttle scopes are set on public booking/lookup endpoints (`bookings/views.py:101,118,184,226`); no dedicated test found for throttle limits or honeypot rejection. | Add tests (Step 2.11). |
| Demo users cannot exist in production | **Unverified** | No production check found that rejects seeded/demo accounts. | Add a production guard and test. |
| Production guards: DEBUG off, ALLOWED_HOSTS, real email backend | **Done** (code) | `config/settings/prod.py:9-17,35-52`; `test_production_settings.py`. | Exercise `manage.py check --deploy` with the production env in staging. |
| CI runs backend, frontend and Postgres concurrency tests | **Done** | `.github/workflows/ci.yml` runs a backend job against a `postgres:16-alpine` service (system checks, migration drift, full `pytest`) and a frontend job (`npm ci`, typecheck, lint, unit tests, brand check, production build). The local Postgres run of the same suite is **88 passed** (no skips). Playwright specs are tracked in the next row. | None. |
| Playwright E2E specs | **Missing** | `@playwright/test` is a devDependency, but there is no `playwright.config.*`, `frontend/e2e/` or spec. | Add the seven specs and run in CI. |
| Production-like staging (app, Postgres, qcluster, proxy) | **Missing** | No `docker-compose*.yml`, Dockerfile or proxy config in the repo. | Build staging stack and smoke script (Step 3). |
| Backup/restore tested | **Missing** | Documented as a launch checklist item (`docs/LAUNCH-CHECKLIST.md:108`), no script or drill. | Add backup/restore procedure and execute a restore (Step 3). |
| Error monitoring and structured safe logs | **Missing** | No Sentry hook; standard Django logging only. | Add Sentry-compatible hooks (off by default) and structured logs without guest/card data (Step 3). |
| Data retention and guest export/delete procedure | **Partial** | `HotelSetting.data_retention_months` default 24 (`common/models.py:119`); procedure not documented or automated. | Document and test export/delete routine (Step 3). |
| Staff "Content needing confirmation" page | **Missing** | `needs_confirmation` flags exist on CMS/facility models; no staff page aggregates them. | Add the staff page (Step 3). |
| Documentation | **Partial** | `README.md`, `docs/LAUNCH-CHECKLIST.md`, `docs/DEPLOYMENT.md`, `docs/SECURITY.md` exist; this acceptance report is new. No UAT script or changelog yet. | Add `docs/UAT-SCRIPT.md` and `CHANGELOG` in Steps 4–5. |
| Release candidate PR + tag | **Pending** | Branch `feat/finish-frontend` is 12 commits ahead of `main`; no PR/tag yet. | Step 5, only after the gaps above are closed. |

## 3. Verdict

**Not ready for `v0.1.0-rc1`.** The core booking, payment, front-desk and reporting logic is implemented and covered by the existing suites, but the release definition of done is blocked by:

1. No `/sw/` routing, hreflang, per-language canonicals or sitemap.
2. No prerendering, no blog index.
3. No CSP, axe tests, reduced-motion test or Lighthouse evidence.
4. No Playwright, staging stack, backup/restore, monitoring or content-confirmation page.
5. Missing table/conference guest language fields.
6. No UAT script, changelog, PR or tag.

## 4. Hotel decisions that remain unresolved (not decided by engineering)

| Flag | Current state | Do not change without the hotel |
| --- | --- | --- |
| Location/contact | Kapenguria placeholders in `config/hotel.ts`; source material also says Westlands/Nairobi | Address, town, county, map pin, phone, WhatsApp, email |
| Facility names | Tulia Restaurant, Jacaranda Café, Kilele Hall, Westside Fitness | Names and spellings |
| Prices and claims | `claims_verified=False`; prices marked "pending" | Every room/menu/offer/conference/gym price |
| Conference half/full day | 8,000 / 15,000 look swapped | Correct mapping |
| Swahili | `sw` strings are machine-translated | Native speaker review |
| Gym price | Backend charges 500; copy says 1,000 | Confirm 500 (Step 2 assumes KES 500 as instructed) |

## 5. Next steps (after approval)

Proceed in this order: Step 2.1–2.11 (privacy/terms + consent, gym price, language fields + `/sw/`, route manifest/sitemap, prerender, CSP, accessibility/motion/Lighthouse, Postgres/Playwright/CI, security tests), then Step 3 staging/operations, Step 4 UAT kit, Step 5 PR + `v0.1.0-rc1` tag. No merge and no production deployment.
