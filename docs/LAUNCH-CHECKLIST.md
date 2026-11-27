# Launch checklist

This checklist is the single place to track everything that must be true before
the West Premier Hotel site takes a real booking. Items marked **BLOCKER** must
be closed and signed off; the site deliberately fails closed while they are
open (for example `HOTEL_CLAIMS_VERIFIED=false` hides unverified claims).

Brand values live in exactly three places:

| Layer | Source of truth |
| --- | --- |
| Frontend | `VITE_HOTEL_*` build-time variables (see `.env.example`), with defaults in `frontend/src/config/hotel.ts`; translatable copy in `frontend/src/i18n.ts` |
| Backend settings | `HOTEL_*` variables in `.env` (see `.env.example`) |
| Editable CMS values | `HotelSetting` record in Django admin (`/admin/`) |

Update all three, then run `npm run check:brand` from `frontend/`. Production
also refuses to start while the unconfirmed phone/email/address/map placeholders
remain (see `backend/apps/common/production.py`).

## 1. P0 — must be closed before launch

"TBC" means no person has been nominated yet; a role is not a sign-off. Record
the actual name and date in `docs/UAT-SCRIPT.md` and attach the verification
evidence before changing any status to **Done**.

| # | Item | Status | Owner | Verification / evidence |
| --- | --- | --- | --- | --- |
| 1 | **Location is contradictory** — the source material contains both a Westlands/Nairobi address and a Westlands/Kapenguria address. The site currently renders Kapenguria, West Pokot placeholders. | **BLOCKER** | Hotel management — TBC | Written town, county, street address and map pin; `HOTEL_TOWN`, `HOTEL_COUNTY`, `HOTEL_ADDRESS`, `HOTEL.location.*`, `HotelSetting` and map embed all match; contact/map screenshot. |
| 2 | **Phone, WhatsApp and email are placeholders** (`+254 20 765 4321`, `254712345678`, `stay@westpremierhotel.co.ke`). | **BLOCKER** | Hotel front office — TBC | Live call, WhatsApp message and email; `HOTEL_PHONE`, `HOTEL_PHONE_HREF`, `HOTEL_EMAIL`, `HotelSetting` and `HOTEL.contact` match. |
| 3 | **Social links point at generic domains** (`facebook.com`, `instagram.com`, `x.com`, `linkedin.com`). | **BLOCKER** | Marketing — TBC | Each `HOTEL.socials` link opens the hotel's real profile, or the account is removed; screenshot of footer. |
| 4 | **Gym name is unconfirmed** — Westside Fitness. Confirmed by the hotel: Tamarind Restaurant, C&K café, three conference halls (Kopoch Hall, The Attelo Hall, Executive Board Room) and four room types (Superior, Deluxe, Twin, En-suite). | OPEN | Hotel operations — TBC | Written gym name and spelling; `facility.*` EN/SW copy updated and reviewed. |
| 5 | **Remaining prices are unconfirmed** — menu items (`needs_confirmation=True`), offers, conference half/full day (8,000 / 15,000) and gym day pass. Room board rates are now confirmed: Superior/Deluxe/Twin BB 7,000, HB 8,500, FB 10,000; Executive Suite (En-suite) BB 10,000, HB 11,500, FB 13,000 — each for one guest, plus KES 1,500 per extra guest per night. | **BLOCKER** | Hotel management + Marketing — TBC | Signed price list; admin rows corrected and `needs_confirmation` cleared; `test_board_rates.py` green. |
| 6 | **Gym price needs confirmation** — the site, seed and backend now use one value: KES 500 per day (`HotelSetting.gym_day_pass_price`, `frontend/src/config/prices.ts`). | **BLOCKER** | Hotel management — TBC | Written current rate; `HotelSetting`, seed and frontend fallback agree; `test_gym_price.py` green. |
| 7 | **Unverified marketing claims** — "best rate guaranteed", airport transfers, review scores and similar copy are gated behind `claims_verified=False`. | **BLOCKER** | Marketing + Legal — TBC | Claim-by-claim approval; `HOTEL_CLAIMS_VERIFIED=true` and `HotelSetting.claims_verified`; screenshot of gated copy. |
| 8 | **Swahili is machine-translated** — all `sw` strings in `frontend/src/i18n.ts` and seed content. | **BLOCKER** | Native speaker / Marketing — TBC | Signed review of UI strings, seeded CMS text and EN/SW messages; UAT step 5.3. |
| 9 | **Payment credentials are missing** — M-Pesa Daraja keys, card gateway, bank account details, callback secrets. Production refuses to start until the guards in `backend/apps/payments/production.py` pass. | **BLOCKER** | ICT + Hotel finance — TBC | `manage.py check --deploy --settings=config.settings.prod` green; callback/SMS tests and a staged sandbox transaction recorded. |
| 10 | **Email and SMS credentials are missing** — the console email backend and stub SMS provider are development-only. Production refuses to start with the console email backend. | **BLOCKER** | ICT — TBC | SMTP/SMS live tests for every template; `NotificationLog` rows; production startup guard green. |
| 11 | **Privacy, terms and cancellation are still drafts** — `/privacy`, `/terms` and `/cancellation` are editable CMS `PolicyPage` rows seeded in EN and SW. Pending approval (`needs_confirmation=True`, `privacy_notice_version=2026-11-draft`) is hidden from guests: the public API returns 404 and the page shows only a contact link. Staff see the state in Django admin and `/content-review`. | **BLOCKER** | Hotel + Legal — TBC | All three rows approved in EN/SW, version bumped, public text visible and drafts return 404; consent links checked. |
| 12 | **Staff accounts and roles** — at least one director, one front desk and (optionally) one data manager account. | **BLOCKER** | ICT — TBC | `create_staff_from_csv` dry-run and import output; `changepassword` completed per account; capability matrix in UAT 4.6/4.7. |
| 13 | **Conference hall prices are contradictory** — the source lists half-day 15,000 / full-day 8,000, while seeded admin values are half-day 8,000 / full-day 15,000. The public API omits all conference prices and guests see "Request a quotation" until `HotelSetting.conference_prices_confirmed=true`. | **BLOCKER** | Hotel management — TBC | Written half-day, full-day and catering prices; admin values verified before `conference_prices_confirmed=true`; UAT 3.3. |
| 14 | **Legacy dinner plan is unconfirmed** — `HotelSetting.dinner_plan_enabled=false` hides "Dinner, bed & breakfast" from the booking wizard. The seeded supplement is a placeholder, not a confirmed rate. | **BLOCKER** | Hotel management — TBC | Written confirmation that the plan is or is not sold; if sold, rate in `MealPlan` and `dinner_plan_enabled=true`; UAT 2.7. |

