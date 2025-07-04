from rest_framework import serializers
from .models import Area, Table, Guest, Reservation
from django.utils import timezone

class AreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Area
        fields = ['id', 'name', 'description', 'is_active', 'created_at', 'updated_at']

class TableSerializer(serializers.ModelSerializer):
    area_name = serializers.CharField(source='area.name', read_only=True)

    class Meta:
        model = Table
        fields = ['id', 'area', 'area_name', 'table_number', 'capacity', 'status', 'is_reservable', 'notes', 'created_at', 'updated_at']
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
