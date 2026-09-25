from rest_framework import serializers
from .models import (
    Area, Table, Guest, Reservation, TableCombination,
    Employee, TimeTracking, PensionGuest, RegistrationForm, SystemSettings,
    OpeningHours, SpecialOpeningHours,
    ChatConversation, ChatMessage, AnalyticsSnapshot, CapacityRecommendation,
    ReservationRequest
)
from django.utils import timezone

class AreaSerializer(serializers.ModelSerializer):
    """Serializer für Servicebereiche"""
    tables_count = serializers.SerializerMethodField()
    current_capacity = serializers.SerializerMethodField()

    class Meta:
        model = Area
        fields = '__all__'

    def get_tables_count(self, obj):
        return obj.tables.count()

    def get_current_capacity(self, obj):
        # Berechne verfügbare Kapazität basierend auf belegten Tischen
        occupied_capacity = sum([
            table.capacity for table in obj.tables.filter(status__in=['occupied', 'reserved'])
        ])
        return obj.total_capacity - occupied_capacity

class TableSerializer(serializers.ModelSerializer):
    area_name = serializers.CharField(source='area.name', read_only=True)

    class Meta:
        model = Table
        fields = ['id', 'area', 'area_name', 'table_number', 'capacity', 'status', 'is_reservable',
                  'is_combinable', 'position_x', 'position_y', 'rotation', 'notes', 'created_at', 'updated_at']
        read_only_fields = ['area_name']

    def validate(self, data):
        # Eindeutigkeit von table_number pro area sicherstellen
        area = data.get('area')
        table_number = data.get('table_number')
        instance = self.instance # Für Updates

        query = Table.objects.filter(area=area, table_number=table_number)
        if instance:
            query = query.exclude(pk=instance.pk)

        if query.exists():
            raise serializers.ValidationError(
                {"table_number": f"Tisch mit Nummer {table_number} existiert bereits in Bereich {area.name}."}
            )
        return data

class GuestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guest
        fields = ['id', 'first_name', 'last_name', 'phone_number', 'email', 'notes', 'created_at', 'updated_at']

