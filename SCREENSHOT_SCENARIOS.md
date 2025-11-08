# 📸 Screenshot-Szenarien für BAVARIABOOKINGX

Dokumentation der vorkonfigurierten Screenshot-Szenarien für Präsentationen und Demos.

## 🎯 Übersicht

Das `setup_screenshots` Management Command erstellt perfekte Szenarien für:
- Screenshots
- Präsentationen
- Demos
- Marketing-Material
- Dokumentation

---

## 🚀 Verwendung

### Voraussetzungen
```bash
# Basis-Setup und Demo-Daten müssen existieren
python manage.py init_bavariabookingx
python manage.py generate_demo_data
```

### Alle Szenarien erstellen
```bash
python manage.py setup_screenshots all
```

### Einzelne Szenarien
```bash
# Nur ausgebuchter Samstag
python manage.py setup_screenshots busy_saturday

# Nur ruhiger Montag
python manage.py setup_screenshots quiet_monday

# Nur Tischkombinationen
python manage.py setup_screenshots combinations
```

---

## 📅 Szenario 1: Ausgebuchter Samstag Abend

**Command**: `setup_screenshots busy_saturday`

### Was wird erstellt?
- **24-26 Reservierungen** für kommenden Samstag
- **Prime Time**: 18:00-21:00 Uhr
- **Auslastung**: ~90% (alle Bereiche)
- **Status**: Alle bestätigt

### Perfekt für Screenshots von:
- Voller Kalender-Ansicht
- TableGrid mit hoher Auslastung
- Reservierungs-Liste (gefiltert nach Datum)
- Dashboard mit Peak-Statistiken

### Details:
- Alle 3 Bereiche (Wirtshaus, Wintergarten, Biergarten) genutzt
- Zeitfenster: 30-Minuten-Intervalle
- Notizen: "VIP Gast", "Geburtstag", "Jubiläum", etc.
- Gruppengröße: 2 bis Tisch-Kapazität

### Wo zu finden:
- **Frontend**: `/reservations` → Filter auf Samstag setzen
- **Calendar**: Samstag-Ansicht zeigt vollen Tag
- **TableGrid**: Alle Tische rot/gelb markiert

---

## 📅 Szenario 2: Ruhiger Montag Vormittag

**Command**: `setup_screenshots quiet_monday`

### Was wird erstellt?
- **3 Reservierungen** für kommenden Montag
- **Lunch Time**: 11:30-13:00 Uhr
- **Auslastung**: ~15% (nur Wirtshaus + Wintergarten)
- **Typ**: Business Lunch

### Perfekt für Screenshots von:
- Niedrige Auslastung
- Verfügbarkeits-Prüfung (viele freie Tische)
- Ruhige Tageszeiten
- Bereichs-spezifische Ansichten

### Details:
- Nur Wirtshaus und Wintergarten geöffnet
- Biergarten geschlossen (Montag Ruhetag)
- Kleine Gruppen (2 Personen)
- Business-Kontext

### Wo zu finden:
- **Frontend**: `/reservations` → Filter auf Montag
- **TableGrid**: Viele grüne (freie) Tische
- **Analytics**: Niedriger Tag für Kontrast

---

## 🔗 Szenario 3: Tischkombinationen

**Command**: `setup_screenshots combinations`

### Was wird erstellt?
- **2 Aktive Tischkombinationen**
  - Kombination 1+2 (Wirtshaus): Große Gruppe (10+ Personen)
  - Kombination 3+4 (Wirtshaus): Firmenfeier
- **1 Reservierung** für Kombination (morgen, 19:00 Uhr)

### Perfekt für Screenshots von:
- TableCombinationTool in Aktion
- Kombinierte Tische im TableGrid
- Reservierungs-Form mit Kombinationen
- Layout-Management mit aktiven Kombinationen

### Details:
- Kombinierte Kapazität: 8-12 Personen pro Kombination
- Grund dokumentiert (Firmenfeier, Große Gruppe)
- Is_Active Flag gesetzt
- Verknüpfte Reservierung

### Wo zu finden:
- **Frontend**: `/layout` → TableCombinationTool
- **Reservations**: Reservierung zeigt Kombinations-Hinweis
- **TableGrid**: Kombinierte Tische visuell verknüpft

---

## 📊 Szenario 4: Analytics mit Wachstumstrend

**Command**: Automatisch bei `all` inkludiert

