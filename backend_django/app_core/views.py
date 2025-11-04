from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import IntegrityError, models
from django.utils import timezone
from datetime import datetime, timedelta

from .models import (
    Area, Table, Guest, Reservation, TableCombination,
    Employee, TimeTracking, PensionGuest, RegistrationForm, SystemSettings,
    OpeningHours, SpecialOpeningHours
)
from .serializers import (
    AreaSerializer, TableSerializer, GuestSerializer, ReservationSerializer,
    TableCombinationSerializer, EmployeeSerializer, TimeTrackingSerializer,
    PensionGuestSerializer, RegistrationFormSerializer, SystemSettingsSerializer,
    OpeningHoursSerializer, SpecialOpeningHoursSerializer,
    DashboardStatsSerializer
)

class AreaViewSet(viewsets.ModelViewSet):
    """
    API Endpunkt für Bereiche (Areas).
    """
    queryset = Area.objects.filter(is_active=True).order_by('name')
    serializer_class = AreaSerializer

    @action(detail=False, methods=['get'], url_path='all')
    def get_all_areas(self, request):
        """
        Gibt alle Bereiche zurück, auch inaktive.
        """
        queryset = Area.objects.all().order_by('name')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

class TableViewSet(viewsets.ModelViewSet):
    """
    API Endpunkt für Tische (Tables).
    """
    queryset = Table.objects.select_related('area').all().order_by('area__name', 'table_number')
    serializer_class = TableSerializer

    def get_queryset(self):
        """
        Optional: Filtern nach Bereich (area_id) via Query Parameter.
        Beispiel: /api/tables/?area_id=<uuid>
        """
        queryset = super().get_queryset()
        area_id = self.request.query_params.get('area_id')
        if area_id:
            queryset = queryset.filter(area_id=area_id)
        return queryset

    # Perform_create und perform_update sind nicht unbedingt nötig, wenn die Validierung im Serializer stattfindet.
    # Könnten aber für komplexere Logik oder Seiteneffekte hier stehen.

