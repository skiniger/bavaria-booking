import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from django.core.validators import MinValueValidator

class Area(models.Model):
    """Servicebereiche: Wirtshaus, Wintergarten, Biergarten"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True, verbose_name="Bereichsname")
    description = models.TextField(blank=True, null=True, verbose_name="Beschreibung")
    total_capacity = models.PositiveIntegerField(default=0, verbose_name="Gesamtkapazität")
    color_code = models.CharField(max_length=7, default="#3B82F6", verbose_name="Farbcode")
    color = models.CharField(
        max_length=20,
        choices=[
            ('blue', 'Blau'), ('green', 'Grün'), ('yellow', 'Gelb'), ('red', 'Rot'),
            ('purple', 'Lila'), ('orange', 'Orange'), ('pink', 'Pink'), ('indigo', 'Indigo'),
        ],
        default='blue',
        verbose_name="Anzeigefarbe",
    )
    location = models.CharField(max_length=100, blank=True, verbose_name="Lage (z. B. Erdgeschoss)")
    layout_width = models.PositiveIntegerField(
        default=10, validators=[MinValueValidator(5)], verbose_name="Layout-Breite (Raster)",
    )
    layout_height = models.PositiveIntegerField(
        default=10, validators=[MinValueValidator(5)], verbose_name="Layout-Höhe (Raster)",
    )
    is_active = models.BooleanField(default=True, verbose_name="Aktiv")
    allows_combinations = models.BooleanField(default=True, verbose_name="Tischkombinationen erlaubt")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Bereich"
        verbose_name_plural = "Bereiche"
        ordering = ['name']

class Table(models.Model):
    """Tische in den verschiedenen Bereichen"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    area = models.ForeignKey(Area, on_delete=models.CASCADE, related_name="tables", verbose_name="Bereich")
    table_number = models.CharField(max_length=10, verbose_name="Tischnummer")
    capacity = models.PositiveIntegerField(verbose_name="Kapazität")
    status = models.CharField(
        max_length=20,
        choices=[
            ('available', 'Verfügbar'),
            ('occupied', 'Besetzt'),
            ('reserved', 'Reserviert'),
            ('out_of_service', 'Außer Betrieb'),
        ],
        default='available',
        verbose_name="Status"
    )
    is_reservable = models.BooleanField(default=True, verbose_name="Reservierbar")
    is_combinable = models.BooleanField(default=False, verbose_name="Kombinierbar")
    position_x = models.IntegerField(default=0, verbose_name="Position X")
    position_y = models.IntegerField(default=0, verbose_name="Position Y")
    rotation = models.PositiveIntegerField(default=0, verbose_name="Drehung (Grad)")
    notes = models.TextField(blank=True, null=True, verbose_name="Notizen")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.area.name} - Tisch {self.table_number}"

    class Meta:
        verbose_name = "Tisch"
        verbose_name_plural = "Tische"
        unique_together = ('area', 'table_number')
        ordering = ['area__name', 'table_number']

