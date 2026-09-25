"""
Regelbasierte Heuristiken zur Erkennung von Fake-/Phishing-Reservierungsanfragen.

Kein externer API-Aufruf, keine KI - bewusst einfach gehalten und nachvollziehbar.
Jede zutreffende Regel liefert Punkte, die Summe ergibt den risk_score. Ab
RISK_SCORE_THRESHOLD wird eine Anfrage in die Quarantäne (pending_review)
gestellt, darunter automatisch freigegeben (auto_approved).
"""
import re
from datetime import timedelta

from django.db.models import Q
from django.utils import timezone

# Schwellwert: ab hier gilt eine Anfrage als verdächtig genug für manuelle Prüfung.
# Bewusst konservativ gewählt, damit einzelne kleine Auffälligkeiten (z.B. nur eine
# etwas lange Nachricht) noch nicht sofort in die Quarantäne wandern, ein klarer
# Phishing-Indikator (z.B. Link in der Nachricht) aber allein schon reicht.
RISK_SCORE_THRESHOLD = 5

# Zeitfenster und Grenze für das Rate-Limit-Signal (mehrere Anfragen von
# derselben IP/E-Mail in kurzer Zeit deuten auf automatisierten Spam hin).
RATE_LIMIT_WINDOW = timedelta(hours=1)
RATE_LIMIT_MAX_SUBMISSIONS = 5

# Typische Freemail-/Wegwerf-Domains, die für sich genommen kein Fake sind,
# aber in Kombination mit anderen Auffälligkeiten mitzählen.
DISPOSABLE_EMAIL_DOMAINS = {
    'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com',
    'trashmail.com', 'yopmail.com', 'throwawaymail.com', 'fakeinbox.com',
}

URL_PATTERN = re.compile(r'(https?://|www\.)\S+', re.IGNORECASE)
# Grobe Plausibilitätsprüfung für Telefonnummern: Ziffern, optionale Trennzeichen,
# mindestens 6 Ziffern insgesamt.
PHONE_DIGITS_PATTERN = re.compile(r'[\d]')
PHONE_ALLOWED_CHARS_PATTERN = re.compile(r'^[\d\s()+\-/]+$')

MAX_NORMAL_MESSAGE_LENGTH = 500
MAX_PARTY_SIZE = 30
MAX_FUTURE_DAYS = 365


def _is_malformed_email(email: str) -> bool:
    """Sehr einfache Formatprüfung - der Serializer validiert die E-Mail bewusst nicht
    hart, daher hier: kein '@', keine TLD, Wegwerf-Domains."""
    if not email:
        return False
    if '@' not in email:
        return True
    domain = email.split('@')[-1].lower()
    if domain in DISPOSABLE_EMAIL_DOMAINS:
        return True
    if '.' not in domain:
        return True
    return False


def _is_malformed_phone(phone: str) -> bool:
    """Prüft, ob die Telefonnummer grob wie eine echte Nummer aussieht."""
    if not phone:
        return True
    if not PHONE_ALLOWED_CHARS_PATTERN.match(phone):
        return True
    digit_count = len(PHONE_DIGITS_PATTERN.findall(phone))
    return digit_count < 6 or digit_count > 15


def _has_excessive_repeated_chars(text: str) -> bool:
    """Erkennt z.B. '!!!!!!!!!!' oder '$$$$$$$' als Spam-Muster."""
    return bool(re.search(r'(.)\1{6,}', text))


def score_submission(*, first_name, last_name, phone_number, email,
                      requested_time, number_of_guests, message,
                      source_ip=None, recent_requests_queryset=None):
    """
    Berechnet risk_score und Liste der zutreffenden Gründe für eine eingehende
    Reservierungsanfrage.

    `recent_requests_queryset` ist optional der ReservationRequest-Queryset,
    über den das Rate-Limit-Signal geprüft wird (zur Entkopplung von Models,
    damit diese Funktion isoliert testbar bleibt).
    """
    reasons = []
    score = 0
    message = message or ''

    # E-Mail
    if _is_malformed_email(email):
        score += 3
        reasons.append('E-Mail-Adresse wirkt unecht oder ist eine Wegwerf-Domain')

    # Telefonnummer
    if _is_malformed_phone(phone_number):
        score += 3
        reasons.append('Telefonnummer entspricht keinem plausiblen Format')

    # Links in der Nachricht - klassisches Phishing/Spam-Muster
    if URL_PATTERN.search(message):
        score += 5
        reasons.append('Nachricht enthält einen Link/URL')

    # Ungewöhnlich lange Nachricht
    if len(message) > MAX_NORMAL_MESSAGE_LENGTH:
        score += 2
        reasons.append(f'Nachricht ist ungewöhnlich lang (>{MAX_NORMAL_MESSAGE_LENGTH} Zeichen)')

    # Viele wiederholte Sonderzeichen
    if _has_excessive_repeated_chars(message):
        score += 2
        reasons.append('Nachricht enthält auffällig viele wiederholte Zeichen')

    # Gruppengröße
    if number_of_guests and number_of_guests > MAX_PARTY_SIZE:
        score += 3
        reasons.append(f'Ungewöhnlich große Gruppe (> {MAX_PARTY_SIZE} Gäste)')

    # Datum plausibel?
    if requested_time is not None:
        now = timezone.now()
        if requested_time < now - timedelta(days=1):
            # Allein ausreichend für Quarantäne - sonst entstünde eine echte
            # Reservierung in der Vergangenheit.
            score += RISK_SCORE_THRESHOLD
            reasons.append('Gewünschter Zeitpunkt liegt in der Vergangenheit')
        elif requested_time > now + timedelta(days=MAX_FUTURE_DAYS):
            score += 2
            reasons.append(f'Gewünschter Zeitpunkt liegt mehr als {MAX_FUTURE_DAYS} Tage in der Zukunft')

    # Häufung von Anfragen (Abuse-/Rate-Limit-Signal)
    if recent_requests_queryset is not None:
        window_start = timezone.now() - RATE_LIMIT_WINDOW
        recent = recent_requests_queryset.filter(submitted_at__gte=window_start)
        matching = recent.none()
        filters = Q()
        if source_ip:
            filters |= Q(source_ip=source_ip)
        if email:
            filters |= Q(email__iexact=email)
        if filters:
            matching = recent.filter(filters)
        if matching.count() >= RATE_LIMIT_MAX_SUBMISSIONS:
            # Allein ausreichend für Quarantäne - sonst erzeugt eine Flut
            # unauffälliger Anfragen beliebig viele echte Reservierungen.
            score += RISK_SCORE_THRESHOLD
            reasons.append(
                f'Mehr als {RATE_LIMIT_MAX_SUBMISSIONS} Anfragen von gleicher IP/E-Mail innerhalb einer Stunde'
            )

    return score, reasons


def is_auto_approved(risk_score: int) -> bool:
    """Zentrale Schwellwert-Entscheidung, damit sie nur an einer Stelle steht."""
    return risk_score < RISK_SCORE_THRESHOLD
