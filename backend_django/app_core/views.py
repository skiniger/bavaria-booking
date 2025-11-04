from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import IntegrityError, models
from django.utils import timezone
from datetime import datetime, timedelta

from .models import (
    Area, Table, Guest, Reservation, TableCombination,
    Employee, TimeTracking, PensionGuest, RegistrationForm, SystemSettings,
    OpeningHours, SpecialOpeningHours,
    ChatConversation, ChatMessage, AnalyticsSnapshot, CapacityRecommendation
)
from .serializers import (
    AreaSerializer, TableSerializer, GuestSerializer, ReservationSerializer,
    TableCombinationSerializer, EmployeeSerializer, TimeTrackingSerializer,
    PensionGuestSerializer, RegistrationFormSerializer, SystemSettingsSerializer,
    OpeningHoursSerializer, SpecialOpeningHoursSerializer,
    DashboardStatsSerializer,
    ChatConversationSerializer, ChatMessageSerializer,
    AnalyticsSnapshotSerializer, CapacityRecommendationSerializer,
    OccupancyTrendSerializer, RevenueAnalyticsSerializer, PredictiveInsightSerializer
)
from . import ai_service

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


# ============================================================================
# PHASE 3: KI & ANALYTICS VIEWSETS
# ============================================================================

class ChatConversationViewSet(viewsets.ModelViewSet):
    """
    API Endpunkt für MeitiAI Chat-Konversationen
    """
    queryset = ChatConversation.objects.all().order_by('-updated_at')
    serializer_class = ChatConversationSerializer

    def get_queryset(self):
        """Filter Konversationen nach Mitarbeiter"""
        queryset = super().get_queryset()
        employee_id = self.request.query_params.get('employee_id')
        is_active = self.request.query_params.get('is_active')

        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset

    @action(detail=True, methods=['post'], url_path='send-message')
    def send_message(self, request, pk=None):
        """
        Sendet eine Nachricht an den Chat und erhält KI-Antwort

        POST /api/chat-conversations/{id}/send-message/
        Body: { "content": "Wie ist die Auslastung?" }
        """
        conversation = self.get_object()
        user_message_content = request.data.get('content', '')

        if not user_message_content:
            return Response(
                {'error': 'Nachrichteninhalt darf nicht leer sein'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Benutzer-Nachricht speichern
        user_message = ChatMessage.objects.create(
            conversation=conversation,
            role='user',
            content=user_message_content
        )

        # Konversationshistorie für KI-Kontext
        conversation_history = [
            {
                'role': msg.role,
                'content': msg.content
            }
            for msg in conversation.messages.all()
        ]

        # KI-Antwort generieren
        ai_response = ai_service.generate_chat_response(
            conversation_history=conversation_history,
            user_message=user_message_content
        )

        # KI-Antwort speichern
        assistant_message = ChatMessage.objects.create(
            conversation=conversation,
            role='assistant',
            content=ai_response
        )

        # Konversation aktualisieren
        conversation.updated_at = timezone.now()
        conversation.save()

        # Serialisierte Antwort
        return Response({
            'user_message': ChatMessageSerializer(user_message).data,
            'assistant_message': ChatMessageSerializer(assistant_message).data
        }, status=status.HTTP_201_CREATED)


class ChatMessageViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API Endpunkt für Chat-Nachrichten (Read-only)
    Nachrichten werden über ChatConversation.send_message erstellt
    """
    queryset = ChatMessage.objects.all().order_by('created_at')
    serializer_class = ChatMessageSerializer

    def get_queryset(self):
        """Filter Nachrichten nach Konversation"""
        queryset = super().get_queryset()
        conversation_id = self.request.query_params.get('conversation_id')

        if conversation_id:
            queryset = queryset.filter(conversation_id=conversation_id)

        return queryset


class AnalyticsSnapshotViewSet(viewsets.ModelViewSet):
    """
    API Endpunkt für Analytics-Snapshots
    """
    queryset = AnalyticsSnapshot.objects.all().order_by('-snapshot_date')
    serializer_class = AnalyticsSnapshotSerializer

    def get_queryset(self):
        """Filter nach Datumsbereich"""
        queryset = super().get_queryset()
        from_date = self.request.query_params.get('from_date')
        to_date = self.request.query_params.get('to_date')

        if from_date:
            queryset = queryset.filter(snapshot_date__gte=from_date)
        if to_date:
            queryset = queryset.filter(snapshot_date__lte=to_date)

        return queryset

    @action(detail=False, methods=['post'], url_path='generate-today')
    def generate_today(self, request):
        """
        Generiert Analytics-Snapshot für heute

        POST /api/analytics-snapshots/generate-today/
        """
        today = timezone.now().date()

        # Prüfen, ob bereits Snapshot existiert
        existing = AnalyticsSnapshot.objects.filter(snapshot_date=today).first()
        if existing:
            return Response(
                {'message': 'Snapshot für heute existiert bereits', 'data': AnalyticsSnapshotSerializer(existing).data},
                status=status.HTTP_200_OK
            )

        # Statistiken berechnen
        today_reservations = Reservation.objects.filter(reservation_time__date=today)

        total_reservations = today_reservations.count()
        confirmed = today_reservations.filter(status='confirmed').count()
        cancelled = today_reservations.filter(
            status__in=['cancelled_by_guest', 'cancelled_by_restaurant']
        ).count()
        no_shows = today_reservations.filter(status='no_show').count()

        total_guests = sum([r.number_of_guests for r in today_reservations])
        avg_party_size = total_guests / total_reservations if total_reservations > 0 else 0

        # Auslastung berechnen (vereinfacht)
        all_tables = Table.objects.filter(is_reservable=True)
        total_capacity = sum([t.capacity for t in all_tables])
        occupancy_rate = (total_guests / total_capacity * 100) if total_capacity > 0 else 0

        # Snapshot erstellen
        snapshot_data = {
            'total_reservations': total_reservations,
            'confirmed_reservations': confirmed,
            'cancelled_reservations': cancelled,
            'no_show_count': no_shows,
            'average_occupancy_rate': round(occupancy_rate, 2),
            'total_guests_served': total_guests,
            'average_party_size': round(avg_party_size, 2),
            'total_revenue': 0,  # TODO: Integration mit POS-System
        }

        # KI-Insights generieren
        insights = ai_service.generate_analytics_insights(snapshot_data)
        snapshot_data['ai_insights'] = insights

        snapshot = AnalyticsSnapshot.objects.create(
            snapshot_date=today,
            **snapshot_data
        )

        return Response(
            AnalyticsSnapshotSerializer(snapshot).data,
            status=status.HTTP_201_CREATED
        )


class CapacityRecommendationViewSet(viewsets.ModelViewSet):
    """
    API Endpunkt für Kapazitäts-Empfehlungen
    """
    queryset = CapacityRecommendation.objects.select_related('area').all().order_by('-date', '-time_slot')
    serializer_class = CapacityRecommendationSerializer

    def get_queryset(self):
        """Filter nach Datum, Bereich, angewendet"""
        queryset = super().get_queryset()
        date = self.request.query_params.get('date')
        area_id = self.request.query_params.get('area_id')
        is_applied = self.request.query_params.get('is_applied')

        if date:
            queryset = queryset.filter(date=date)
        if area_id:
            queryset = queryset.filter(area_id=area_id)
        if is_applied is not None:
            queryset = queryset.filter(is_applied=is_applied.lower() == 'true')

        return queryset

    @action(detail=False, methods=['post'], url_path='generate')
    def generate_recommendations(self, request):
        """
        Generiert Empfehlungen für einen Zeitraum

        POST /api/capacity-recommendations/generate/
        Body: { "date": "2025-01-10", "area_id": "uuid" }
        """
        target_date = request.data.get('date')
        area_id = request.data.get('area_id')

        if not target_date or not area_id:
            return Response(
                {'error': 'Datum und Bereich sind erforderlich'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Parse Datum
        try:
            target_date_obj = datetime.strptime(target_date, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Ungültiges Datumsformat (YYYY-MM-DD)'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Area validieren
        try:
            area = Area.objects.get(id=area_id)
        except Area.DoesNotExist:
            return Response(
                {'error': 'Bereich nicht gefunden'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Empfehlungen für verschiedene Zeitslots generieren
        time_slots = ['12:00:00', '14:00:00', '18:00:00', '20:00:00']
        recommendations = []

        for time_slot in time_slots:
            # Prüfen ob bereits existiert
            existing = CapacityRecommendation.objects.filter(
                date=target_date_obj,
                time_slot=time_slot,
                area=area
            ).first()

            if existing:
                recommendations.append(existing)
                continue

            # Vorhersage generieren
            prediction = ai_service.predict_occupancy(
                area_id=str(area_id),
                target_date=target_date_obj,
                target_time=time_slot
            )

            # Empfehlung generieren
            recommendation_data = ai_service.generate_capacity_recommendation(
                area_id=str(area_id),
                predicted_occupancy=prediction['predicted_occupancy'],
                date=target_date_obj,
                time_slot=time_slot
            )

            # Speichern
            recommendation = CapacityRecommendation.objects.create(
                date=target_date_obj,
                time_slot=time_slot,
                area=area,
                predicted_occupancy=prediction['predicted_occupancy'],
                confidence_score=prediction['confidence_score'],
                recommendation_type=recommendation_data['recommendation_type'],
                recommendation_text=recommendation_data['recommendation_text'],
                based_on_data=prediction['factors']
            )
            recommendations.append(recommendation)

        return Response(
            CapacityRecommendationSerializer(recommendations, many=True).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'], url_path='apply')
    def apply_recommendation(self, request, pk=None):
        """
        Markiert Empfehlung als angewendet

        POST /api/capacity-recommendations/{id}/apply/
        """
        recommendation = self.get_object()
        recommendation.is_applied = True
        recommendation.applied_at = timezone.now()
        recommendation.save()

        return Response(
            CapacityRecommendationSerializer(recommendation).data,
            status=status.HTTP_200_OK
        )


class AnalyticsAPIViewSet(viewsets.ViewSet):
    """
    Zusätzliche Analytics-Endpunkte
    """

    @action(detail=False, methods=['get'], url_path='occupancy-trends')
    def occupancy_trends(self, request):
        """
        Auslastungstrends über die letzten N Tage

        GET /api/analytics/occupancy-trends/?days=7
        """
        days = int(request.query_params.get('days', 7))
        trends = ai_service.calculate_occupancy_trends(days=days)

        return Response(
            OccupancyTrendSerializer(trends, many=True).data,
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'], url_path='predictive-insights')
    def predictive_insights(self, request):
        """
        KI-generierte Vorhersagen und Empfehlungen

        GET /api/analytics/predictive-insights/?days_ahead=3
        """
        days_ahead = int(request.query_params.get('days_ahead', 3))
        insights = []

        today = timezone.now().date()
        areas = Area.objects.filter(is_active=True)

        for i in range(1, days_ahead + 1):
            target_date = today + timedelta(days=i)

            for area in areas:
                # Vorhersage für 19:00 Uhr (Hauptzeit)
                prediction = ai_service.predict_occupancy(
                    area_id=str(area.id),
                    target_date=target_date,
                    target_time='19:00:00'
                )

                recommendation_data = ai_service.generate_capacity_recommendation(
                    area_id=str(area.id),
                    predicted_occupancy=prediction['predicted_occupancy'],
                    date=target_date,
                    time_slot='19:00:00'
                )

                insights.append({
                    'insight_type': 'occupancy',
                    'date': target_date,
                    'area_name': area.name,
                    'predicted_value': prediction['predicted_occupancy'],
                    'confidence': prediction['confidence_score'],
                    'recommendation': recommendation_data['recommendation_text']
                })

        return Response(
            PredictiveInsightSerializer(insights, many=True).data,
            status=status.HTTP_200_OK
        )

