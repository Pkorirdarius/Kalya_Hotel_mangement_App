# Launch checklist

This checklist is the single place to track everything that must be true before
the West Premier Hotel site takes a real booking. Items marked **BLOCKER** must
be closed and signed off; the site deliberately fails closed while they are
open (for example `HOTEL_CLAIMS_VERIFIED=false` hides unverified claims).

Brand values live in exactly three places:

| Layer | Source of truth |
| --- | --- |
| Frontend | `frontend/src/config/hotel.ts` and `frontend/src/i18n.ts` |
| Backend settings | `HOTEL_*` variables in `.env` (see `.env.example`) |
| Editable CMS values | `HotelSetting` record in Django admin (`/admin/`) |

Update all three, then run `npm run check:brand` from `frontend/`.

## 1. P0 — must be closed before launch

| # | Item | Status | Notes / owner |
| --- | --- | --- | --- |
| 1 | **Location is contradictory** — the source material contains both a Westlands/Nairobi address and a Westlands/Kapenguria address. The site currently renders Kapenguria, West Pokot placeholders. | **BLOCKER** | Confirm town, county, street address and map pin. Update `HOTEL_TOWN`, `HOTEL_COUNTY`, `HOTEL_ADDRESS`, `HOTEL.location.*`, `HotelSetting`, maps embed and `HOTEL.location.mapQuery`. |
| 2 | **Phone, WhatsApp and email are placeholders** (`+254 20 765 4321`, `254712345678`, `stay@westpremierhotel.co.ke`). | **BLOCKER** | Update `HOTEL_PHONE`, `HOTEL_PHONE_HREF`, `HOTEL_EMAIL`, `HotelSetting`, `HOTEL.contact`, and test a real call + email. |
| 3 | **Social links point at generic domains** (`facebook.com`, `instagram.com`, `x.com`, `linkedin.com`). | **BLOCKER** | Replace `HOTEL.socials` with the hotel's real profiles, or remove the accounts that do not exist. |
| 4 | **Facility names are unconfirmed** — Tulia Restaurant, Jacaranda Café, Kilele Hall, Westside Fitness. | **BLOCKER** | Confirm names and spelling. They remain translatable (`facility.*` keys); Swahili names need marketing approval. |
| 5 | **Sample prices are unconfirmed** — room rates, menu items (`needs_confirmation=True`), offers, conference half/full day (8,000 / 15,000) and gym day pass. The site currently shows "prices pending" placeholders in several cards. | **BLOCKER** | Confirm every amount, then clear `needs_confirmation` / replace placeholder labels. |
| 6 | **Gym price needs confirmation** — the site, seed and backend now use one value: KES 500 per day (`HotelSetting.gym_day_pass_price`, `frontend/src/config/prices.ts`). | **BLOCKER** | Confirm KES 500 is the current rate; change it only in `HotelSetting`, the seed and the frontend fallback together. `test_gym_price.py` fails if the values drift. |
| 7 | **Unverified marketing claims** — "best rate guaranteed", airport transfers, review scores and similar copy are gated behind `claims_verified=False`. | **BLOCKER** | Marketing/legal approve each claim, then set `HOTEL_CLAIMS_VERIFIED=true` and `HotelSetting.claims_verified`. |
| 8 | **Swahili is machine-translated** — all `sw` strings in `frontend/src/i18n.ts` and seed content. | **BLOCKER** | A native Swahili speaker / marketing must review every string before launch. |
| 9 | **Payment credentials are missing** — M-Pesa Daraja keys, card gateway, bank account details, callback secrets. Production refuses to start until the guards in `backend/apps/payments/production.py` pass. | **BLOCKER** | See "Payments" below and `docs/DEPLOYMENT.md`. |
| 10 | **Email and SMS credentials are missing** — the console email backend and stub SMS provider are development-only. Production refuses to start with the console email backend. | **BLOCKER** | Configure SMTP, `DEFAULT_FROM_EMAIL`, `FRONT_DESK_EMAIL`, `MANAGER_EMAIL`, Africa's Talking keys and `SMS_SEND_ENABLED=true`. Send a live test of each template. |
| 11 | **Privacy and terms pages** — the footer links both to `/contact`; the seeded `HotelSetting.privacy_notice_url` is `/privacy`, which is not a route. | **BLOCKER** | Publish real privacy and terms pages (or point the fields at a hosted policy) and link the footer to them. |
| 12 | **Staff accounts and roles** — at least one director, one front desk and (optionally) one data manager account. | **BLOCKER** | Create accounts, set strong unique passwords, test the capability matrix in `docs/SECURITY.md`, and confirm 2FA at the host/proxy level if available. |

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
- [ ] Room allotments and rates per room type checked.
- [ ] Guest booking lookup tested with reference + email and reference + phone.
- [ ] Front desk queue walks `pending_payment → pending_confirmation → confirmed`
      correctly, including undo.
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
- [ ] Table and conference guest emails tested.