class Guest(models.Model):
    """Gäste für Restaurant-Reservierungen"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    first_name = models.CharField(max_length=100, verbose_name="Vorname")
    last_name = models.CharField(max_length=100, verbose_name="Nachname")
    phone_number = models.CharField(max_length=20, verbose_name="Telefonnummer")
    email = models.EmailField(blank=True, null=True, verbose_name="E-Mail")
    allergies = models.TextField(blank=True, null=True, verbose_name="Allergien")
    special_requests = models.TextField(blank=True, null=True, verbose_name="Besondere Wünsche")
    notes = models.TextField(blank=True, null=True, verbose_name="Notizen/Präferenzen")
    gdpr_consent = models.BooleanField(default=False, verbose_name="DSGVO-Einwilligung")
    gdpr_consent_date = models.DateTimeField(null=True, blank=True, verbose_name="DSGVO-Einwilligung Datum")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.phone_number})"

    class Meta:
        verbose_name = "Gast"
        verbose_name_plural = "Gäste"
        ordering = ['last_name', 'first_name']

class Reservation(models.Model):
    """Restaurant-Reservierungen"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    guest = models.ForeignKey(Guest, on_delete=models.PROTECT, related_name="reservations", verbose_name="Gast")
    table = models.ForeignKey(Table, on_delete=models.SET_NULL, null=True, blank=True, related_name="reservations", verbose_name="Tisch")
    reservation_time = models.DateTimeField(verbose_name="Reservierungszeitpunkt")
    duration_minutes = models.PositiveIntegerField(default=120, verbose_name="Dauer (Minuten)")
    number_of_guests = models.PositiveIntegerField(verbose_name="Anzahl Gäste")
    status = models.CharField(
        max_length=30,
        choices=[
            ('pending_confirmation', 'Bestätigung ausstehend'),
            ('confirmed', 'Bestätigt'),
            ('checked_in', 'Eingecheckt'),
            ('checked_out', 'Ausgecheckt'),
            ('cancelled_by_guest', 'Storniert (Gast)'),
            ('cancelled_by_restaurant', 'Storniert (Restaurant)'),
            ('completed', 'Abgeschlossen'),
            ('no_show', 'Nicht erschienen'),
        ],
        default='pending_confirmation',
        verbose_name="Status"
    )
    payment_method = models.CharField(
        max_length=20,
        choices=[
            ('cash', 'Bar'),
            ('ec', 'EC-Karte'),
            ('credit_card', 'Kreditkarte'),
            ('invoice', 'Rechnung'),
        ],
        null=True,
        blank=True,
        verbose_name="Zahlungsart"
    )
    check_in_time = models.DateTimeField(null=True, blank=True, verbose_name="Check-in Zeit")
    check_out_time = models.DateTimeField(null=True, blank=True, verbose_name="Check-out Zeit")
    notes = models.TextField(blank=True, null=True, verbose_name="Spezielle Wünsche")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        table_info = f"Tisch {self.table.table_number}" if self.table else "Kein Tisch zugewiesen"
        return f"Reservierung für {self.guest} am {self.reservation_time.strftime('%d.%m.%Y %H:%M')} ({table_info})"

    class Meta:
        verbose_name = "Reservierung"
        verbose_name_plural = "Reservierungen"
        ordering = ['-reservation_time']

class ReservationRequest(models.Model):
    """
    Quarantäne für eingehende öffentliche Reservierungsanfragen (Restaurant & Pension).
    Nichts wird hier je stillschweigend verworfen - verdächtige Anfragen bleiben
    als Datensatz erhalten, bis ein Mitarbeiter sie freigibt oder ablehnt.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Rohdaten der Anfrage, wie vom Gast übermittelt
    first_name = models.CharField(max_length=100, verbose_name="Vorname")
    last_name = models.CharField(max_length=100, verbose_name="Nachname")
    phone_number = models.CharField(max_length=20, verbose_name="Telefonnummer")
    email = models.EmailField(blank=True, null=True, verbose_name="E-Mail")
    requested_time = models.DateTimeField(verbose_name="Gewünschter Zeitpunkt")
    number_of_guests = models.PositiveIntegerField(verbose_name="Anzahl Gäste")
    message = models.TextField(blank=True, null=True, verbose_name="Nachricht/Sonderwünsche")

    # Herkunft & Prüfung
    source_ip = models.GenericIPAddressField(null=True, blank=True, verbose_name="Quell-IP")
    submitted_at = models.DateTimeField(auto_now_add=True, verbose_name="Eingegangen am")
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending_review', 'Prüfung ausstehend'),
            ('approved', 'Freigegeben'),
            ('rejected', 'Abgelehnt'),
            ('auto_approved', 'Automatisch freigegeben'),
        ],
        default='pending_review',
        verbose_name="Status"
    )
    risk_score = models.IntegerField(default=0, verbose_name="Risiko-Score")
    risk_reasons = models.JSONField(default=list, blank=True, verbose_name="Risiko-Gründe")

    # Verknüpfung zur tatsächlich erstellten Reservierung (nach Freigabe)
    reservation = models.ForeignKey(
        'Reservation', on_delete=models.SET_NULL, null=True, blank=True,
        related_name="source_requests", verbose_name="Erstellte Reservierung"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name="Geprüft am")

    def __str__(self):
        return f"Anfrage {self.first_name} {self.last_name} ({self.status}, Score {self.risk_score})"

    class Meta:
        verbose_name = "Reservierungsanfrage"
        verbose_name_plural = "Reservierungsanfragen"
        ordering = ['-submitted_at']


class TableCombination(models.Model):
    """Kombinierte Tische für größere Gruppen"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, verbose_name="Kombinationsname")
    tables = models.ManyToManyField(Table, related_name="combinations", verbose_name="Tische")
    total_capacity = models.PositiveIntegerField(verbose_name="Gesamtkapazität")
    is_active = models.BooleanField(default=True, verbose_name="Aktiv")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Tischkombination"
        verbose_name_plural = "Tischkombinationen"