Run the staged deployment and smoke checks from `docs/DEPLOY.md` only after this
table and the UAT sign-off are complete.

## 2. Payments

- [ ] Daraja production shortcode, passkey, consumer key/secret and public HTTPS
      callback URL configured.
- [ ] `PAYMENTS_SANDBOX=false`, `PAYMENT_SIMULATION_ALLOWED=false`,
      `MPESA_SIMULATE=false` in production.
- [ ] `MPESA_CALLBACK_SECRET` set **and** Safaricom IP allow-list
      (`MPESA_ALLOWED_IPS`) populated.
- [ ] If a card gateway is enabled, `CARD_GATEWAY` is not `stub` and
      `CARD_CALLBACK_SECRET` is set. The redirect flow must be tested end to end.
- [ ] Bank transfer details (`BANK_*`) match the hotel's real account.
- [ ] Refund route and who may trigger it documented with the hotel.
- [ ] One live low-value M-Pesa payment completed, matched to a booking, and
      refunded/reconciled by finance.
- [ ] Front desk staff trained on "mark bank transfer paid" and the 10-second
      undo. Understand that undo reverses the payment marker too.

## 3. Bookings and front desk

- [ ] Cancellation cutoff (`HOTEL_CANCELLATION_CUTOFF_HOURS`), hold TTL
      (`HOTEL_HOLD_TTL_MINUTES`), front desk target and escalation minutes
      confirmed in admin.
