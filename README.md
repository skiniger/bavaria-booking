# BAVARIABOOKINGX

**Vollständiges Restaurant- und Pension-Management-System**

Eine moderne, umfassende Webanwendung für die Verwaltung von Restaurants, Pensionen und Personalwesen mit Offline-Funktionalität (PWA), BMG-konformen Meldescheinen und DSGVO-Compliance.

---

## 🎯 Hauptfunktionen

### 📊 Dashboard
- Logo & Branding
- Live-Kapazitätsanzeige pro Bereich
- Bereichs-Tabs (Wirtshaus / Wintergarten / Biergarten)
- Farbstatus: Frei / Reserviert / Belegt
- Echtzeit-Statistiken

### 🍽️ Reservierungen
- **Digitales Reservierungsbuch**
  - Live Check-in / Check-out pro Tisch
  - Klickbare Tische mit Details
  - Echtzeit-Kapazitätsanzeige
  - Farbcode pro Tisch
- **Kalenderübersicht**
  - Jahres- und Monatsnavigation
  - 50-Jahres-Zeitraum
  - Gesamtübersicht aller Reservierungen
- **Tisch-Kombinationstool**
- **Erweiterte Reservierungsmaske**
  - Gästeangaben & DSGVO-Felder
  - Zahlungsarten (Bar / EC / Kreditkarte / Rechnung)
  - Besondere Hinweise (Allergien, Events)

### 🏨 Pension & Rezeption
- **BMG-konformes Meldeschein-Formular**
  - Gäste- und Dokumentdaten
  - Reisezweck & Firmenangaben
  - Kurtaxe-Management & Befreiung
  - Frühstücksauswahl
  - Zahlungsoptionen & Summenberechnung
  - Einwilligungen & DSGVO-Checkboxen
- **Export & Stadt-Registrierung**

### 👥 Personalverwaltung
- **Mitarbeiter-Login & Rollen**
  - Admin (Vollzugriff + Systemerweiterungen)
  - Manager (Vollzugriff ohne Erweiterungen)
  - Personal (Standard)
  - Simultanes Anmelden erlaubt
- **Zeiterfassung**
  - Automatisch via Check-in / Check-out
  - Manuelle Korrekturen
  - Auto-Logout nach 24h
- **Mitarbeiterdatenverwaltung**
  - Profiländerungen
  - Stundenübersicht & Filter

### 🍺 Servicebereiche & Tischlayout
- **Wirtshaus** (36 Plätze, teils kombinierbar)
- **Wintergarten** (19 Plätze, teils kombinierbar)
- **Biergarten** (50 Plätze, nicht kombinierbar)
- Visuelle Darstellung (Grid / Grundriss)

### 💾 Daten & Persistenz
- **Lokale Speicherung** (IndexedDB)
- **Automatische Backups** (3x täglich)
- **Sync-Queue** für Offline-Änderungen
- **PWA** mit Offline-Funktionalität & Hintergrundsynchronisation

### ⚙️ Einstellungen
- Individuelle Systemkonfiguration
- Firmendaten dauerhaft speichern
- Erweiterbare Systemfunktionen

### 🔐 System & Compliance
- **DSGVO-Features** & Zeitstempel
- **BMG-konforme Meldescheine** & Export
- Dokumentation & Migration

---

## 🏗️ Technologie-Stack

### Backend
- **Django 4.2** mit Django REST Framework
- **PostgreSQL** Datenbank
- **Custom User Model** (Employee)
- **CORS** Support für Frontend-Integration
- Python 3.10+

### Frontend
- **React 18** mit TypeScript
- **Vite** als Build-Tool
- **TailwindCSS** für Styling
- **React Router** für Navigation
- **Zustand** für State Management
- **TanStack Query** (React Query) für API-Caching
- **Axios** für HTTP-Requests
- **Vite PWA Plugin** für Progressive Web App
- **IndexedDB** (via idb) für Offline-Speicherung

---

## 📦 Installation & Setup

### Voraussetzungen
- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- npm oder yarn

### Backend Setup

```bash
# 1. In Backend-Verzeichnis wechseln
cd backend_django

# 2. Virtuelle Umgebung erstellen
python -m venv venv

# 3. Virtuelle Umgebung aktivieren
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 4. Dependencies installieren
pip install -r requirements.txt

# 5. Umgebungsvariablen setzen (optional .env erstellen)
# DB_NAME=gaststaette_db
# DB_USER=admin
# DB_PASSWORD=password
# DB_HOST=localhost
# DB_PORT=5432

# 6. Datenbank-Migrationen erstellen und ausführen
python manage.py makemigrations
python manage.py migrate

# 7. Superuser erstellen
python manage.py createsuperuser

# 8. Development Server starten
python manage.py runserver
```

**Backend läuft auf:** `http://localhost:8000`
**API Endpunkte:** `http://localhost:8000/api/`
**Admin Panel:** `http://localhost:8000/admin/`

