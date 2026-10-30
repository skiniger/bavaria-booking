"""
KI-Service für BAVARIABOOKINGX

Dieser Service stellt Mock-Implementierungen für KI-Features bereit:
- MeitiAI Chat-Assistent
- Predictive Analytics
- Kapazitätsoptimierung

In einer Produktionsumgebung würde dieser Service echte OpenAI API-Calls
oder eigene ML-Modelle verwenden.
"""

import random
from datetime import datetime, timedelta, date
from decimal import Decimal
from typing import List, Dict, Any
from django.utils import timezone
from django.db.models import Count, Avg, Q


def generate_chat_response(conversation_history: List[Dict[str, str]], user_message: str) -> str:
    """
    Generiert eine KI-Antwort für MeitiAI Chat.

    In Produktion: OpenAI API Integration
    Aktuell: Rule-based Mock-System
    """

    user_message_lower = user_message.lower()

    # Regel-basierte Antworten; Zahlen kommen live aus der Datenbank.
    if any(word in user_message_lower for word in ['auslastung', 'kapazität', 'besetzt']):
        return _answer_occupancy()

    elif any(word in user_message_lower for word in ['reservierung', 'reservierungen', 'buchung', 'buchungen']):
        return _answer_reservations_today()

    elif any(word in user_message_lower for word in ['tisch', 'tische', 'frei', 'verfügbar']):
        return _answer_tables()

    elif any(word in user_message_lower for word in ['personal', 'mitarbeiter', 'team', 'anwesend']):
        return _answer_staff()

    elif any(word in user_message_lower for word in ['umsatz', 'einnahmen', 'revenue']):
        return (
            "Umsatzdaten sind in BAVARIABOOKINGX nicht erfasst (keine Kassenanbindung). "
            "Ich kann Ihnen aber die Reservierungen und die Auslastung von heute nennen."
        )

    elif any(word in user_message_lower for word in ['empfehlung', 'optimierung', 'tipp', 'vorschlag']):
        return (
            "Meine Top-3 Empfehlungen für heute:\n\n"
            "1. Biergarten: Auslastung +15% möglich durch flexiblere Tischkombinationen\n"
            "2. Personal: Ab 19:00 Uhr eine zusätzliche Servicekraft einteilen\n"
            "3. Reservierungen: Zeitfenster 20:30-21:00 Uhr noch 4 Plätze verfügbar - aktiv bewerben"
        )

    elif any(word in user_message_lower for word in ['wetter', 'wettervorhersage']):
        return (
            "Eine Wetteranbindung gibt es noch nicht, daher kann ich keine Vorhersage nennen."
        )

    elif any(word in user_message_lower for word in ['öffnungszeiten', 'öffnungszeit', 'geöffnet']):
        return (
            "Unsere Öffnungszeiten:\n"
            "Wirtshaus: Mo-Fr 11:00-22:00, Sa-So 10:00-23:00\n"
            "Wintergarten: Täglich 11:00-21:00\n"
            "Biergarten: Bei schönem Wetter 11:00-22:00\n\n"
            "Sonder-Öffnungszeiten können Sie im Einstellungsbereich konfigurieren."
        )

    elif any(word in user_message_lower for word in ['hilfe', 'help', 'was kannst du']):
        return (
            "Ich bin Meiti, Ihr KI-Assistent für BAVARIABOOKINGX! Ich kann Ihnen helfen bei:\n\n"
            "📊 Auslastungsanalysen und Vorhersagen\n"
            "📅 Reservierungsübersicht und -statistiken\n"
            "👥 Personalplanung und Zeiterfassung\n"
            "🪑 Tischverfügbarkeit und -optimierung\n"
            "💰 Umsatzanalysen und Trends\n"
            "💡 Empfehlungen zur Betriebsoptimierung\n\n"
            "Fragen Sie mich einfach, was Sie wissen möchten!"
        )

    else:
        # Generische Antwort
        return (
            "Ich verstehe Ihre Frage und verarbeite die Informationen. "
            "Bitte formulieren Sie Ihre Frage konkreter, z.B.: "
            "'Wie ist die aktuelle Auslastung?', 'Welche Tische sind frei?' oder 'Wie viele Reservierungen haben wir heute?'"
        )



_ACTIVE_STATUSES = ('pending_confirmation', 'confirmed', 'checked_in')
_CANCELLED_STATUSES = ('cancelled_by_guest', 'cancelled_by_restaurant')


def _today_reservations():
    from .models import Reservation
    today = timezone.localdate()
    return Reservation.objects.filter(reservation_time__date=today)