### Was wird erstellt?
- **14 Tage Analytics-Daten** mit klarem Aufwärtstrend
- **Heute**: Peak-Werte (88% Auslastung, 24 Reservierungen)
- **KI-Insights**: Wachstums-Meldungen und Empfehlungen

### Perfekt für Screenshots von:
- Analytics Dashboard mit Trends
- Occupancy Trends Chart (steigend)
- Revenue Growth Chart
- KI-Insights Panel

### Details:
**Trend-Charakteristik**:
- Tag 1: 10 Reservierungen, 45% Auslastung, €1.500
- Tag 7: 20 Reservierungen, 65% Auslastung, €2.200
- Tag 14: 28 Reservierungen, 88% Auslastung, €3.850

**KI-Insights**:
- "Reservierungen um X% gestiegen"
- "Heute höchste Auslastung der Woche"
- "Zusätzliches Personal für Wochenende empfohlen"

**Wochenend-Peaks**:
- Freitag/Samstag: 1.8x höhere Werte
- Sonntag: 1.5x höhere Werte
- Montag-Donnerstag: Basis-Werte

### Wo zu finden:
- **Frontend**: `/analytics` → OccupancyTrends Chart
- **Dashboard**: Statistik-Karten mit Peak-Werten
- **MeitiAI**: KI kann auf Trends hinweisen

---

## 🎨 Screenshot-Tipps

### Beste Ansichten für Screenshots:

**1. Dashboard** (`/dashboard`)
- Zeigt heutige Peak-Statistiken
- Area Capacity Cards mit Auslastung
- Quick Stats prominent

**2. Reservierungs-Kalender** (`/reservations`)
- Samstag: Voller Kalender (90% Auslastung)
- Montag: Ruhiger Kalender (15% Auslastung)
- Heute: Mix aus beiden

**3. TableGrid** (`/reservations` → Grid View)
- Samstag 19:00: Fast alle Tische rot/gelb
- Montag 12:00: Meiste Tische grün
- Tischkombinationen sichtbar verknüpft

**4. Layout Management** (`/layout`)
- TableCombinationTool mit aktiven Kombinationen
- AreaManagement mit allen 3 Bereichen
- TableLayoutEditor mit Tisch-Positionen

**5. Analytics** (`/analytics`)
- OccupancyTrends: Aufwärtstrend über 14 Tage
- RevenueGrowth: Steigende Umsätze
- PredictiveInsights: KI-Empfehlungen

**6. Personal** (`/staff`)
- TimeTracking mit letzten 7 Tagen
- HoursOverview mit Statistiken
- Check-in/out Historie

**7. Pension** (`/pension`)
- 5 Aktuelle Gäste (checked_in)
- 8 Zukünftige Buchungen (confirmed)
- Meldescheine mit BMG-Daten

**8. MeitiAI** (`/meiti-ai`)
- 3 Konversationen mit relevanten Fragen
- Chat-Historie mit Empfehlungen
- KI-Insights basierend auf Analytics

---

## 🎬 Workflow für perfekte Screenshots

### 1. Setup (Einmalig)
```bash
# Frische Installation
python manage.py migrate
python manage.py init_bavariabookingx
python manage.py generate_demo_data
python manage.py setup_screenshots all
```

### 2. Frontend starten
```bash
cd frontend
npm run dev
# Öffne http://localhost:5173
```

### 3. Backend starten
```bash
cd backend_django
python manage.py runserver
# API läuft auf http://localhost:8000
```

### 4. Screenshots erstellen

**A) Dashboard-Screenshots**:
1. Gehe zu `/dashboard`
2. Warte auf Daten-Load
3. Screenshot: Gesamtübersicht mit Peak-Werten

**B) Busy Saturday**:
1. Gehe zu `/reservations`
2. Wähle nächsten Samstag im Calendar
3. Screenshot: Voller Kalender
4. Wechsle zu Grid View
5. Screenshot: Fast alle Tische belegt

**C) Quiet Monday**:
1. Gehe zu `/reservations`
2. Wähle nächsten Montag im Calendar
3. Screenshot: Ruhiger Kalender
4. Screenshot: Viele freie Tische in Grid

**D) Tischkombinationen**:
1. Gehe zu `/layout`
2. Öffne TableCombinationTool
3. Screenshot: Aktive Kombinationen-Liste
4. Gehe zu `/reservations`
5. Finde Reservierung für Kombination
6. Screenshot: Reservierung mit Kombinations-Hinweis