### Frontend Setup

```bash
# 1. In Frontend-Verzeichnis wechseln
cd frontend

# 2. Dependencies installieren
npm install

# 3. Umgebungsvariablen (optional .env erstellen)
# VITE_API_URL=http://localhost:8000/api

# 4. Development Server starten
npm run dev
```

**Frontend läuft auf:** `http://localhost:5173`

---

## 🚀 Verwendung

### 1. Backend starten
```bash
cd backend_django
python manage.py runserver
```

### 2. Frontend starten
```bash
cd frontend
npm run dev
```

### 3. Browser öffnen
Navigiere zu `http://localhost:5173`

---

## 📱 PWA Installation

Die Anwendung ist als Progressive Web App (PWA) konfiguriert und kann auf jedem Gerät installiert werden:

1. Öffne die App im Browser
2. Klicke auf "Zur Startseite hinzufügen" (Browser-abhängig)
3. Die App funktioniert auch offline!

---

## 🗄️ Datenbank-Struktur

### Hauptmodelle

- **Area** - Servicebereiche (Wirtshaus, Wintergarten, Biergarten)
- **Table** - Tische mit Position, Kapazität und Status
- **TableCombination** - Kombinierte Tische
- **Guest** - Restaurant-Gäste mit DSGVO-Feldern
- **Reservation** - Reservierungen mit Check-in/out
- **Employee** - Mitarbeiter (Custom User Model)
- **TimeTracking** - Zeiterfassung
- **PensionGuest** - Pensionsgäste mit Dokumentdaten
- **RegistrationForm** - BMG-konforme Meldescheine
- **SystemSettings** - Systemkonfiguration

---

## 🔑 API Endpoints

### Restaurant & Reservierungen
- `GET/POST /api/areas/` - Servicebereiche
- `GET/POST /api/tables/` - Tische
- `GET/POST /api/table-combinations/` - Tischkombinationen
- `GET/POST /api/guests/` - Gäste
- `GET/POST /api/reservations/` - Reservierungen
  - `POST /api/reservations/{id}/confirm/` - Reservierung bestätigen
  - `POST /api/reservations/{id}/cancel/` - Reservierung stornieren

### Personalverwaltung
- `GET/POST /api/employees/` - Mitarbeiter
  - `POST /api/employees/{id}/check-in/` - Mitarbeiter einchecken
  - `POST /api/employees/{id}/check-out/` - Mitarbeiter auschecken
- `GET/POST /api/time-tracking/` - Zeiterfassung

### Pension & Rezeption
- `GET/POST /api/pension-guests/` - Pensionsgäste
- `GET/POST /api/registration-forms/` - Meldescheine
  - `POST /api/registration-forms/{id}/check-in/` - Gast einchecken
  - `POST /api/registration-forms/{id}/check-out/` - Gast auschecken
  - `POST /api/registration-forms/{id}/export/` - Export zur Stadt

### Dashboard & System
- `GET /api/dashboard/stats/` - Dashboard-Statistiken
- `GET /api/dashboard/capacity-by-area/` - Kapazität pro Bereich
- `GET/PATCH /api/system-settings/` - Systemeinstellungen

---

## 🎨 UI/UX Features

- **Responsive Design** - Optimiert für Desktop, Tablet und Mobile
- **Dark Mode Support** (in Planung)
- **Echtzeit-Updates** via React Query
- **Offline-First Ansatz**
- **Farbcodierung** für schnelle Übersicht
- **Intuitive Navigation**

---

## 🔒 Sicherheit & DSGVO

- **DSGVO-konforme Datenverarbeitung**
- **Einwilligungsverwaltung mit Zeitstempel**
- **BMG-konforme Meldescheine**
- **Sichere Authentifizierung**
- **Rollenbasierte Zugriffskontrolle**

---

## 🛠️ Development

### Backend Tests ausführen
```bash
cd backend_django
python manage.py test
```

### Frontend Build für Production
```bash
cd frontend
npm run build
```

### Type Checking
```bash
cd frontend
npm run type-check
```

---

## 📝 Geplante Features (Phase 3)

### KI & Analyse
- **MeitiAI** - Chat & Reservierungsassistent
- **AnalyticsAI** - Prognosen & BI-Dashboard
- **Kapazitätsmanager** - Zeitslot-Optimierung

---

## 🤝 Beitragen

Dieses Projekt wurde als umfassende Lösung für Restaurant- und Pensionsverwaltung entwickelt.

---

## 📄 Lizenz

Proprietär - Alle Rechte vorbehalten

---

## 🆘 Support & Kontakt

Bei Fragen oder Problemen, kontaktieren Sie das Entwicklerteam.

---

**BAVARIABOOKINGX** - Ihre All-in-One Lösung für Restaurant- und Pensionsverwaltung! 🍻🏰
