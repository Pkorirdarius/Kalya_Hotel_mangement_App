# UAT script — `v0.1.0-rc1`

**Audience:** hotel director, front desk lead, marketing/translations lead, ICT/deployment owner.  
**Environment:** staging only. This script must **not** be run against production.  
**Branch under test:** `feat/finish-frontend`. Record the commit SHA and CI run from the acceptance report before starting.  
**Rule:** every **BLOCKER** in `docs/LAUNCH-CHECKLIST.md` stays open until a named owner signs it off here. Do not clear a `needs_confirmation` flag, change a price, or change `privacy_notice_version` just to make UAT pass.

## 0. Preconditions

| # | Check | Pass criteria | Evidence |
| --- | --- | --- | --- |
| 0.1 | Staging stack is up | `db`, `web`, `worker` and `proxy` are healthy; `GET /api/v1/health/` returns 200 with `"database": true`. | Screenshot or curl output |
| 0.2 | Settings | `DJANGO_SETTINGS_MODULE=config.settings.staging`, `DEBUG=False`, `NUM_PROXIES=1`, `USE_SQLITE=false`. | `.env.staging` / compose config |
| 0.3 | No live credentials | `PAYMENTS_SANDBOX=true`, `PAYMENT_SIMULATION_ALLOWED=false` or sandbox-only, console/stub email and SMS. No real M-Pesa, card, SMTP or SMS keys. | Config review |
| 0.4 | Staff accounts | One director, one front desk, optionally one data manager; unique passwords; roles verified against `docs/SECURITY.md`. | Account list (no passwords) |
| 0.5 | Seed state | `seed_hotel` has been run once. All sample content/claims remain `needs_confirmation=True` / `claims_verified=False`. | Admin screenshots |
| 0.6 | CI green | The three CI jobs (backend/Postgres, frontend, Playwright E2E) are green for the commit under test. | CI run link |
| 0.7 | Build artifacts | `frontend/dist` contains 24 prerendered `index.html` files and `prerender-report.json`. | `npm run build` output |

## 1. Public content, language and SEO (C7–C10)

| # | Step | Expected result | Pass? / Notes |
| --- | --- | --- | --- |
| 1.1 | Open `/`, `/rooms`, `/facilities`, `/dining`, `/conference`, `/gym`, `/offers`, `/blog`, `/contact`, `/privacy`, `/terms` in English. | Pages load, titles/descriptions are unique, hotel name is correct, no hard-coded brand names, no console errors. | |
| 1.2 | Open the same paths under `/sw`. | Swahili copy appears; dates use `sw-KE`; KES prefix is kept; `/sw/<unknown>` shows a translated 404. | |
| 1.3 | Use the EN ⇄ SW switcher on `/rooms?checkin=…` with a URL fragment. | URL prefix changes, query and hash are preserved, content changes language. | |
| 1.4 | Clear `localStorage.hotel.language` to `en`, then directly open `/sw/rooms`. | Page stays Swahili. A stored preference never redirects a direct visit or crawler. | |
| 1.5 | View source (JavaScript disabled) of `/rooms`, `/sw/rooms` and `/blog/{published-slug}`. | Static routes contain H1, canonical, reciprocal `hreflang` and JSON-LD. `/blog/{slug}` uses the app shell and loads CMS data after hydration. | |
| 1.6 | Inspect `robots.txt` and `sitemap.xml`. | EN/SW URLs with reciprocal alternates; `/dashboard`, `/sw/dashboard`, `/booking/manage` and `/sw/booking/manage` disallowed and absent from the sitemap. | |
| 1.7 | Publish one CMS blog post in EN and SW, run `python scripts/refresh_blog_routes.py`, rebuild, then open `/blog/{slug}` and `/sw/blog/{slug}`. | Both variants render CMS copy; English falls back when SW is absent; slugs appear in the sitemap. | |
| 1.8 | Open `/privacy` and `/terms`. | Draft badge and `needs_confirmation` copy are visible; `privacy_notice_version` matches the seeded draft. Do not sign off until legal review is complete. | |