class ReservationSerializer(serializers.ModelSerializer):
    guest_details = GuestSerializer(source='guest', read_only=True)
    table_details = TableSerializer(source='table', read_only=True)

    class Meta:
        model = Reservation
        fields = [
            'id', 'guest', 'guest_details', 'table', 'table_details',
            'reservation_time', 'duration_minutes', 'number_of_guests',
            'status', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['guest_details', 'table_details']

    def validate_reservation_time(self, value):
        """
        Prüft, ob die Reservierungszeit in der Zukunft liegt.
        """
        if value < timezone.now():
            # Erlaube einen kleinen Puffer für bereits erstellte Reservierungen, die leicht in der Vergangenheit liegen
            # Dies ist hauptsächlich für NEUE Reservierungen gedacht.
            # Bei Updates sollte dies ggf. anders gehandhabt werden oder die Logik verfeinert.
            if not self.instance or (self.instance and self.instance.reservation_time < timezone.now()):
                 # Nur bei Neuerstellung oder wenn alter Zeitpuntk schon vorbei war
                if (timezone.now() - value).total_seconds() > 300: # 5 Minuten Toleranz
                    raise serializers.ValidationError("Die Reservierungszeit darf nicht in der Vergangenheit liegen.")
        return value

    def validate_number_of_guests(self, value):
        """
        Prüft, ob die Anzahl der Gäste positiv ist.
        """
        if value <= 0:
            raise serializers.ValidationError("Die Anzahl der Gäste muss positiv sein.")
        return value

    def validate(self, data):
        """
        Übergreifende Validierungen:
        1. Anzahl der Gäste darf Tischkapazität nicht überschreiten (falls Tisch zugewiesen).
        2. Tisch muss reservierbar sein.
        3. Tischverfügbarkeit prüfen (komplex, hier vereinfacht angedeutet).
        """
        table = data.get('table')
        number_of_guests = data.get('number_of_guests')
        reservation_time = data.get('reservation_time')
        duration_minutes = data.get('duration_minutes', self.instance.duration_minutes if self.instance else Reservation._meta.get_field('duration_minutes').default)

        # 1. Kapazitätsprüfung
        if table and number_of_guests and number_of_guests > table.capacity:
            raise serializers.ValidationError(
                {"number_of_guests": f"Die Anzahl der Gäste ({number_of_guests}) übersteigt die Kapazität ({table.capacity}) von Tisch {table.table_number}."}
            )

        # 2. Tisch reservierbar?
        if table and not table.is_reservable:
            # Ausnahme für bereits bestehende Reservierungen auf diesem Tisch
            if not self.instance or (self.instance and self.instance.table != table):
                 raise serializers.ValidationError(
                    {"table": f"Tisch {table.table_number} ist nicht reservierbar."}
                )

        # 3. Tischverfügbarkeit (vereinfachte Logik, sollte in einem Service Layer verfeinert werden)
        # Diese Prüfung sollte idealerweise Kollisionen mit anderen bestätigten/ausstehenden Reservierungen prüfen.
        if table and reservation_time:
            # Nur prüfen, wenn sich Tisch oder Zeit ändert, oder bei neuer Reservierung
            if not self.instance or \
               data.get('table') != self.instance.table or \
               data.get('reservation_time') != self.instance.reservation_time or \
               data.get('duration_minutes') != self.instance.duration_minutes:

                end_time = reservation_time + timezone.timedelta(minutes=duration_minutes)

                # Suche nach überlappenden Reservierungen für DIESEN Tisch
                # Eine Reservierung überlappt, wenn:
                # (Startzeit_A < Endzeit_B) UND (Endzeit_A > Startzeit_B)
                overlapping_reservations = Reservation.objects.filter(
                    table=table,
                    status__in=['confirmed', 'pending_confirmation'], # Nur aktive/geplante prüfen
                    reservation_time__lt=end_time, # Andere Reservierung startet vor Ende dieser
                ).exclude(id=self.instance.id if self.instance else None) # Eigene ausschließen bei Update

                # Filter weiter, sodass auch die Endzeit der anderen Reservierung beachtet wird
                # (reservation_time + duration_minutes) > reservation_time_other
                final_overlap = []
                for res in overlapping_reservations:
                    other_end_time = res.reservation_time + timezone.timedelta(minutes=res.duration_minutes)
                    if other_end_time > reservation_time: # Andere Reservierung endet nach Start dieser
                        final_overlap.append(res)

                if final_overlap:
                    raise serializers.ValidationError(
                        {"table": f"Tisch {table.table_number} ist im gewünschten Zeitraum ({reservation_time.strftime('%H:%M')} - {end_time.strftime('%H:%M')}) bereits belegt."}
                    )
        return data


class ReservationRequestSubmitSerializer(serializers.Serializer):
    """
    Serializer für die öffentliche Anfrage-Einreichung (kein Login nötig).
    Bewusst als plain Serializer (nicht ModelSerializer), damit über dieses
    Feld-Set niemand status/risk_score/reservation o.ä. mitschicken und
    überschreiben kann - nur die Rohdaten, die ein echter Gast eingeben würde.
    """
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    phone_number = serializers.CharField(max_length=20)
    # Bewusst CharField statt EmailField: offensichtlich falsches Format soll nicht
    # hart mit 400 abgelehnt werden, sondern als Heuristik in die Risiko-Bewertung
    # einfließen (siehe reservation_filter._is_malformed_email).
    email = serializers.CharField(max_length=254, required=False, allow_blank=True, allow_null=True)
    requested_time = serializers.DateTimeField()
    number_of_guests = serializers.IntegerField(min_value=1, max_value=1000)
    message = serializers.CharField(required=False, allow_blank=True, max_length=5000)


class ReservationRequestSerializer(serializers.ModelSerializer):
    """Serializer für die Mitarbeiter-Ansicht der Quarantäne-Anfragen."""

    class Meta:
        model = ReservationRequest
        fields = '__all__'
        read_only_fields = [
            'id', 'status', 'risk_score', 'risk_reasons', 'source_ip',
            'submitted_at', 'reservation', 'reviewed_at'
        ]


class TableCombinationSerializer(serializers.ModelSerializer):
    """Serializer für Tischkombinationen"""
    tables_detail = TableSerializer(source='tables', many=True, read_only=True)

    class Meta:
        model = TableCombination
        fields = '__all__'


class EmployeeSerializer(serializers.ModelSerializer):
    """Serializer für Mitarbeiter"""
    total_hours_this_month = serializers.SerializerMethodField()
    is_checked_in = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'employee_number', 'role', 'phone', 'is_active_employee',
            'can_simultaneous_login', 'last_check_in', 'last_check_out',
            'total_hours_this_month', 'is_checked_in', 'date_joined'
        ]
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def get_total_hours_this_month(self, obj):
        now = timezone.now()
        from datetime import datetime
        month_start = datetime(now.year, now.month, 1, tzinfo=now.tzinfo)
        entries = obj.time_entries.filter(check_in__gte=month_start)
        total = sum([entry.total_hours or 0 for entry in entries])
        return float(total)

    def get_is_checked_in(self, obj):
        latest_entry = obj.time_entries.order_by('-check_in').first()
        if latest_entry and not latest_entry.check_out:
            return True
        return False


class TimeTrackingSerializer(serializers.ModelSerializer):
    """Serializer für Zeiterfassung"""
    employee_name = serializers.SerializerMethodField()
    employee_detail = EmployeeSerializer(source='employee', read_only=True)

    class Meta:
        model = TimeTracking
        fields = '__all__'

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"


