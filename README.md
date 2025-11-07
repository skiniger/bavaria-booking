# BAVARIABOOKINGX 🏔️

**Umfassendes Restaurant & Pension Management System**

Vollständiges Management-System für bayerische Gasthäuser mit Pension, inklusive Reservierungsverwaltung, Meldewesen (BMG-konform), Personalmanagement, KI-gestützter Analytics und mehr.

---

## ✨ Features

- ✅ **Reservierungs-System**: Tischreservierungen, Gästeverwaltung, Echtzeit-Verfügbarkeit
- ✅ **Pension & Rezeption**: BMG-konformer Meldeschein, Kurtaxe, Check-in/out
- ✅ **Personal-Verwaltung**: Zeiterfassung, Rollen, Monatsübersichten
- ✅ **Layout-Management**: Servicebereiche, Interactive Table Layouts
- ✅ **Einstellungen**: Firmendaten, Öffnungszeiten, E-Mail, DSGVO
- ✅ **KI & Analytics**: MeitiAI Chat, Analytics Dashboard, Kapazitätsmanager

---

## 🚀 Quick Start mit Docker

```bash
# Repository klonen
git clone <repository-url>
cd bavaria-booking

# Starten (Backend + Frontend + PostgreSQL)
docker-compose up

# Fertig! Öffnen Sie:
# - Frontend: http://localhost:5173
# - Backend Admin: http://localhost:8000/admin (admin/admin123)
# - API: http://localhost:8000/api
```

---

## 📊 Technologie-Stack

**Backend**: Django 4.2 + DRF + PostgreSQL/SQLite + KI-Service  
**Frontend**: React 19 + TypeScript + Vite + TailwindCSS + TanStack Query + recharts

---

## 📝 Manuelle Installation

### Backend
```bash
cd backend_django
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py init_bavariabookingx
python manage.py runserver  # http://localhost:8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev  # http://localhost:5173
```

---

## 🔑 Login

- **Username**: `admin`
- **Password**: `admin123`

---

## 📈 Projekt-Status

**100% Complete** - Alle 6 Hauptfeatures implementiert (~6,100 Lines of Code)

---

Made with ❤️ in Bavaria 🏔️