def _answer_reservations_today() -> str:
    qs = _today_reservations()
    total = qs.count()
    if total == 0:
        return "Heute gibt es keine Reservierungen."
    confirmed = qs.filter(status__in=('confirmed', 'checked_in', 'checked_out', 'completed')).count()
    pending = qs.filter(status='pending_confirmation').count()
    cancelled = qs.filter(status__in=_CANCELLED_STATUSES).count()
    guests = sum(r.number_of_guests or 0 for r in qs.exclude(status__in=_CANCELLED_STATUSES))
    word = 'Reservierung' if total == 1 else 'Reservierungen'
    return (f"Heute gibt es {total} {word} ({guests} Personen ohne Stornos): "
            f"{confirmed} bestätigt, {pending} warten auf Bestätigung, {cancelled} storniert.")


def _answer_tables() -> str:
    from .models import Table
    tables = Table.objects.filter(is_reservable=True).select_related('area')
    total = tables.count()
    if total == 0:
        return "Es sind noch keine reservierbaren Tische angelegt."
    now = timezone.now()
    busy_ids = set()
    for r in _today_reservations().filter(status__in=_ACTIVE_STATUSES, table__isnull=False):
        end = r.reservation_time + timedelta(minutes=r.duration_minutes or 120)
        if r.reservation_time <= now < end:
            busy_ids.add(r.table_id)
    free = [t for t in tables if t.id not in busy_ids and t.status not in ('occupied', 'out_of_service')]
    per_area = {}
    for t in free:
        per_area[t.area.name] = per_area.get(t.area.name, 0) + 1
    detail = ', '.join(f"{name}: {n}" for name, n in sorted(per_area.items()))
    return f"Gerade sind {len(free)} von {total} Tischen frei" + (f" ({detail})." if detail else ".")


def _answer_occupancy() -> str:
    from .models import Table
    capacity = sum(t.capacity for t in Table.objects.filter(is_reservable=True))
    guests = sum(r.number_of_guests or 0 for r in _today_reservations().filter(status__in=_ACTIVE_STATUSES))
    if capacity == 0:
        return "Ohne angelegte Tische kann ich keine Auslastung berechnen."
    pct = round(100 * guests / capacity)
    return (f"Heute sind {guests} Personen reserviert bei {capacity} Plätzen "
            f"(rechnerisch {pct} % einer Belegung, ohne Mehrfachbelegung der Tische).")


def _answer_staff() -> str:
    from .models import TimeTracking
    open_entries = TimeTracking.objects.filter(check_out__isnull=True).select_related('employee')
    n = open_entries.count()
    if n == 0:
        return "Derzeit ist niemand eingecheckt."
    names = ', '.join(sorted({(e.employee.first_name or e.employee.username) for e in open_entries}))
    return f"Derzeit {'ist' if n == 1 else 'sind'} {n} eingecheckt: {names}."

def generate_analytics_insights(snapshot_data: Dict[str, Any]) -> List[str]:
    """
    Generiert KI-Insights basierend auf Analytics-Daten

    Args:
        snapshot_data: Dictionary mit Statistiken des Tages

    Returns:
        Liste von Insight-Strings
    """
    insights = []

    occupancy = float(snapshot_data.get('average_occupancy_rate', 0))
    if occupancy > 85:
        insights.append("Sehr hohe Auslastung - Überlegen Sie zusätzliches Personal oder erweiterte Öffnungszeiten")
    elif occupancy < 40:
        insights.append("Niedrige Auslastung - Prüfen Sie Marketingmaßnahmen oder spezielle Angebote")

    no_shows = snapshot_data.get('no_show_count', 0)
    total_res = snapshot_data.get('total_reservations', 1)
    if no_shows / total_res > 0.15:
        insights.append(f"Hohe No-Show-Rate ({no_shows} von {total_res}) - Implementieren Sie Bestätigungserinnerungen")

    cancelled = snapshot_data.get('cancelled_reservations', 0)
    if cancelled / total_res > 0.20:
        insights.append("Erhöhte Stornierungsrate - Überprüfen Sie Ihre Stornierungsbedingungen")

    avg_party = float(snapshot_data.get('average_party_size', 0))
    if avg_party > 4:
        insights.append("Große Gruppen dominieren - Stellen Sie sicher, dass genug kombinierbare Tische verfügbar sind")

    return insights or ["Betrieb läuft stabil - keine besonderen Auffälligkeiten"]


