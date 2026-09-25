# BavariaBookingX – Projektkontext

Restaurant- & Pension-Management-System für bayerische Gasthäuser
(Reservierungen, Meldewesen, Personal, Layout, KI-Analytics).

## Aktiver Stack (primär, laut README)

- **Backend**: `backend_django/` – Django 4.2 + DRF, PostgreSQL (lokal auch SQLite möglich).
  App-Code liegt in `backend_django/app_core/` (`models.py`, `views.py`,
  `serializers.py`, `urls.py`, `ai_service.py`).
- **Frontend**: `frontend/` – React 19 + TypeScript + Vite + TailwindCSS +
  TanStack Query + recharts.
- **Start**: `docker-compose up` (Backend + Frontend + Postgres) oder manuell
  je Ordner (siehe README.md).

## Achtung – Altlasten im Repo

Es gibt zwei weitere Baumstrukturen, die **nicht** der aktive Stack sind:

- `frontend_flutter/` (Root-Ebene) – Flutter-App, Status unklar.
- `gaststaette_pension_app/` – eigenständiger, älterer Nested-Projektbaum mit
  eigenem `backend_django/` + `frontend_flutter/`; laut eigener README ein
  separates Vorläufer-/Parallelprojekt.

**Regel für Agenten:** nur `backend_django/` und `frontend/` (beide auf
Root-Ebene) ändern, sofern nicht ausdrücklich anders angewiesen. Bei
Unklarheit, ob eine Änderung `frontend_flutter/` oder
`gaststaette_pension_app/` betreffen soll: nachfragen statt raten.

## Befehle

**Backend** (`cd backend_django`):
- `python manage.py check` – Systemprüfung (schnell, kein DB-Zugriff nötig)
- `python manage.py test` – Tests (aktuell keine Testdateien vorhanden –
  neue Features brauchen neue Tests unter `app_core/tests/` oder
  `app_core/test_*.py`)
- `python manage.py migrate` – Migrationen anwenden

**Frontend** (`cd frontend`):
- `npm run lint` – ESLint
- `npm run build` – `tsc -b && vite build` (Typecheck + Build in einem)
- `npm run dev` – Dev-Server (Vite, Port 5173)

## Konventionen

- Keine Secrets/Zugangsdaten in Commits oder Logs.
- Deutsche Kommentare/Texte im Stil der bestehenden Dateien, keine
  Übererklärung.
- Neue Backend-Endpunkte über DRF-Serializer/Views, in `app_core/urls.py`
  registrieren.
- Neue Frontend-Ansichten nutzen das bestehende State-Management
  (`useStore.ts`, siehe `UX_IMPROVEMENTS.md`) statt eigener Parallellösungen.