**E) Analytics-Trends**:
1. Gehe zu `/analytics`
2. Warte auf Chart-Rendering
3. Screenshot: OccupancyTrends (steigend)
4. Screenshot: Revenue Growth
5. Scrolle zu AI Insights
6. Screenshot: KI-Empfehlungen

---

## 🔄 Szenarien zurücksetzen

Um neue Screenshot-Szenarien zu erstellen:

```bash
# Option 1: Nur Reservierungen löschen
python manage.py shell
>>> from app_core.models import Reservation
>>> Reservation.objects.filter(status='confirmed').delete()
>>> exit()
python manage.py setup_screenshots all

# Option 2: Kompletter Reset
rm db.sqlite3
python manage.py migrate
python manage.py init_bavariabookingx
python manage.py generate_demo_data
python manage.py setup_screenshots all
```

---

## 📊 Kombinierte Szenarien

### Für Marketing-Material:
```bash
# Volle Demo-Umgebung
python manage.py generate_demo_data    # 260+ Basis-Einträge
python manage.py setup_screenshots all # Screenshot-Szenarien
```

### Für Entwickler-Demos:
```bash
# Fokus auf Features
python manage.py init_bavariabookingx        # Nur Basis
python manage.py setup_screenshots combinations # Nur Feature-spezifisch
```

### Für Analytics-Demos:
```bash
# Analytics-fokussiert
python manage.py generate_demo_data          # Basis-Daten
python manage.py setup_screenshots all       # Inkl. Trends
```

---

## 🎯 Erwartete Ergebnisse

Nach `python manage.py setup_screenshots all`:

| Bereich | Vorher | Nachher | Differenz |
|---------|--------|---------|-----------|
| **Reservierungen** | 120 | ~150 | +30 |
| **Tischkombinationen** | 0 | 2 | +2 |
| **Analytics Snapshots** | 31 | 45+ | +14+ |

---

## ⚠️ Hinweise

1. **Zeitabhängigkeit**: Szenarien erstellen Daten für "nächsten Samstag" und "nächsten Montag" - relativ zum aktuellen Datum.

2. **Mehrfache Ausführung**: Das Command kann mehrfach ausgeführt werden. Bestehende Daten werden nicht gelöscht, aber neue hinzugefügt.

3. **Demo-Daten Voraussetzung**: Ohne `generate_demo_data` gibt es keine Gäste für Reservierungen.

4. **Browser-Cache**: Nach Setup Frontend neu laden (Ctrl+R) um Daten zu aktualisieren.

5. **Timezone**: Alle Zeiten in Europe/Berlin Timezone.

---

## 🎨 Styling-Tipps für Screenshots

### Browser-Settings:
- **Zoom**: 100% (oder 90% für mehr Übersicht)
- **Auflösung**: 1920x1080 (Full HD)
- **Dark Mode**: Aus (bessere Lesbarkeit)
- **DevTools**: Geschlossen

### Screenshot-Tools:
- **Windows**: Snipping Tool, Win+Shift+S
- **Mac**: Cmd+Shift+4
- **Linux**: Flameshot, GNOME Screenshot

### Nachbearbeitung:
- Sensible Daten: Keine (alles sind Demo-Daten!)
- Blur: Nicht nötig
- Annotations: Optional (Pfeile, Highlights)

---

## 📝 Checkliste für vollständige Demo

- [ ] `init_bavariabookingx` ausgeführt
- [ ] `generate_demo_data` ausgeführt
- [ ] `setup_screenshots all` ausgeführt
- [ ] Backend läuft (Port 8000)
- [ ] Frontend läuft (Port 5173)
- [ ] Browser geöffnet
- [ ] Login: admin / admin123
- [ ] Dashboard-Screenshot
- [ ] Reservations (Samstag) Screenshot
- [ ] Reservations (Montag) Screenshot
- [ ] Layout mit Kombinationen Screenshot
- [ ] Analytics mit Trends Screenshot
- [ ] MeitiAI Chat Screenshot
- [ ] Personal TimeTracking Screenshot
- [ ] Pension Meldescheine Screenshot

---

**Erstellt**: 2025-11-04
**Version**: 1.0
**Teil von**: Option C - Demo-Ready (Punkt 22)