def predict_occupancy(area_id: str, target_date: date, target_time: str) -> Dict[str, Any]:
    """
    Vorhersage der Auslastung für einen bestimmten Zeitpunkt

    In Produktion: ML-Modell basierend auf historischen Daten
    Aktuell: Regel-basiertes Mock-System
    """

    # Mock-Logik basierend auf Wochentag und Uhrzeit
    weekday = target_date.weekday()  # 0 = Montag, 6 = Sonntag
    hour = int(target_time.split(':')[0])

    base_occupancy = 50.0

    # Wochentag-Faktor
    if weekday in [4, 5, 6]:  # Fr, Sa, So
        base_occupancy += 25
    elif weekday in [0, 1]:  # Mo, Di
        base_occupancy -= 10

    # Tageszeit-Faktor
    if 11 <= hour <= 14:  # Mittagszeit
        base_occupancy += 20
    elif 18 <= hour <= 21:  # Abendzeit
        base_occupancy += 30
    elif hour < 11 or hour > 22:
        base_occupancy -= 20

    # Zufällige Variation
    variation = random.uniform(-5, 5)
    predicted = min(100, max(0, base_occupancy + variation))

    # Konfidenz basierend auf Datenlage (Mock)
    confidence = random.uniform(75, 95)

    return {
        'predicted_occupancy': Decimal(str(round(predicted, 2))),
        'confidence_score': Decimal(str(round(confidence, 2))),
        'factors': {
            'weekday_impact': 'high' if weekday in [4, 5, 6] else 'normal',
            'time_impact': 'peak' if 18 <= hour <= 21 else 'normal',
            'historical_trend': 'stable'
        }
    }


def generate_capacity_recommendation(
    area_id: str,
    predicted_occupancy: Decimal,
    date: date,
    time_slot: str
) -> Dict[str, Any]:
    """
    Generiert Kapazitäts-Empfehlung basierend auf Vorhersage
    """

    occupancy = float(predicted_occupancy)

    if occupancy > 90:
        return {
            'recommendation_type': 'increase_staff',
            'recommendation_text': (
                f"Sehr hohe Auslastung ({occupancy:.1f}%) erwartet. "
                f"Empfehlung: 1-2 zusätzliche Servicekräfte einplanen, "
                f"Küchenpersonal informieren, Tischkombinationen vorbereiten."
            ),
            'priority': 'high'
        }
    elif occupancy > 75:
        return {
            'recommendation_type': 'optimize_tables',
            'recommendation_text': (
                f"Hohe Auslastung ({occupancy:.1f}%) erwartet. "
                f"Empfehlung: Tische optimal verteilen, flexible Kombinationen vorbereiten, "
                f"ggf. Reservierungsannahme für diesen Zeitraum limitieren."
            ),
            'priority': 'medium'
        }
    elif occupancy > 60:
        return {
            'recommendation_type': 'normal_operations',
            'recommendation_text': (
                f"Normale Auslastung ({occupancy:.1f}%) erwartet. "
                f"Empfehlung: Standardbetrieb, keine besonderen Maßnahmen erforderlich."
            ),
            'priority': 'low'
        }
    elif occupancy > 40:
        return {
            'recommendation_type': 'accept_more_reservations',
            'recommendation_text': (
                f"Moderate Auslastung ({occupancy:.1f}%) erwartet. "
                f"Empfehlung: Aktiv weitere Reservierungen annehmen, "
                f"ggf. Marketingmaßnahmen für spontane Gäste."
            ),
            'priority': 'medium'
        }
    else:
        return {
            'recommendation_type': 'reduce_staff',
            'recommendation_text': (
                f"Niedrige Auslastung ({occupancy:.1f}%) erwartet. "
                f"Empfehlung: Personalkapazität reduzieren, Kosten optimieren, "
                f"ggf. spezielle Angebote für diesen Zeitraum."
            ),
            'priority': 'high'
        }


def calculate_occupancy_trends(days: int = 7) -> List[Dict[str, Any]]:
    """
    Berechnet Auslastungstrends für die letzten N Tage

    In Produktion: Echte DB-Abfragen
    Aktuell: Mock-Daten
    """
    from .models import Reservation

    trends = []
    today = timezone.now().date()

    for i in range(days, 0, -1):
        target_date = today - timedelta(days=i)

        # Echte Daten holen, wenn verfügbar
        day_reservations = Reservation.objects.filter(
            reservation_time__date=target_date,
            status__in=['confirmed', 'checked_in', 'checked_out', 'completed']
        )

        count = day_reservations.count()
        guests = sum([r.number_of_guests for r in day_reservations])

        # Auslastung berechnen (Mock-Logik: 100 Gäste = 100% Kapazität)
        occupancy = min(100, (guests / 100.0) * 100)

        trends.append({
            'date': target_date,
            'occupancy_rate': Decimal(str(round(occupancy, 2))),
            'total_reservations': count,
            'total_guests': guests
        })

    return trends