class PensionGuestSerializer(serializers.ModelSerializer):
    """Serializer für Pensionsgäste"""
    full_name = serializers.SerializerMethodField()
    full_address = serializers.SerializerMethodField()

    class Meta:
        model = PensionGuest
        fields = '__all__'

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"

    def get_full_address(self, obj):
        return f"{obj.street} {obj.house_number}, {obj.postal_code} {obj.city}, {obj.country}"


class RegistrationFormSerializer(serializers.ModelSerializer):
    """Serializer für Meldescheine (BMG-konform)"""
    guest_detail = PensionGuestSerializer(source='guest', read_only=True)
    guest_name = serializers.SerializerMethodField()
    nights = serializers.SerializerMethodField()

    class Meta:
        model = RegistrationForm
        fields = '__all__'

    def get_guest_name(self, obj):
        return f"{obj.guest.first_name} {obj.guest.last_name}"

    def get_nights(self, obj):
        return (obj.departure_date - obj.arrival_date).days


class SystemSettingsSerializer(serializers.ModelSerializer):
    """Serializer für Systemeinstellungen"""

    class Meta:
        model = SystemSettings
        fields = '__all__'


class OpeningHoursSerializer(serializers.ModelSerializer):
    """Serializer für Öffnungszeiten"""
    area_name = serializers.CharField(source='area.name', read_only=True)
    weekday_display = serializers.CharField(source='get_weekday_display', read_only=True)

    class Meta:
        model = OpeningHours
        fields = '__all__'


class SpecialOpeningHoursSerializer(serializers.ModelSerializer):
    """Serializer für Sonder-Öffnungszeiten"""
    area_name = serializers.CharField(source='area.name', read_only=True)

    class Meta:
        model = SpecialOpeningHours
        fields = '__all__'


# Dashboard-spezifische Serializers
class DashboardStatsSerializer(serializers.Serializer):
    """Dashboard Statistiken"""
    total_tables = serializers.IntegerField()
    available_tables = serializers.IntegerField()
    occupied_tables = serializers.IntegerField()
    reserved_tables = serializers.IntegerField()
    today_reservations = serializers.IntegerField()
    today_checkins = serializers.IntegerField()
    active_employees = serializers.IntegerField()
    current_occupancy_rate = serializers.FloatField()


# ============================================================================
# PHASE 3: KI & ANALYTICS SERIALIZERS
# ============================================================================

class ChatMessageSerializer(serializers.ModelSerializer):
    """Serializer für Chat-Nachrichten"""

    class Meta:
        model = ChatMessage
        fields = '__all__'


class ChatConversationSerializer(serializers.ModelSerializer):
    """Serializer für Chat-Konversationen mit Nachrichten"""
    messages = ChatMessageSerializer(many=True, read_only=True)
    employee_name = serializers.SerializerMethodField()
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatConversation
        fields = '__all__'

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}" if obj.employee.first_name else obj.employee.username

    def get_message_count(self, obj):
        return obj.messages.count()


class AnalyticsSnapshotSerializer(serializers.ModelSerializer):
    """Serializer für Analytics-Snapshots"""

    class Meta:
        model = AnalyticsSnapshot
        fields = '__all__'


class CapacityRecommendationSerializer(serializers.ModelSerializer):
    """Serializer für Kapazitäts-Empfehlungen"""
    area_name = serializers.CharField(source='area.name', read_only=True)
    recommendation_type_display = serializers.CharField(source='get_recommendation_type_display', read_only=True)

    class Meta:
        model = CapacityRecommendation
        fields = '__all__'


# Analytics API Response Serializers
class OccupancyTrendSerializer(serializers.Serializer):
    """Auslastungstrend über Zeitraum"""
    date = serializers.DateField()
    occupancy_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    total_reservations = serializers.IntegerField()
    total_guests = serializers.IntegerField()


class RevenueAnalyticsSerializer(serializers.Serializer):
    """Umsatzanalyse"""
    period = serializers.CharField()  # 'day', 'week', 'month'
    total_revenue = serializers.DecimalField(max_digits=10, decimal_places=2)
    average_per_guest = serializers.DecimalField(max_digits=8, decimal_places=2)
    reservation_count = serializers.IntegerField()


class PredictiveInsightSerializer(serializers.Serializer):
    """KI-generierte Vorhersage"""
    insight_type = serializers.CharField()  # 'occupancy', 'revenue', 'staffing'
    date = serializers.DateField()
    predicted_value = serializers.DecimalField(max_digits=10, decimal_places=2)
    confidence = serializers.DecimalField(max_digits=4, decimal_places=2)
    recommendation = serializers.CharField()