**Known limitation:** `TableBooking` and `ConferenceEnquiry` do not store a
guest language, so those guest messages are English-only. Add a `language`
field before promising bilingual facility emails.

## 5. Content and SEO

- [ ] Every page has a unique title and description; dashboard and manage pages
      are `noindex` (verified in `frontend/src/components/Page.tsx`).
- [ ] `HOTEL.websiteUrl` is the final domain; `robots.txt` / `sitemap.xml`
      generated at build point at it.
- [ ] JSON-LD `Hotel` block contains the confirmed address and phone.
- [ ] OG/Twitter cards preview correctly (use a link debugger after deploy).
- [ ] 404 page, favicon, sharing image and theme colour checked.
- [ ] Analytics is opt-in: leave `VITE_ANALYTICS_DOMAIN` empty unless the hotel
      approves Plausible (cookieless) and any required consent copy.
- [ ] Google reviews remain disabled until real reviews are imported and
      `HOTEL_GOOGLE_REVIEWS_ENABLED=true`.

## 6. Accessibility and QA

- [ ] Keyboard-only pass: header, booking form, dialogs, dashboard actions.
- [ ] Screen-reader spot check on the booking and manage-booking flows.
- [ ] Colour contrast checked (deep green / warm gold palette).
- [ ] `prefers-reduced-motion` verified — animations become effectively instant.
- [ ] Mobile pass at 360 px, 390 px and tablet widths; no horizontal scroll.
- [ ] Lighthouse mobile run: performance, accessibility, best practices, SEO.
- [ ] All five automated checks green:
      `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`,
      `npm run check:brand`; backend `..\.venv\Scripts\python.exe -m pytest -q`.

## 7. Operations

- [ ] HTTPS enforced at the proxy; HSTS enabled; certificate renewal monitored.
- [ ] Postgres backups scheduled and **restore tested**.
- [ ] `python manage.py qcluster` supervised (systemd/container) and restarting.
- [ ] Logs and health check (`/api/v1/health/`) monitored; alert on failures.
- [ ] Error tracking chosen (Sentry or host equivalent) and verified without
      leaking guest data.
- [ ] Data retention (`HotelSetting.data_retention_months`, default 24) agreed
      with the hotel and a deletion/anonymisation routine exists.

## 8. Out of scope for this release

These were explicitly excluded and must not be implied on the site:

- Gym memberships and renewals (day passes only).
- Promo codes and discount engines.
- WhatsApp automation (the link opens WhatsApp; there is no bot).
- Live HotelPlus API access (manual CSV/PDF export only).
- OTA/channel-manager synchronisation.
- A native mobile app.

## Sign-off

| Role | Name | Date |
| --- | --- | --- |
| Hotel director | | |
| Front desk lead | | |
| Marketing / translations | | |
| ICT / deployment | | |
