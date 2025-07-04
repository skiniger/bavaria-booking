import uuid
from django.db import models
from django.utils import timezone

class Area(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True, verbose_name="Bereichsname")
    description = models.TextField(blank=True, null=True, verbose_name="Beschreibung")
    is_active = models.BooleanField(default=True, verbose_name="Aktiv")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Bereich"
        verbose_name_plural = "Bereiche"
        ordering = ['name']

class Table(models.Model):
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
    notes = models.TextField(blank=True, null=True, verbose_name="Notizen")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.area.name} - Tisch {self.table_number}"

    class Meta:
        verbose_name = "Tisch"
        verbose_name_plural = "Tische"
        unique_together = ('area', 'table_number') # Tischnummer muss pro Bereich eindeutig sein
        ordering = ['area__name', 'table_number']

class Guest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    first_name = models.CharField(max_length=100, verbose_name="Vorname")
    last_name = models.CharField(max_length=100, verbose_name="Nachname")
    phone_number = models.CharField(max_length=20, unique=True, verbose_name="Telefonnummer")
    email = models.EmailField(blank=True, null=True, unique=True, verbose_name="E-Mail")
    notes = models.TextField(blank=True, null=True, verbose_name="Notizen/Präferenzen")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.phone_number})"

    class Meta:
        verbose_name = "Gast"
        verbose_name_plural = "Gäste"
        ordering = ['last_name', 'first_name']

class Reservation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    guest = models.ForeignKey(Guest, on_delete=models.PROTECT, related_name="reservations", verbose_name="Gast") # Gast nicht löschen, wenn Reservierung existiert
    table = models.ForeignKey(Table, on_delete=models.SET_NULL, null=True, blank=True, related_name="reservations", verbose_name="Tisch") # Tisch kann ggf. gelöscht werden, Reservierung bleibt bestehen (ggf. umbuchen)
    reservation_time = models.DateTimeField(verbose_name="Reservierungszeitpunkt")
    duration_minutes = models.PositiveIntegerField(default=120, verbose_name="Dauer (Minuten)")
    number_of_guests = models.PositiveIntegerField(verbose_name="Anzahl Gäste")
    status = models.CharField(
        max_length=30,
        choices=[
            ('pending_confirmation', 'Bestätigung ausstehend'),
            ('confirmed', 'Bestätigt'),
            ('cancelled_by_guest', 'Storniert (Gast)'),
            ('cancelled_by_restaurant', 'Storniert (Restaurant)'),
            ('completed', 'Abgeschlossen'),
            ('no_show', 'Nicht erschienen'),
        ],
        default='pending_confirmation',
        verbose_name="Status"
    )
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

    # Geschäftslogik, z.B. für Verfügbarkeitsprüfung, würde hier oder in Services/Managern platziert werden.
    # def clean(self):
    #     # Beispiel: Überprüfen, ob der Tisch zur gewünschten Zeit verfügbar ist.
    #     # Diese Logik ist komplexer und würde andere Reservierungen für den Tisch berücksichtigen.
    #     super().clean()
    #     if self.table and self.reservation_time:
    #         end_time = self.reservation_time + timezone.timedelta(minutes=self.duration_minutes)
    #         overlapping_reservations = Reservation.objects.filter(
    #             table=self.table,
    #             status__in=['confirmed', 'pending_confirmation'], # Nur aktive Reservierungen prüfen
    #             reservation_time__lt=end_time,
    #             #reservation_time + duration > self.reservation_time
    #         ).exclude(id=self.id) # Eigene Reservierung ausschließen (für Updates)
    #         # TODO: Die Endzeit der anderen Reservierungen muss auch beachtet werden.
    #         # Dies ist eine vereinfachte Prüfung.
    #         # Eine korrekte Prüfung wäre:
    #         # (start1 < end2) and (end1 > start2)
    #         # (self.reservation_time < other.reservation_time + other.duration) and \
    #         # (self.reservation_time + self.duration_minutes > other.reservation_time)

    #         if overlapping_reservations.exists():
    #             raise models.ValidationError(f"Tisch {self.table} ist zu dieser Zeit bereits reserviert.")

# Um die Django App bekannt zu machen, muss sie in settings.py eingetragen werden.
# Und es braucht eine __init__.py im app_core Verzeichnis.
# Und eine apps.py Datei.
# Und es muss eine Migration erstellt und ausgeführt werden.