## 2. Rooms, booking and guest manage-booking

| # | Step | Expected result | Pass? / Notes |
| --- | --- | --- | --- |
| 2.1 | Search availability for a future date; quote one room. | Live rooms/meal plans load; quote matches the admin rate; no sold-out room can be added. | |
| 2.2 | Create a hold and let it expire. | Hold countdown is visible; expired inventory is released; no payment is taken. | |
| 2.3 | Complete sandbox payment simulation / bank transfer selection. | Status moves to `pending_payment` then `pending_confirmation`; no real money moves. | |
| 2.4 | Look up the booking by reference + email, then by reference + phone. | Lookup succeeds; mismatched contact data is rejected generically. | |
| 2.5 | Cancel before the cutoff, then try a confirmed booking after the cutoff. | Pre-cutoff cancel succeeds; post-cutoff cancel is refused with the policy message. | |
| 2.6 | Submit a public form instantly (bot-like) and from two different IPs. | Honeypot/bot submissions get no write; real-speed submissions work; the same fake IP is throttled and a different IP is not. | |

## 3. Facilities

| # | Step | Expected result | Pass? / Notes |
| --- | --- | --- | --- |
| 3.1 | Book a restaurant table for a future slot in EN and SW. | Reference is returned; confirmation email/SMS use the submitted UI language. | |
| 3.2 | Open `/dining?venue=coffee`. | Walk-in copy only; no booking form; API rejects `venue=coffee`. | |
| 3.3 | Submit a conference enquiry in EN and SW. | Enquiry is `PENDING`; reference shown; session/layout labels and dates are localized. | |
| 3.4 | Reserve a gym day pass and open the QR endpoint. | One KES 500 price is shown; QR is issued and readable by front desk. | |
| 3.5 | Edit one menu item in Django admin in EN/SW, then reload the dining page. | Edited CMS copy appears; English falls back when SW is empty. | |

## 4. Front desk and reports

| # | Step | Expected result | Pass? / Notes |
| --- | --- | --- | --- |
| 4.1 | Log in as front desk and watch the queue for 10 seconds. | New items appear within ~5 s with a countdown; sound is not required. | |
| 4.2 | Confirm a booking, then use undo inside the window; try undo after the window. | Confirm and undo work; late undo is rejected. Undo also reverses the payment marker. | |
| 4.3 | Confirm a table, decline a conference, and confirm a gym pass. | Correct notifications are sent; QR is issued for the gym pass. | |
| 4.4 | Simulate an overdue item and run escalation once. | Manager is alerted once, not on every poll. | |
| 4.5 | As director/data manager, open overview, occupancy and payment reports; download CSV. | Totals match the bookings; phones masked; CSV opens in Excel without formula injection. | |
| 4.6 | As marketing/ICT, try to open booking/reports/queue endpoints. | Access is denied; content management still works for marketing. | |

## 5. Notifications and localization

| # | Step | Expected result | Pass? / Notes |
| --- | --- | --- | --- |
| 5.1 | Trigger booking confirmation, cancellation and reminder notifications. | EN and SW emails arrive; manage-booking link works; `NotificationLog` records delivery. | |
| 5.2 | Trigger table/conference confirmation, decline and next-day reminder in EN and SW. | No English month/day names in SW; session/layout labels are translated; unknown language falls back to `en`. | |
| 5.3 | Have a native Swahili speaker review every SW email, SMS and UI string. | No machine-translation artefacts; sign-off recorded below. **BLOCKER** until signed. | |
| 5.4 | Send live SMTP/SMS tests in staging with the final credentials after provisioning. | Messages arrive from the configured sender/id. **BLOCKER** until signed. | |

## 6. Staff “Content needing confirmation” page (E4)