class Employee(AbstractUser):
    """Mitarbeiter mit erweiterten Feldern"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee_number = models.CharField(max_length=20, unique=True, verbose_name="Personalnummer")
    role = models.CharField(
        max_length=20,
        choices=[
            ('admin', 'Admin (Vollzugriff + Erweiterungen)'),
            ('manager', 'Manager (Vollzugriff ohne Erweiterungen)'),
            ('staff', 'Personal (Standard)'),
        ],
        default='staff',
        verbose_name="Rolle"
    )
    phone = models.CharField(max_length=20, blank=True, null=True, verbose_name="Telefon")
    is_active_employee = models.BooleanField(default=True, verbose_name="Aktiver Mitarbeiter")
    can_simultaneous_login = models.BooleanField(default=True, verbose_name="Simultanes Anmelden erlaubt")
    last_check_in = models.DateTimeField(null=True, blank=True, verbose_name="Letzter Check-in")
    last_check_out = models.DateTimeField(null=True, blank=True, verbose_name="Letzter Check-out")

    class Meta:
        verbose_name = "Mitarbeiter"
        verbose_name_plural = "Mitarbeiter"


class TimeTracking(models.Model):
    """Zeiterfassung für Mitarbeiter"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="time_entries", verbose_name="Mitarbeiter")
    check_in = models.DateTimeField(verbose_name="Check-in")
    check_out = models.DateTimeField(null=True, blank=True, verbose_name="Check-out")
    auto_logout = models.BooleanField(default=False, verbose_name="Auto-Logout")
    manual_correction = models.BooleanField(default=False, verbose_name="Manuelle Korrektur")
    correction_note = models.TextField(blank=True, null=True, verbose_name="Korrektur Notiz")
    break_minutes = models.PositiveIntegerField(default=0, verbose_name="Pause (Minuten)")
    total_hours = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name="Gesamtstunden")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.check_out and self.check_in:
            duration = self.check_out - self.check_in
            self.total_hours = duration.total_seconds() / 3600
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.employee.username} - {self.check_in.strftime('%d.%m.%Y %H:%M')}"

    class Meta:
        verbose_name = "Zeiterfassung"
        verbose_name_plural = "Zeiterfassungen"
        ordering = ['-check_in']


