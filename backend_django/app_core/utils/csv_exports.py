"""
CSV Export Utilities for BAVARIABOOKINGX
Generates CSV files for time tracking and guest data
"""

import csv
from io import StringIO
from datetime import datetime, timedelta
from django.utils import timezone


class CSVExporter:
    """Base class for CSV exports with common formatting"""

    def _format_date(self, date_value):
        """Format date in German format (DD.MM.YYYY)"""
        if not date_value:
            return ""
        if isinstance(date_value, str):
            try:
                date_value = datetime.fromisoformat(date_value.replace('Z', '+00:00'))
            except:
                return date_value
        return date_value.strftime('%d.%m.%Y')

    def _format_datetime(self, datetime_value):
        """Format datetime in German format (DD.MM.YYYY HH:MM)"""
        if not datetime_value:
            return ""
        if isinstance(datetime_value, str):
            try:
                datetime_value = datetime.fromisoformat(datetime_value.replace('Z', '+00:00'))
            except:
                return datetime_value
        return datetime_value.strftime('%d.%m.%Y %H:%M')

    def _format_time(self, time_value):
        """Format time (HH:MM)"""
        if not time_value:
            return ""
        if isinstance(time_value, str):
            return time_value
        return time_value.strftime('%H:%M')

    def _format_boolean(self, bool_value):
        """Format boolean as Ja/Nein"""
        if bool_value is None:
            return ""
        return "Ja" if bool_value else "Nein"

    def _format_currency(self, amount):
        """Format currency in German format"""
        if amount is None:
            return ""
        # German format: 1.234,56 €
        formatted = f"{amount:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
        return f"{formatted} €"


class TimeTrackingCSVExporter(CSVExporter):
    """Export time tracking data as CSV"""

    def generate_time_tracking_csv(self, time_entries, date_from=None, date_to=None):
        """
        Generate CSV for time tracking entries

        Args:
            time_entries: QuerySet or list of TimeTracking objects
            date_from: Optional start date for filtering
            date_to: Optional end date for filtering

        Returns:
            StringIO buffer containing CSV data
        """
        buffer = StringIO()
        writer = csv.writer(buffer, delimiter=';', quoting=csv.QUOTE_MINIMAL)

        # Header row
        headers = [
            'Personal-ID',
            'Nachname',
            'Vorname',
            'Rolle',
            'Datum',
            'Check-in',
            'Check-out',
            'Arbeitsstunden',
            'Manuelle Korrektur',
            'Auto-Logout',
            'Notizen'
        ]
        writer.writerow(headers)

        # Data rows
        total_hours = 0
        for entry in time_entries:
            employee = entry.employee

            # Calculate work hours
            work_hours = self._calculate_work_hours(entry.check_in, entry.check_out)
            total_hours += work_hours

            row = [
                employee.employee_id or '',
                employee.last_name or '',
                employee.first_name or '',
                self._get_role_text(employee.role),
                self._format_date(entry.check_in),
                self._format_time(entry.check_in),
                self._format_time(entry.check_out) if entry.check_out else 'Noch eingecheckt',
                f"{work_hours:.2f}h" if entry.check_out else '—',
                self._format_boolean(entry.manual_correction),
                self._format_boolean(entry.auto_logout),
                entry.notes or ''
            ]
            writer.writerow(row)

        # Summary row
        writer.writerow([])
        writer.writerow(['ZUSAMMENFASSUNG'])
        writer.writerow(['Zeitraum:', self._format_date(date_from) if date_from else 'Alle'])
        if date_to:
            writer.writerow(['Bis:', self._format_date(date_to)])
        writer.writerow(['Anzahl Einträge:', len(time_entries)])
        writer.writerow(['Gesamt-Arbeitsstunden:', f"{total_hours:.2f}h"])

        buffer.seek(0)
        return buffer

    def _calculate_work_hours(self, check_in, check_out):
        """Calculate work hours between check-in and check-out"""
        if not check_in or not check_out:
            return 0

        # Convert to timezone-aware datetime if needed
        if isinstance(check_in, str):
            check_in = datetime.fromisoformat(check_in.replace('Z', '+00:00'))
        if isinstance(check_out, str):
            check_out = datetime.fromisoformat(check_out.replace('Z', '+00:00'))

        duration = check_out - check_in
        hours = duration.total_seconds() / 3600
        return max(0, hours)  # Ensure non-negative

    def _get_role_text(self, role):
        """Convert role code to German text"""
        role_map = {
            'admin': 'Administrator',
            'manager': 'Manager',
            'staff': 'Personal',
            'service': 'Service',
            'kitchen': 'Küche',
            'reception': 'Empfang'
        }
        return role_map.get(role, role)