- [x] Room inventory uses the confirmed four types: 2 Superior (201, 202; room 202
      is multipurpose), 6 Deluxe, 1 Twin and 1 En-suite (203). Migration
      `rooms/0002_confirmed_room_slugs.py` renames legacy rows in place so existing
      bookings, rate plans and blocks keep their foreign keys. Run `manage.py
      migrate` before `manage.py seed_hotel` on every existing database; a stale
      local DB without `rooms_room` makes the availability endpoint return 500
      and the guest sees the retryable availability error.
- [x] Front desk can see every numbered room with a free/occupied status on the
      dashboard and change it from there. Migrations `rooms/0003_room.py`,
      `rooms/0004_seed_rooms.py` and `rooms/0005_all_available.py` create the
      records; `seed_hotel` keeps them in sync without resetting their status.
      Website availability is shown by category but reserves a specific numbered
      room for each active booking; a front-desk "occupied" room is excluded too,
      without double-counting a checked-in online guest.
- [ ] The hotel must supply the real Twin room number. Until then the front desk
      record is `TWIN-1`, clearly flagged as provisional in the dashboard.
- [x] Room board rates confirmed with the hotel (see P0 item 5). Guests see only
      the bed type and the one-guest bed-and-breakfast "from" price; physical
      room numbers and per-type counts are front-desk-only. A room type fades
      out with "Room not available — choose another room" when its live
      availability is zero **or** it is missing from the API response; other
      room types remain selectable. A genuine request failure still shows the
      retryable availability error.
- [ ] Guest booking lookup tested with reference + email and reference + phone.
- [ ] Front desk queue walks `pending_payment → pending_confirmation → confirmed`
      correctly, including undo.
- [ ] Dashboard shows the "New bookings" alert for room bookings received in the
      last 10 minutes (including ones already confirmed) and clears it after the
      window; the count comes from the staff-only queue endpoint.
- [ ] Table, conference and gym actions tested; stale items are rejected.
- [ ] Arrival reminders and escalation jobs run (see `setup_schedules`).
- [ ] Reports (`/staff/reports/overview|occupancy|payments`) verified for a
      director/data-manager account; CSV opens in Excel with correct totals.

## 4. Notifications

- [ ] Booking confirmation, cancellation and reminder emails tested in EN and SW.
- [ ] Manage-booking link in every booking email opens
      `/booking/manage?reference=...` and the lookup succeeds.
- [ ] Front desk escalation, new booking, payment review and contact-message
      emails reach the right inboxes.
- [ ] Table and conference guest emails **and SMS** tested in EN and SW for
      confirmation, decline and next-day reminders. New submissions carry the
      active UI language; legacy/unknown values fall back to English. Conference
      messages include the selected hall (available in staff views and the API);
      historical enquiries backfilled to Kopoch Hall by
      `facilities/0005_conferenceenquiry_hall.py`.
- [ ] `send_facility_reminders` is registered by `manage.py setup_schedules`
      and a dry run sends only tomorrow's confirmed tables/conferences.
- [ ] Swahili messages reviewed by a native speaker: session/layout labels and
      numeric dates must not fall back to English choice labels or month names.

**C7 note:** migrations `0003_guest_language` and `0004` add/index the guest
language and backfill existing rows to `en`; run migrations before enabling the
reminder schedule. Gym day-pass messages remain English-only because the gym
form does not collect a language — confirm with the hotel if that is acceptable.

## 5. Content and SEO

- [ ] Every page has a unique title and description; dashboard and manage pages
      are `noindex` (verified in `frontend/src/components/Page.tsx`).
- [ ] Each public page has a language-correct canonical plus `hreflang="en"`,
      `hreflang="sw"` and `hreflang="x-default"`; `og:url`/`og:locale` match the
      URL language. Noindex routes have no alternates.
- [ ] `HOTEL.websiteUrl` is the final domain; `robots.txt` / `sitemap.xml`
      generated at build point at it. The sitemap contains EN and SW URLs with
      reciprocal hreflang links; robots disallows dashboard and manage-booking
      in both languages.