class PensionGuest(models.Model):
    """Pensionsgäste für Meldeschein"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    salutation = models.CharField(max_length=20, choices=[('herr', 'Herr'), ('frau', 'Frau'), ('divers', 'Divers')], verbose_name="Anrede")
    first_name = models.CharField(max_length=100, verbose_name="Vorname")
    last_name = models.CharField(max_length=100, verbose_name="Nachname")
    birth_date = models.DateField(verbose_name="Geburtsdatum")
    nationality = models.CharField(max_length=50, verbose_name="Staatsangehörigkeit")

    # Adresse
    street = models.CharField(max_length=200, verbose_name="Straße")
    house_number = models.CharField(max_length=10, verbose_name="Hausnummer")
    postal_code = models.CharField(max_length=10, verbose_name="Postleitzahl")
    city = models.CharField(max_length=100, verbose_name="Ort")
    country = models.CharField(max_length=50, verbose_name="Land")

    # Dokumente
    document_type = models.CharField(
        max_length=20,
        choices=[
            ('id_card', 'Personalausweis'),
            ('passport', 'Reisepass'),
            ('driving_license', 'Führerschein'),
        ],
        verbose_name="Dokumenttyp"
    )
    document_number = models.CharField(max_length=50, verbose_name="Dokumentnummer")

    # Kontakt
    email = models.EmailField(blank=True, null=True, verbose_name="E-Mail")
    phone = models.CharField(max_length=20, blank=True, null=True, verbose_name="Telefon")

    # DSGVO
    gdpr_consent = models.BooleanField(default=False, verbose_name="DSGVO-Einwilligung")
    gdpr_consent_date = models.DateTimeField(null=True, blank=True, verbose_name="DSGVO-Einwilligung Datum")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    class Meta:
        verbose_name = "Pensionsgast"
        verbose_name_plural = "Pensionsgäste"
        ordering = ['last_name', 'first_name']


class RegistrationForm(models.Model):
    """BMG-konformer Meldeschein für Pensionsgäste"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    guest = models.ForeignKey(PensionGuest, on_delete=models.PROTECT, related_name="registrations", verbose_name="Gast")

    # Aufenthaltsdaten
    arrival_date = models.DateField(verbose_name="Anreisedatum")
    departure_date = models.DateField(verbose_name="Abreisedatum")
    room_number = models.CharField(max_length=10, verbose_name="Zimmernummer")

    # Reisezweck
    travel_purpose = models.CharField(
        max_length=20,
        choices=[
            ('private', 'Privat'),
            ('business', 'Geschäftlich'),
        ],
        verbose_name="Reisezweck"
    )
    company_name = models.CharField(max_length=200, blank=True, null=True, verbose_name="Firmenname")
    company_address = models.TextField(blank=True, null=True, verbose_name="Firmenadresse")

    # Kurtaxe
    tourist_tax_required = models.BooleanField(default=True, verbose_name="Kurtaxepflichtig")
    tourist_tax_exemption_reason = models.TextField(blank=True, null=True, verbose_name="Befreiungsgrund Kurtaxe")
    tourist_tax_amount = models.DecimalField(max_digits=6, decimal_places=2, default=0, validators=[MinValueValidator(0)], verbose_name="Kurtaxe Betrag")

    # Frühstück
    breakfast_included = models.BooleanField(default=False, verbose_name="Frühstück inklusive")
    breakfast_price = models.DecimalField(max_digits=6, decimal_places=2, default=0, validators=[MinValueValidator(0)], verbose_name="Frühstück Preis")

    # Zahlungsinformationen
    room_price_per_night = models.DecimalField(max_digits=8, decimal_places=2, validators=[MinValueValidator(0)], verbose_name="Zimmerpreis pro Nacht")
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)], verbose_name="Gesamtsumme")
    payment_method = models.CharField(
        max_length=20,
        choices=[
            ('cash', 'Bar'),
            ('ec', 'EC-Karte'),
            ('credit_card', 'Kreditkarte'),
            ('invoice', 'Rechnung'),
        ],
        verbose_name="Zahlungsart"
    )
    payment_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Ausstehend'),
            ('paid', 'Bezahlt'),
            ('partially_paid', 'Teilweise bezahlt'),
        ],
        default='pending',
        verbose_name="Zahlungsstatus"
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=[
            ('draft', 'Entwurf'),
            ('confirmed', 'Bestätigt'),
            ('checked_in', 'Eingecheckt'),
            ('checked_out', 'Ausgecheckt'),
            ('cancelled', 'Storniert'),
        ],
        default='draft',
        verbose_name="Status"
    )

    # BMG Export
    exported_to_city = models.BooleanField(default=False, verbose_name="An Stadt exportiert")
    export_date = models.DateTimeField(null=True, blank=True, verbose_name="Exportdatum")

    notes = models.TextField(blank=True, null=True, verbose_name="Notizen")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Calculate total amount
        nights = (self.departure_date - self.arrival_date).days
        room_total = self.room_price_per_night * nights
        breakfast_total = self.breakfast_price * nights if self.breakfast_included else 0
        self.total_amount = room_total + breakfast_total + self.tourist_tax_amount
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Meldeschein {self.guest} - {self.arrival_date} bis {self.departure_date}"

    class Meta:
        verbose_name = "Meldeschein"
        verbose_name_plural = "Meldescheine"
        ordering = ['-arrival_date']