| # | Step | Expected result | Pass? / Notes |
| --- | --- | --- | --- |
| 6.1 | From `/dashboard`, open the “Content needing confirmation” link. | `/content-review` (and `/sw/content-review`) loads outside the public site layout and is `noindex`. | |
| 6.2 | With a director/marketing account, read the list and counts. | Rows are grouped by blog posts, offers, policies, reviews, rooms and menu items; newest first; limit is respected. | |
| 6.3 | Try the API as an unauthenticated user and as front desk. | 401/403; no content is leaked. `GET /api/v1/staff/common/content-confirmation/` is read-only. | |
| 6.4 | Confirm one item in Django admin, then reload the page. | The row disappears from the list; no flag was changed by the staff page itself. | |
| 6.5 | Walk the P0 decision list in `docs/LAUNCH-CHECKLIST.md` using this page. | Every item has an owner and a decision; flags and prices are changed only after sign-off. | |

## 7. Operations and release readiness (E1–E3, E5)

| # | Step | Expected result | Pass? / Notes |
| --- | --- | --- | --- |
| 7.1 | `python scripts/check_staging_stack.py`; `python manage.py check --settings=config.settings.staging`; `docker compose -f docker-compose.staging.yml config --quiet`. | All pass; CI records the same checks. | |
| 7.2 | `python scripts/staging_smoke.py --api-base <staging API> --site-base <staging site>`. | Health, prerendered HTML, CSP header and throttle identity checks pass. Only point this at staging. | |
| 7.3 | Run `python scripts/postgres_backup_restore.py backup --db hotel --file backup.dump`, then restore into a scratch DB. | Marker row and tables are restored; application DB is untouched; scratch DB is dropped after the drill. | |
| 7.4 | Set `SENTRY_DSN` to a test project (or leave empty), set `LOG_FORMAT=json`, trigger a 500. | With DSN empty there is no network call; with JSON logs the event has no phone/email/card values. | |
| 7.5 | Run `python manage.py apply_retention --dry-run`, then have ICT review counts before any `--apply`. | Dry run writes nothing; `--apply` deletes expired `FormGuardEvent` rows and anonymises `AuditLog`/`NotificationLog` rows. | |
| 7.6 | Check CSP in browser developer tools. | `Content-Security-Policy-Report-Only` present; no enforcing header; violations reviewed before enforcement is enabled. | |
| 7.7 | Verify qcluster is supervised and `/api/v1/health/` is monitored. | Worker restarts on failure; alerts fire on failed health checks. | |

## 8. Accessibility and performance spot checks (D1–D5)

| # | Step | Expected result | Pass? / Notes |
| --- | --- | --- | --- |
| 8.1 | Keyboard-only pass: skip link, booking form, dialogs, dashboard actions. | Focus is visible and logical; skip link is the first stop; no keyboard trap. | |
| 8.2 | Screen-reader spot check on booking and manage-booking. | Labels, errors and status messages are announced. | |
| 8.3 | Enable `prefers-reduced-motion: reduce`. | Animations/transitions stop or resolve in ≤1 ms. | |
| 8.4 | Re-run Lighthouse mobile on `/`, `/rooms`, `/booking` after final content is applied. | Performance ≥85; accessibility, best practices and SEO 100 on stable runs. | |
| 8.5 | Test 360 px, 390 px and tablet widths. | No horizontal scroll; touch targets usable. | |

## 9. UAT verdict and sign-off

UAT passes only when:

- all scenarios above are marked pass or have an approved, owner-dated exception;
- every **BLOCKER** in `docs/LAUNCH-CHECKLIST.md` is closed and signed below;
- the commit under test has a green CI run and no merge/deploy to production has occurred.

| Role | Name | Scenarios owned | Decision (pass / fail / exception) | Date |
| --- | --- | --- | --- | --- |
| Hotel director | | 2, 4, 6, 9 | | |
| Front desk lead | | 3, 4, 5 | | |
| Marketing / translations | | 1, 3, 5, 6 | | |
| ICT / deployment | | 0, 7, 8 | | |

**Release decision:** ☐ Go / ☐ No-go. If Go, record the exact commit SHA, CI link and the remaining production-only steps (live payment/SMTP credentials, DNS/TLS, monitoring alerts) in `docs/ACCEPTANCE-REPORT.md`. Do not merge or deploy to production as part of UAT.