- [ ] Blog posts come from the CMS (`/blog`, `/blog/{slug}`); run
      `python scripts/refresh_blog_routes.py` with `SITE_API_URL` set after
      publishing so dynamic post URLs enter the sitemap.
- [ ] `/sw/…` is served by the SPA fallback (Vercel, Netlify/Cloudflare and
      nginx) and shows translated copy plus translated 404s, not the English
      shell. A stored language preference never redirects a crawler away from
      the requested URL.
- [ ] JSON-LD `Hotel` block contains the confirmed address and phone.
- [ ] OG/Twitter cards preview correctly (use a link debugger after deploy).
- [ ] 404 page, favicon, sharing image and theme colour checked.
- [ ] Analytics is opt-in: leave `VITE_ANALYTICS_DOMAIN` empty unless the hotel
      approves Plausible (cookieless) and any required consent copy.
- [ ] Google reviews remain disabled until real reviews are imported and
      `HOTEL_GOOGLE_REVIEWS_ENABLED=true`.
- [ ] Every restaurant and coffee-shop menu item in Django admin has confirmed
      EN/SW names, descriptions and prices (`needs_confirmation` cleared) so the
      guest pages do not show placeholder copy.
- [ ] Coffee shop copy is confirmed as walk-in only; no table-booking form is
      shown and the API rejects `venue=coffee`.
- [ ] Hotel/legal review the seeded `/privacy`, `/terms` and `/cancellation`
      drafts, edit them in Django admin, bump `HotelSetting.privacy_notice_version`,
      and clear `needs_confirmation` on all three before launch. Guests must not
      see any wording until the flag is cleared.
- [ ] Confirm consent records are being written for bookings, booking marketing
      opt-ins and newsletter signups, and that the retention period matches the
      hotel's policy.