class SystemSettings(models.Model):
    """Systemkonfiguration und Firmendaten"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Firmendaten
    company_name = models.CharField(max_length=200, verbose_name="Firmenname")
    company_street = models.CharField(max_length=200, verbose_name="Straße")
    company_postal_code = models.CharField(max_length=10, verbose_name="PLZ")
    company_city = models.CharField(max_length=100, verbose_name="Ort")
    company_phone = models.CharField(max_length=20, verbose_name="Telefon")
    company_email = models.EmailField(verbose_name="E-Mail")
    company_website = models.URLField(blank=True, null=True, verbose_name="Website")
    company_logo_url = models.URLField(blank=True, null=True, verbose_name="Logo URL")
    tax_id = models.CharField(max_length=50, blank=True, null=True, verbose_name="Steuernummer")
    vat_id = models.CharField(max_length=50, blank=True, null=True, verbose_name="USt-ID")

    # Reservierungs-Einstellungen
    default_reservation_duration = models.PositiveIntegerField(default=120, verbose_name="Standard Reservierungsdauer (Min)")
    reservation_lead_time = models.PositiveIntegerField(default=90, verbose_name="Vorlaufzeit für Reservierungen (Tage)")
    max_guests_per_reservation = models.PositiveIntegerField(default=20, verbose_name="Max. Gäste pro Reservierung")

    # Kurtaxe-Einstellungen
    tourist_tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=2.50, verbose_name="Kurtaxe pro Nacht")
    tourist_tax_enabled = models.BooleanField(default=True, verbose_name="Kurtaxe aktiv")

    # System-Einstellungen
    auto_logout_hours = models.PositiveIntegerField(default=24, verbose_name="Auto-Logout nach (Stunden)")
    timezone = models.CharField(max_length=50, default='Europe/Berlin', verbose_name="Zeitzone")
    language = models.CharField(max_length=10, default='de', verbose_name="Sprache")

    # Backup-Einstellungen
    backup_frequency_hours = models.PositiveIntegerField(default=8, verbose_name="Backup-Frequenz (Stunden)")
    last_backup = models.DateTimeField(null=True, blank=True, verbose_name="Letztes Backup")

    # E-Mail-Einstellungen
    smtp_host = models.CharField(max_length=200, blank=True, null=True, verbose_name="SMTP Server")
    smtp_port = models.PositiveIntegerField(default=587, verbose_name="SMTP Port")
    smtp_username = models.CharField(max_length=200, blank=True, null=True, verbose_name="SMTP Benutzername")
    smtp_password = models.CharField(max_length=200, blank=True, null=True, verbose_name="SMTP Passwort")
    smtp_use_tls = models.BooleanField(default=True, verbose_name="SMTP TLS verwenden")
    email_from_address = models.EmailField(blank=True, null=True, verbose_name="Absender E-Mail")

    # DSGVO-Einstellungen
    gdpr_consent_text = models.TextField(
        default="Ich stimme der Verarbeitung meiner personenbezogenen Daten gemäß der Datenschutzerklärung zu.",
        verbose_name="DSGVO-Einwilligungstext"
    )
    gdpr_guest_retention_months = models.PositiveIntegerField(default=24, verbose_name="Gäste-Daten Aufbewahrung (Monate)")
    gdpr_reservation_retention_months = models.PositiveIntegerField(default=12, verbose_name="Reservierungs-Daten Aufbewahrung (Monate)")
    gdpr_timetracking_retention_years = models.PositiveIntegerField(default=10, verbose_name="Zeiterfassungs-Daten Aufbewahrung (Jahre)")

    # Öffnungszeiten (deprecated - use OpeningHours model instead)
    opening_hours = models.JSONField(default=dict, verbose_name="Öffnungszeiten", blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.company_name

    class Meta:
        verbose_name = "Systemeinstellung"
        verbose_name_plural = "Systemeinstellungen"


class OpeningHours(models.Model):
    """Öffnungszeiten pro Servicebereich und Wochentag"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    area = models.ForeignKey(Area, on_delete=models.CASCADE, related_name="opening_hours", verbose_name="Bereich")

    # Wochentag (0 = Montag, 6 = Sonntag)
    weekday = models.PositiveSmallIntegerField(
        choices=[
            (0, 'Montag'),
            (1, 'Dienstag'),
            (2, 'Mittwoch'),
            (3, 'Donnerstag'),
            (4, 'Freitag'),
            (5, 'Samstag'),
            (6, 'Sonntag'),
        ],
        verbose_name="Wochentag"
    )

    is_closed = models.BooleanField(default=False, verbose_name="Geschlossen")
    open_time = models.TimeField(null=True, blank=True, verbose_name="Öffnungszeit")
    close_time = models.TimeField(null=True, blank=True, verbose_name="Schließzeit")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        weekday_name = self.get_weekday_display()
        if self.is_closed:
            return f"{self.area.name} - {weekday_name}: Geschlossen"
        return f"{self.area.name} - {weekday_name}: {self.open_time} - {self.close_time}"

    class Meta:
        verbose_name = "Öffnungszeit"
        verbose_name_plural = "Öffnungszeiten"
        unique_together = ('area', 'weekday')
        ordering = ['area', 'weekday']


