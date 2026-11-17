# West Premier Hotel

Bilingual (English / Kiswahili) hotel website, direct-booking flow and staff
front desk for West Premier Hotel.

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS, in `frontend/`.
- **Backend:** Django 5.2 + Django REST Framework + Postgres + django-q2, in
  `backend/`.
- **Tests:** Vitest + Testing Library (frontend), pytest (backend).

## Documentation

- [`docs/LAUNCH-CHECKLIST.md`](docs/LAUNCH-CHECKLIST.md) — everything the hotel
  must confirm before going live (location, contact details, prices, Swahili
  translations, credentials).
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — production configuration,
  payments guards, build, worker, smoke test and rollback.
- [`docs/SECURITY.md`](docs/SECURITY.md) — roles, guest data, payment security,
  headers, throttles and pre-launch checks.

## Brand configuration

No component, page or test may hard-code a brand string. The sources of truth
are:

- `frontend/src/config/hotel.ts` and `frontend/src/i18n.ts`;
- backend `HOTEL_*` environment variables (see `.env.example`);
- the editable `HotelSetting` record in Django admin.

`npm run check:brand` fails the build if a brand string leaks into code.

## Local development

### Backend

The virtual environment lives at the repository root.

```powershell
cd backend
..\.venv\Scripts\python.exe -m pip install -r requirements.txt
..\.venv\Scripts\python.exe manage.py migrate
..\.venv\Scripts\python.exe manage.py seed_hotel
..\.venv\Scripts\python.exe manage.py runserver
```

Development settings use SQLite automatically, enable payment simulation and
print email to the console. The API is served at `http://localhost:8000`.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173` and proxies API calls through
`VITE_API_URL` (default `/api/v1`). Copy `.env.example` to `.env` if you need to
override it.

## Checks

Frontend (from `frontend/`):

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run check:brand
```

Backend (from `backend/`):

```powershell
..\.venv\Scripts\python.exe -m pytest -q
..\.venv\Scripts\python.exe manage.py check --deploy --settings=config.settings.prod
```

`npm run check` runs typecheck, lint, tests and the brand check together.

## Deployment in one minute

- Build the frontend with `npm run build`; serve `frontend/dist` over HTTPS with
  an SPA fallback to `index.html`.
- Run Django with `config.settings.prod`, Postgres, a real email backend and the
  payment guards satisfied.
- Run `python manage.py qcluster` for reminders, hold expiry and front desk
  escalations.
- Generate `robots.txt`/`sitemap.xml` from `HOTEL.websiteUrl` at build time; do
  not edit them by hand.

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full procedure.