- [x] Staff “Content needing confirmation” page is available at
      `/content-review` (and `/sw/content-review`), linked from the dashboard and
      `noindex`. Its read-only API is restricted to `CanManageContent`; it lists
      all `needs_confirmation` rows without changing them. Green CI
      [45790520902](https://github.com/Pkorirdarius/Kalya_Hotel_mangement_App/actions/runs/45790520902).
      Use this page to drive the P0 decisions above.

**C8 note:** the URL now determines the active language. English is unprefixed;
Kiswahili is under `/sw`, including `/sw/dashboard`. The EN/SW switch preserves
the current path, query and hash but changes the prefix. LocalStorage is still
written for convenience, but a stored language never redirects a direct visit
or a crawler. KES amounts keep the `KES ` prefix and use `sw-KE` number
formatting in Kiswahili; dates use `sw-KE`/`en-GB`.

- [ ] `npm run build` produces 26 prerendered `index.html` files: the 13 static
      indexable routes in EN and under `/sw`. `dist/prerender-report.json`
      lists each path, language, title, description, canonical, hreflang set,
      H1 and JSON-LD `@id`.
- [ ] Every prerendered page has one H1 in the body, a unique EN/SW title,
      description, canonical, OG title/URL and JSON-LD `@id`, plus reciprocal
      `hreflang="en"`, `hreflang="sw"` and `x-default` links. The build fails if
      a critical page is missing or its metadata/H1 is empty or duplicated.
- [ ] The host serves the existing prerendered `index.html` for exact paths such
      as `/rooms`, `/sw/rooms` and `/sw/booking` **before** the SPA fallback;
      unknown paths still fall back to `dist/index.html`.
- [ ] Static copy is the fallback when the CMS/API is unreachable. After
      hydration, React Query refreshes live rooms, offers, blog and policy
      content; test this with the API blocked and then available.
- [ ] Dynamic `/blog/{slug}` pages are intentionally not prerendered. They use
      the SPA fallback and CMS data after hydration; refresh concrete slugs with
      `python scripts/refresh_blog_routes.py` before the build so they enter the
      sitemap. No route was dropped.
- [ ] Re-run `npm run build` after changing routes, page copy, metadata keys,
      translations or layout; `npm run prerender` only regenerates HTML from an
      existing `dist/index.source.html`. CI runs the full build on every push.

**C10 note:** the prerender set comes from
`INDEXABLE_ROUTES.filter((route) => !route.dynamic)`: `/`, `/rooms`, `/booking`,
`/facilities`, `/dining`, `/conference`, `/gym`, `/offers`, `/blog`, `/contact`,
`/privacy`, `/terms` and `/cancellation`, plus their `/sw` variants. Private
routes (`/dashboard`, `/booking/manage`) are not prerendered or indexable.

## 6. Accessibility and QA

- [ ] Manual keyboard-only pass: header, booking form, dialogs, dashboard actions.
      The automated skip-link/focus check passes; the full manual walkthrough is
      still a launch task.
- [ ] Screen-reader spot check on the booking and manage-booking flows.
- [x] Colour contrast checked in a real browser: Lighthouse reports no failing
      `color-contrast` audit and scores 100 accessibility on Home, Rooms and
      Booking.
- [x] `prefers-reduced-motion` verified — Playwright emulates `reduce` and both
      the nav transition and the entrance animation resolve in ≤1 ms.
- [x] Automated 360 px checks cover EN/SW `/rooms`, the booking room step and
      the dashboard room panel: no horizontal document scroll, visible primary
      controls, no axe A/AA violations. `e2e/phase8-visual-qa.spec.ts` runs in
      CI.
- [ ] Manual pass at 390 px and tablet widths; no horizontal scroll. The 360 px
      cases above are automated, but tactile review on real devices is still a
      launch task.
- [x] Lighthouse mobile run: Home 88/93, Rooms 88, Booking 90 performance;
      accessibility, best practices and SEO all 100 on the stable runs.
      `npm run build` also enforces static budgets for entry JS (500 KiB), total
      JS (800 KiB), CSS (80 KiB), prerendered HTML (64 KiB) and largest WebP
      (256 KiB); the latest build passes all five.
- [x] `axe-core` checks pass on Home, Rooms, Facilities, Offers, Contact and
      Booking in EN and `/sw`, plus a real-browser axe run on Home.
- [x] Motion budget enforced: interaction transitions 150–350 ms, transform /
      opacity only; indeterminate spinners stop under reduced motion.
- [x] All five automated checks green:
      `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`,
      `npm run check:brand`; backend `..\.venv\Scripts\python.exe -m pytest -q`.
      Latest: frontend 141 tests / 30 files, backend 247 passed / 1 skipped.

**Group D CI evidence:** motion [45211085265](https://github.com/Pkorirdarius/Kalya_Hotel_mangement_App/actions/runs/45211085265), axe/keyboard [45385570039](https://github.com/Pkorirdarius/Kalya_Hotel_mangement_App/actions/runs/45385570039), Playwright a–g [45403334223](https://github.com/Pkorirdarius/Kalya_Hotel_mangement_App/actions/runs/45403334223), Lighthouse/D4 [45781024001](https://github.com/Pkorirdarius/Kalya_Hotel_mangement_App/actions/runs/45781024001) and [45784395555](https://github.com/Pkorirdarius/Kalya_Hotel_mangement_App/actions/runs/45784395555), report-only CSP [45782053634](https://github.com/Pkorirdarius/Kalya_Hotel_mangement_App/actions/runs/45782053634). All three CI jobs (backend/Postgres, frontend, E2E) are green on each run. Full scores and audit notes are in `docs/ACCEPTANCE-REPORT.md` §§1.6–1.10.

**Group E CI evidence:** staging stack [45785986169](https://github.com/Pkorirdarius/Kalya_Hotel_mangement_App/actions/runs/45785986169), backup/restore drill and retention/monitoring [45790178207](https://github.com/Pkorirdarius/Kalya_Hotel_mangement_App/actions/runs/45790178207), staff content review [45790520902](https://github.com/Pkorirdarius/Kalya_Hotel_mangement_App/actions/runs/45790520902), UAT kit and axe stabilization [45795777125](https://github.com/Pkorirdarius/Kalya_Hotel_mangement_App/actions/runs/45795777125). All three jobs are green on each of these runs.

## 7. Operations

- [x] Report-only CSP is present on every frontend route (`frontend/vercel.json`),
      on API/admin responses (`apps/common/middleware.py`) and on the staging
      nginx proxy. Enforcement is deliberately off; review violations before
      enabling it.
- [ ] HTTPS enforced at the proxy; HSTS enabled; certificate renewal monitored.
      The staging example uses plain HTTP locally; set the four secure flags to
      true behind real TLS (see `docs/DEPLOYMENT.md`).
- [x] `NUM_PROXIES=1` matches the single staging nginx proxy that appends
      `X-Forwarded-For`; `scripts/staging_smoke.py` verifies the real client IP
      on a live stack.
- [ ] Run `python scripts/staging_smoke.py --api-base <staging API> --site-base
      <staging site>` against deployed staging: same client 429, different client
      401, spoofed left-hand `X-Forwarded-For` ignored. No live stack was
      available locally; this remains a UAT/ops task.
- [ ] Throttle counters use a shared `CACHES` backend, so limits are not
      multiplied by the number of web workers.
- [ ] Blocked forms watched after launch: check
      `GET /api/v1/staff/common/form-guard/summary/?days=7` (or the read-only
      admin list) and investigate a sudden `too_fast` rise, which means real
      guests are being asked to retry.
- [x] `scripts/postgres_backup_restore.py` provides backup/restore commands and
      a scratch-database drill; Postgres 16 CI proof on
      [45790178207](https://github.com/Pkorirdarius/Kalya_Hotel_mangement_App/actions/runs/45790178207).
- [ ] Schedule production/staging backups and run one real restore drill
      against a scratch database before launch.
- [x] `python manage.py qcluster` is a supervised `worker` service in
      `docker-compose.staging.yml` with one queue cluster.
- [ ] Verify the worker restarts after a container/host failure in live staging.
- [x] `/api/v1/health/` exists; `LOG_FORMAT=json` produces safe structured logs
      and `SENTRY_DSN` is an opt-in hook (off by default).
- [ ] Point logs/health at the host's alarm system and choose an error-tracking
      project; verify alerts without leaking guest data.
- [x] `manage.py apply_retention` exists and is dry-run by default; it deletes
      expired `FormGuardEvent` rows and anonymises `AuditLog`/`NotificationLog`
      rows only with `--apply`. `setup_schedules` installs no retention job, and
      `--apply` itself refuses to write until `RETENTION_APPLY_ENABLED=true`.
      CI dry run passed on
      [45790178207](https://github.com/Pkorirdarius/Kalya_Hotel_mangement_App/actions/runs/45790178207).
- [ ] Hotel must agree `HotelSetting.data_retention_months` (default 24) before
      an operator sets `RETENTION_APPLY_ENABLED=true` for the first `--apply` run.
- [ ] If `VITE_ANALYTICS_DOMAIN` is set, confirm the cookieless notice on
      `/privacy`; if it is empty, confirm no analytics notice and no script load.

## 8. Out of scope for this release

These were explicitly excluded and must not be implied on the site:

- Gym memberships and renewals (day passes only).
- Promo codes and discount engines.
- WhatsApp automation (the link opens WhatsApp; there is no bot).
- Live HotelPlus API access (manual CSV/PDF export only).
- OTA/channel-manager synchronisation.
- A native mobile app.

## Sign-off

Execute `docs/UAT-SCRIPT.md` before signing. The script records scenario-level
results and the go/no-go decision; this table records the final acceptance.

| Role | Name | Date |
| --- | --- | --- |
| Hotel director | | |
| Front desk lead | | |
| Marketing / translations | | |
| ICT / deployment | | |

**Release decision:** ☐ Go / ☐ No-go. The release PR and tag are deliberately
not created while any P0 blocker above is open. No merge to `main` and no
production deploy are part of this release-candidate work.