class SpecialOpeningHours(models.Model):
    """Sonder-Öffnungszeiten (Feiertage, besondere Events)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    area = models.ForeignKey(Area, on_delete=models.CASCADE, related_name="special_opening_hours", verbose_name="Bereich")

    date = models.DateField(verbose_name="Datum")
    description = models.CharField(max_length=200, verbose_name="Beschreibung")

    is_closed = models.BooleanField(default=False, verbose_name="Geschlossen")
    open_time = models.TimeField(null=True, blank=True, verbose_name="Öffnungszeit")
    close_time = models.TimeField(null=True, blank=True, verbose_name="Schließzeit")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        if self.is_closed:
            return f"{self.area.name} - {self.date}: {self.description} (Geschlossen)"
        return f"{self.area.name} - {self.date}: {self.description} ({self.open_time} - {self.close_time})"

    class Meta:
        verbose_name = "Sonder-Öffnungszeit"
        verbose_name_plural = "Sonder-Öffnungszeiten"
        unique_together = ('area', 'date')
        ordering = ['date']


# ============================================================================
# PHASE 3: KI & ANALYTICS MODELS
# ============================================================================

class ChatConversation(models.Model):
    """MeitiAI Chat-Konversationen"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="chat_conversations", verbose_name="Mitarbeiter")
    title = models.CharField(max_length=200, verbose_name="Titel", blank=True, null=True)
    is_active = models.BooleanField(default=True, verbose_name="Aktiv")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        title = self.title or f"Konversation {self.created_at.strftime('%d.%m.%Y %H:%M')}"
        return f"{self.employee.username} - {title}"

    class Meta:
        verbose_name = "Chat-Konversation"
        verbose_name_plural = "Chat-Konversationen"
        ordering = ['-updated_at']