class GuestViewSet(viewsets.ModelViewSet):
    """
    API Endpunkt für Gäste (Guests).
    """
    queryset = Guest.objects.all().order_by('last_name', 'first_name')
    serializer_class = GuestSerializer

    @action(detail=False, methods=['get'], url_path='search')
    def search_guests(self, request):
        """
        Sucht Gäste nach Telefonnummer oder Name.
        Beispiel: /api/guests/search/?phone=12345 oder /api/guests/search/?name=Mustermann
        """
        phone = request.query_params.get('phone')
        name = request.query_params.get('name')
        queryset = self.get_queryset()

        if phone:
            queryset = queryset.filter(phone_number__icontains=phone)
        if name:
            # Einfache Suche über Vor- und Nachname
            queryset = queryset.filter(models.Q(first_name__icontains=name) | models.Q(last_name__icontains=name))

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class ReservationViewSet(viewsets.ModelViewSet):
    """
    API Endpunkt für Reservierungen (Reservations).
    """
    queryset = Reservation.objects.select_related('guest', 'table', 'table__area').all().order_by('-reservation_time')
    serializer_class = ReservationSerializer

    def get_queryset(self):
        """
        Optional: Filtern nach Datum, Gast, Tisch etc.
        Beispiel: /api/reservations/?date=YYYY-MM-DD
                  /api/reservations/?guest_id=<uuid>
                  /api/reservations/?table_id=<uuid>
                  /api/reservations/?status=confirmed
        """
        queryset = super().get_queryset()
        date_str = self.request.query_params.get('date')
        guest_id = self.request.query_params.get('guest_id')
        table_id = self.request.query_params.get('table_id')
        status_filter = self.request.query_params.get('status')

        if date_str:
            try:
                # Erwartet Datum im Format YYYY-MM-DD
                filter_date = timezone.datetime.strptime(date_str, "%Y-%m-%d").date()
                queryset = queryset.filter(reservation_time__date=filter_date)
            except ValueError:
                # Ignoriere ungültiges Datumsformat oder gib einen Fehler zurück
                pass
        if guest_id:
            queryset = queryset.filter(guest_id=guest_id)
        if table_id:
            queryset = queryset.filter(table_id=table_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset

    @action(detail=True, methods=['post'], url_path='confirm')
    def confirm_reservation(self, request, pk=None):
        """
        Bestätigt eine Reservierung.
        """
        reservation = self.get_object()
        if reservation.status == 'pending_confirmation':
            reservation.status = 'confirmed'
            reservation.save()
            return Response({'status': 'Reservierung bestätigt'}, status=status.HTTP_200_OK)
        return Response({'status': 'Reservierung konnte nicht bestätigt werden (Status ist nicht 'pending_confirmation')'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel_reservation(self, request, pk=None):
        """
        Storniert eine Reservierung.
        Optional kann ein Grund oder wer storniert hat mitgegeben werden.
        """
        reservation = self.get_object()
        # TODO: Hier könnte man noch unterscheiden, wer storniert (Gast vs. Restaurant)
        # und ggf. Gründe erfassen, falls das Modell erweitert wird.
        if reservation.status in ['pending_confirmation', 'confirmed']:
            reservation.status = 'cancelled_by_restaurant' # oder je nach Logik
            reservation.save()
            return Response({'status': 'Reservierung storniert'}, status=status.HTTP_200_OK)
        return Response({'status': 'Reservierung konnte nicht storniert werden (Status erlaubt dies nicht)'}, status=status.HTTP_400_BAD_REQUEST)

    # Man könnte hier weitere Actions hinzufügen, z.B. für "check_availability" für einen Tisch zu einer bestimmten Zeit.
    # Diese Logik ist teilweise schon im ReservationSerializer -> validate, aber ein expliziter Endpunkt wäre auch denkbar.
    @action(detail=False, methods=['get'], url_path='check-availability')
    def check_availability(self, request):
        """
        Prüft die Verfügbarkeit für eine bestimmte Tischanfrage oder allgemein.
        Parameter: table_id (optional), date, time, duration, guests
        Beispiel: /api/reservations/check-availability/?table_id=...&date=YYYY-MM-DD&time=HH:MM&duration=120&guests=2
        """
        table_id = request.query_params.get('table_id')
        date_str = request.query_params.get('date')
        time_str = request.query_params.get('time')
        duration_str = request.query_params.get('duration')
        num_guests_str = request.query_params.get('guests')

        if not (date_str and time_str and duration_str and num_guests_str):
            return Response(
                {"error": "Parameter 'date', 'time', 'duration' und 'guests' sind erforderlich."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            reservation_dt_str = f"{date_str} {time_str}"
            reservation_time = timezone.datetime.strptime(reservation_dt_str, "%Y-%m-%d %H:%M")
            # Wichtig: Django erwartet aware datetime-Objekte, wenn USE_TZ=True (Standard)
            reservation_time = timezone.make_aware(reservation_time, timezone.get_default_timezone())
            duration_minutes = int(duration_str)
            num_guests = int(num_guests_str)
        except (ValueError, TypeError) as e:
            return Response({"error": f"Ungültige Parameter: {e}"}, status=status.HTTP_400_BAD_REQUEST)

        if reservation_time < timezone.now():
             return Response({"error": "Das Datum/die Zeit darf nicht in der Vergangenheit liegen."}, status=status.HTTP_400_BAD_REQUEST)


        available_tables = []
        candidate_tables = Table.objects.filter(is_reservable=True, capacity__gte=num_guests)
        if table_id: # Wenn ein spezifischer Tisch angefragt wird
            candidate_tables = candidate_tables.filter(id=table_id)
            if not candidate_tables.exists():
                 return Response({"table_id": table_id, "available": False, "reason": "Tisch nicht gefunden oder erfüllt Kriterien nicht."}, status=status.HTTP_404_NOT_FOUND)


        for table in candidate_tables:
            end_time = reservation_time + timezone.timedelta(minutes=duration_minutes)

            overlapping = Reservation.objects.filter(
                table=table,
                status__in=['confirmed', 'pending_confirmation'],
                reservation_time__lt=end_time, # Andere Reservierung startet vor Ende dieser
            ).exclude( # Filter, sodass auch die Endzeit der anderen Reservierung beachtet wird
                reservation_time__gte=end_time # Andere Reservierung startet nach oder genau zum Ende dieser
            ).filter( # Andere Reservierung endet nach Start dieser
                models.ExpressionWrapper(models.F('reservation_time') + models.ExpressionWrapper(models.F('duration_minutes') * timezone.timedelta(minutes=1), output_field=models.DateTimeField()), output_field=models.DateTimeField())__gt=reservation_time
            )

            if not overlapping.exists():
                available_tables.append(TableSerializer(table).data)

        if table_id: # Antwort für einen spezifischen Tisch
            if available_tables:
                return Response({"table_id": table_id, "available": True, "details": available_tables[0]})
            else:
                # Hier könnte man noch genauer prüfen, warum (z.B. Kapazität, schon belegt)
                return Response({"table_id": table_id, "available": False, "reason": "Tisch ist im gewünschten Zeitraum belegt oder nicht reservierbar."})
        else: # Antwort für eine allgemeine Anfrage
            return Response({"requested_time": reservation_time, "duration": duration_minutes, "num_guests": num_guests, "available_tables": available_tables})


class TableCombinationViewSet(viewsets.ModelViewSet):
    """API Endpunkt für Tischkombinationen"""
    queryset = TableCombination.objects.all()
    serializer_class = TableCombinationSerializer


class EmployeeViewSet(viewsets.ModelViewSet):
    """API Endpunkt für Mitarbeiter"""
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer

    @action(detail=True, methods=['post'], url_path='check-in')
    def check_in(self, request, pk=None):
        """Check-in für Mitarbeiter"""
        employee = self.get_object()

        # Prüfe ob bereits eingecheckt
        latest_entry = employee.time_entries.order_by('-check_in').first()
        if latest_entry and not latest_entry.check_out:
            return Response(
                {'error': 'Mitarbeiter ist bereits eingecheckt'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Erstelle neuen Time Entry
        time_entry = TimeTracking.objects.create(
            employee=employee,
            check_in=timezone.now()
        )
        employee.last_check_in = timezone.now()
        employee.save()

        return Response(TimeTrackingSerializer(time_entry).data)

    @action(detail=True, methods=['post'], url_path='check-out')
    def check_out(self, request, pk=None):
        """Check-out für Mitarbeiter"""
        employee = self.get_object()

        # Hole aktuellen Time Entry
        latest_entry = employee.time_entries.order_by('-check_in').first()
        if not latest_entry or latest_entry.check_out:
            return Response(
                {'error': 'Mitarbeiter ist nicht eingecheckt'},
                status=status.HTTP_400_BAD_REQUEST
            )

        latest_entry.check_out = timezone.now()
        latest_entry.save()
        employee.last_check_out = timezone.now()
        employee.save()

        return Response(TimeTrackingSerializer(latest_entry).data)


class TimeTrackingViewSet(viewsets.ModelViewSet):
    """API Endpunkt für Zeiterfassung"""
    queryset = TimeTracking.objects.select_related('employee').all()
    serializer_class = TimeTrackingSerializer

    def get_queryset(self):
        """Filtern nach Mitarbeiter und Datum"""
        queryset = super().get_queryset()
        employee_id = self.request.query_params.get('employee_id')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        if date_from:
            queryset = queryset.filter(check_in__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(check_in__date__lte=date_to)

        return queryset


class PensionGuestViewSet(viewsets.ModelViewSet):
    """API Endpunkt für Pensionsgäste"""
    queryset = PensionGuest.objects.all()
    serializer_class = PensionGuestSerializer

    @action(detail=False, methods=['get'], url_path='search')
    def search_guests(self, request):
        """Suche nach Name oder Dokumentnummer"""
        name = request.query_params.get('name')
        document_number = request.query_params.get('document_number')
        queryset = self.get_queryset()

        if name:
            queryset = queryset.filter(
                models.Q(first_name__icontains=name) |
                models.Q(last_name__icontains=name)
            )
        if document_number:
            queryset = queryset.filter(document_number__icontains=document_number)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class RegistrationFormViewSet(viewsets.ModelViewSet):
    """API Endpunkt für Meldescheine"""
    queryset = RegistrationForm.objects.select_related('guest').all()
    serializer_class = RegistrationFormSerializer

    def get_queryset(self):
        """Filtern nach Status, Datum, etc."""
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if date_from:
            queryset = queryset.filter(arrival_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(departure_date__lte=date_to)

        return queryset

    @action(detail=True, methods=['post'], url_path='check-in')
    def check_in_guest(self, request, pk=None):
        """Check-in für Pensionsgast"""
        registration = self.get_object()
        if registration.status != 'confirmed':
            return Response(
                {'error': 'Meldeschein muss bestätigt sein'},
                status=status.HTTP_400_BAD_REQUEST
            )

        registration.status = 'checked_in'
        registration.save()
        return Response(self.get_serializer(registration).data)

    @action(detail=True, methods=['post'], url_path='check-out')
    def check_out_guest(self, request, pk=None):
        """Check-out für Pensionsgast"""
        registration = self.get_object()
        if registration.status != 'checked_in':
            return Response(
                {'error': 'Gast ist nicht eingecheckt'},
                status=status.HTTP_400_BAD_REQUEST
            )

        registration.status = 'checked_out'
        registration.save()
        return Response(self.get_serializer(registration).data)

    @action(detail=True, methods=['post'], url_path='export')
    def export_to_city(self, request, pk=None):
        """Exportiere Meldeschein zur Stadt (BMG-konform)"""
        registration = self.get_object()
        if registration.status not in ['checked_in', 'checked_out']:
            return Response(
                {'error': 'Meldeschein muss eingecheckt oder ausgecheckt sein'},
                status=status.HTTP_400_BAD_REQUEST
            )

        registration.exported_to_city = True
        registration.export_date = timezone.now()
        registration.save()

        # Hier würde die tatsächliche Export-Logik stattfinden
        # z.B. PDF-Generierung, Datenübermittlung an Stadt-System, etc.

        return Response({
            'message': 'Meldeschein erfolgreich exportiert',
            'export_date': registration.export_date
        })


class SystemSettingsViewSet(viewsets.ModelViewSet):
    """API Endpunkt für Systemeinstellungen"""
    queryset = SystemSettings.objects.all()
    serializer_class = SystemSettingsSerializer


class DashboardViewSet(viewsets.ViewSet):
    """Dashboard Statistiken und Übersicht"""

    @action(detail=False, methods=['get'], url_path='stats')
    def get_stats(self, request):
        """Dashboard Statistiken abrufen"""
        today = timezone.now().date()

        # Tisch-Statistiken
        total_tables = Table.objects.count()
        available_tables = Table.objects.filter(status='available').count()
        occupied_tables = Table.objects.filter(status='occupied').count()
        reserved_tables = Table.objects.filter(status='reserved').count()

        # Reservierungs-Statistiken
        today_reservations = Reservation.objects.filter(
            reservation_time__date=today
        ).count()
        today_checkins = Reservation.objects.filter(
            check_in_time__date=today
        ).count()

        # Mitarbeiter-Statistiken
        active_employees = Employee.objects.filter(is_active_employee=True).count()

        # Auslastungsrate
        if total_tables > 0:
            occupancy_rate = ((occupied_tables + reserved_tables) / total_tables) * 100
        else:
            occupancy_rate = 0

        data = {
            'total_tables': total_tables,
            'available_tables': available_tables,
            'occupied_tables': occupied_tables,
            'reserved_tables': reserved_tables,
            'today_reservations': today_reservations,
            'today_checkins': today_checkins,
            'active_employees': active_employees,
            'current_occupancy_rate': round(occupancy_rate, 2)
        }

        serializer = DashboardStatsSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='capacity-by-area')
    def capacity_by_area(self, request):
        """Kapazitätsanzeige pro Bereich"""
        areas = Area.objects.all()
        result = []

        for area in areas:
            tables = area.tables.all()
            total_tables = tables.count()
            available = tables.filter(status='available').count()
            occupied = tables.filter(status='occupied').count()
            reserved = tables.filter(status='reserved').count()

            result.append({
                'area_id': area.id,
                'area_name': area.name,
                'color_code': area.color_code,
                'total_capacity': area.total_capacity,
                'total_tables': total_tables,
                'available_tables': available,
                'occupied_tables': occupied,
                'reserved_tables': reserved,
                'occupancy_rate': round(((occupied + reserved) / total_tables * 100) if total_tables > 0 else 0, 2)
            })

        return Response(result)



class OpeningHoursViewSet(viewsets.ModelViewSet):
    """
    API Endpunkt für Öffnungszeiten.
    """
    queryset = OpeningHours.objects.select_related("area").all().order_by("area", "weekday")
    serializer_class = OpeningHoursSerializer

    def get_queryset(self):
        """
        Optional: Filtern nach Bereich (area_id) via Query Parameter.
        Beispiel: /api/opening-hours/?area_id=<uuid>
        """
        queryset = super().get_queryset()
        area_id = self.request.query_params.get("area_id")
        if area_id:
            queryset = queryset.filter(area_id=area_id)
        return queryset


class SpecialOpeningHoursViewSet(viewsets.ModelViewSet):
    """
    API Endpunkt für Sonder-Öffnungszeiten (Feiertage, Events).
    """
    queryset = SpecialOpeningHours.objects.select_related("area").all().order_by("date")
    serializer_class = SpecialOpeningHoursSerializer

    def get_queryset(self):
        """
        Optional: Filtern nach Bereich (area_id) oder Datumsbereich via Query Parameter.
        Beispiel: /api/special-opening-hours/?area_id=<uuid>&from_date=2024-01-01&to_date=2024-12-31
        """
        queryset = super().get_queryset()
        area_id = self.request.query_params.get("area_id")
        from_date = self.request.query_params.get("from_date")
        to_date = self.request.query_params.get("to_date")

        if area_id:
            queryset = queryset.filter(area_id=area_id)
        if from_date:
            queryset = queryset.filter(date__gte=from_date)
        if to_date:
            queryset = queryset.filter(date__lte=to_date)

        return queryset