class GuestCSVExporter(CSVExporter):
    """Export guest data as CSV"""

    def generate_guests_csv(self, guests, include_gdpr=True):
        """
        Generate CSV for guest data

        Args:
            guests: QuerySet or list of Guest objects
            include_gdpr: Whether to include GDPR consent information

        Returns:
            StringIO buffer containing CSV data
        """
        buffer = StringIO()
        writer = csv.writer(buffer, delimiter=';', quoting=csv.QUOTE_MINIMAL)

        # Header row
        headers = [
            'Gast-ID',
            'Nachname',
            'Vorname',
            'E-Mail',
            'Telefon',
            'Anzahl Reservierungen',
            'Letzte Reservierung',
            'Allergien',
            'Besondere Wünsche'
        ]

        if include_gdpr:
            headers.extend(['DSGVO Einwilligung', 'Einwilligungsdatum'])

        writer.writerow(headers)

        # Data rows
        for guest in guests:
            # Get reservation count and last reservation
            reservation_count = guest.reservations.count()
            last_reservation = guest.reservations.order_by('-date', '-time').first()

            row = [
                guest.guest_id or '',
                guest.last_name or '',
                guest.first_name or '',
                guest.email or '',
                guest.phone_number or '',
                str(reservation_count),
                self._format_date(last_reservation.date) if last_reservation else 'Keine',
                guest.allergies or '',
                guest.special_requests or ''
            ]

            if include_gdpr:
                row.extend([
                    self._format_boolean(guest.gdpr_consent),
                    self._format_date(guest.gdpr_consent_date) if guest.gdpr_consent else ''
                ])

            writer.writerow(row)

        # Summary row
        writer.writerow([])
        writer.writerow(['ZUSAMMENFASSUNG'])
        writer.writerow(['Anzahl Gäste:', len(guests)])
        writer.writerow(['Exportiert am:', self._format_datetime(timezone.now())])

        buffer.seek(0)
        return buffer


class PensionGuestCSVExporter(CSVExporter):
    """Export pension guest data as CSV"""

    def generate_pension_guests_csv(self, pension_guests):
        """
        Generate CSV for pension guest data

        Args:
            pension_guests: QuerySet or list of PensionGuest objects

        Returns:
            StringIO buffer containing CSV data
        """
        buffer = StringIO()
        writer = csv.writer(buffer, delimiter=';', quoting=csv.QUOTE_MINIMAL)

        # Header row
        headers = [
            'Gast-ID',
            'Anrede',
            'Nachname',
            'Vorname',
            'Geburtsdatum',
            'Nationalität',
            'Straße',
            'PLZ',
            'Stadt',
            'Land',
            'E-Mail',
            'Telefon',
            'Aktiv',
            'DSGVO Einwilligung',
            'Notizen'
        ]
        writer.writerow(headers)

        # Data rows
        for guest in pension_guests:
            row = [
                guest.guest_id or '',
                guest.salutation or '',
                guest.last_name or '',
                guest.first_name or '',
                self._format_date(guest.birth_date) if guest.birth_date else '',
                guest.nationality or '',
                guest.street or '',
                guest.postal_code or '',
                guest.city or '',
                guest.country or 'Deutschland',
                guest.email or '',
                guest.phone_number or '',
                self._format_boolean(guest.is_active),
                self._format_boolean(guest.gdpr_consent),
                guest.notes or ''
            ]
            writer.writerow(row)

        # Summary row
        writer.writerow([])
        writer.writerow(['ZUSAMMENFASSUNG'])
        writer.writerow(['Anzahl Gäste:', len(pension_guests)])
        active_count = sum(1 for g in pension_guests if g.is_active)
        writer.writerow(['Aktive Gäste:', active_count])
        writer.writerow(['Exportiert am:', self._format_datetime(timezone.now())])

        buffer.seek(0)
        return buffer


class ReservationCSVExporter(CSVExporter):
    """Export reservation data as CSV"""

    def generate_reservations_csv(self, reservations, date_from=None, date_to=None):
        """
        Generate CSV for reservations

        Args:
            reservations: QuerySet or list of Reservation objects
            date_from: Optional start date
            date_to: Optional end date

        Returns:
            StringIO buffer containing CSV data
        """
        buffer = StringIO()
        writer = csv.writer(buffer, delimiter=';', quoting=csv.QUOTE_MINIMAL)

        # Header row
        headers = [
            'Reservierungs-ID',
            'Datum',
            'Uhrzeit',
            'Status',
            'Gastname',
            'E-Mail',
            'Telefon',
            'Tisch',
            'Anzahl Personen',
            'Dauer (Min.)',
            'Besondere Wünsche',
            'Allergien',
            'Notizen'
        ]
        writer.writerow(headers)

        # Data rows
        status_counts = {}
        total_guests = 0

        for res in reservations:
            guest = res.guest

            # Count status occurrences
            status_counts[res.status] = status_counts.get(res.status, 0) + 1
            total_guests += res.party_size

            row = [
                res.reservation_id or '',
                self._format_date(res.date),
                self._format_time(res.time),
                self._get_status_text(res.status),
                f"{guest.first_name} {guest.last_name}",
                guest.email or '',
                guest.phone_number or '',
                f"Tisch {res.table.table_number}" if res.table else '—',
                str(res.party_size),
                str(res.duration_minutes) if res.duration_minutes else '',
                res.special_requests or '',
                guest.allergies or '',
                res.notes or ''
            ]
            writer.writerow(row)

        # Summary rows
        writer.writerow([])
        writer.writerow(['ZUSAMMENFASSUNG'])
        writer.writerow(['Zeitraum:', self._format_date(date_from) if date_from else 'Alle'])
        if date_to:
            writer.writerow(['Bis:', self._format_date(date_to)])
        writer.writerow(['Anzahl Reservierungen:', len(reservations)])
        writer.writerow(['Gesamtzahl Gäste:', total_guests])
        writer.writerow([])
        writer.writerow(['Status-Verteilung:'])
        for status, count in status_counts.items():
            writer.writerow([self._get_status_text(status), count])

        buffer.seek(0)
        return buffer

    def _get_status_text(self, status):
        """Convert status code to German text"""
        status_map = {
            'pending': 'Ausstehend',
            'confirmed': 'Bestätigt',
            'seated': 'Platziert',
            'completed': 'Abgeschlossen',
            'cancelled': 'Storniert',
            'no_show': 'Nicht erschienen'
        }
        return status_map.get(status, status)