class ChatMessage(models.Model):
    """Einzelne Chat-Nachrichten"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(ChatConversation, on_delete=models.CASCADE, related_name="messages", verbose_name="Konversation")

    role = models.CharField(
        max_length=20,
        choices=[
            ('user', 'Benutzer'),
            ('assistant', 'Assistent'),
            ('system', 'System'),
        ],
        verbose_name="Rolle"
    )
    content = models.TextField(verbose_name="Nachricht")

    # Optional: Metadata für KI-Kontext
    metadata = models.JSONField(default=dict, blank=True, verbose_name="Metadaten")

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        preview = self.content[:50] + "..." if len(self.content) > 50 else self.content
        return f"{self.role}: {preview}"

    class Meta:
        verbose_name = "Chat-Nachricht"
        verbose_name_plural = "Chat-Nachrichten"
        ordering = ['created_at']


class AnalyticsSnapshot(models.Model):
    """Tägliche/Wöchentliche Analytics-Snapshots für Trends"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    snapshot_date = models.DateField(verbose_name="Snapshot-Datum", unique=True)

    # Reservierungs-Statistiken
    total_reservations = models.PositiveIntegerField(default=0, verbose_name="Gesamt Reservierungen")
    confirmed_reservations = models.PositiveIntegerField(default=0, verbose_name="Bestätigte Reservierungen")
    cancelled_reservations = models.PositiveIntegerField(default=0, verbose_name="Stornierte Reservierungen")
    no_show_count = models.PositiveIntegerField(default=0, verbose_name="No-Shows")

    # Auslastungs-Statistiken
    average_occupancy_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name="Durchschnittl. Auslastung %")
    peak_occupancy_time = models.TimeField(null=True, blank=True, verbose_name="Haupt-Auslastungszeit")

    # Gäste-Statistiken
    total_guests_served = models.PositiveIntegerField(default=0, verbose_name="Gesamt bediente Gäste")
    average_party_size = models.DecimalField(max_digits=4, decimal_places=2, default=0, verbose_name="Durchschnittl. Gruppengröße")

    # Umsatz (optional)
    total_revenue = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)], verbose_name="Gesamtumsatz")

    # KI-generierte Insights
    ai_insights = models.JSONField(default=list, blank=True, verbose_name="KI-Insights")

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Analytics {self.snapshot_date}"

    class Meta:
        verbose_name = "Analytics-Snapshot"
        verbose_name_plural = "Analytics-Snapshots"
        ordering = ['-snapshot_date']


class CapacityRecommendation(models.Model):
    """KI-generierte Empfehlungen für Kapazitätsoptimierung"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    date = models.DateField(verbose_name="Datum")
    time_slot = models.TimeField(verbose_name="Zeitslot")
    area = models.ForeignKey(Area, on_delete=models.CASCADE, related_name="capacity_recommendations", verbose_name="Bereich")

    # Vorhersage
    predicted_occupancy = models.DecimalField(max_digits=5, decimal_places=2, verbose_name="Vorhergesagte Auslastung %")
    confidence_score = models.DecimalField(max_digits=4, decimal_places=2, verbose_name="Konfidenz-Score")

    # Empfehlung
    recommendation_type = models.CharField(
        max_length=30,
        choices=[
            ('increase_staff', 'Personal aufstocken'),
            ('reduce_staff', 'Personal reduzieren'),
            ('optimize_tables', 'Tische optimieren'),
            ('accept_more_reservations', 'Mehr Reservierungen annehmen'),
            ('limit_reservations', 'Reservierungen begrenzen'),
            ('normal_operations', 'Normaler Betrieb'),
        ],
        verbose_name="Empfehlungstyp"
    )
    recommendation_text = models.TextField(verbose_name="Empfehlungstext")

    # Basis der Empfehlung
    based_on_data = models.JSONField(default=dict, verbose_name="Datenbasis")

    is_applied = models.BooleanField(default=False, verbose_name="Angewendet")
    applied_at = models.DateTimeField(null=True, blank=True, verbose_name="Angewendet am")

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.area.name} - {self.date} {self.time_slot}: {self.recommendation_type}"

    class Meta:
        verbose_name = "Kapazitäts-Empfehlung"
        verbose_name_plural = "Kapazitäts-Empfehlungen"
        ordering = ['-date', '-time_slot']
        unique_together = ('date', 'time_slot', 'area')
