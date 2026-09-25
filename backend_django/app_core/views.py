from rest_framework import viewsets, status, mixins
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from django.db import IntegrityError, models, transaction
from django.utils import timezone
from django.http import HttpResponse
from datetime import datetime, timedelta

from .models import (
    Area, Table, Guest, Reservation, TableCombination,
    Employee, TimeTracking, PensionGuest, RegistrationForm, SystemSettings,
    OpeningHours, SpecialOpeningHours,
    ChatConversation, ChatMessage, AnalyticsSnapshot, CapacityRecommendation,
    ReservationRequest
)
from .serializers import (
    AreaSerializer, TableSerializer, GuestSerializer, ReservationSerializer,
    TableCombinationSerializer, EmployeeSerializer, TimeTrackingSerializer,
    PensionGuestSerializer, RegistrationFormSerializer, SystemSettingsSerializer,
    OpeningHoursSerializer, SpecialOpeningHoursSerializer,
    DashboardStatsSerializer,
    ChatConversationSerializer, ChatMessageSerializer,
    AnalyticsSnapshotSerializer, CapacityRecommendationSerializer,
    OccupancyTrendSerializer, RevenueAnalyticsSerializer, PredictiveInsightSerializer,
    ReservationRequestSerializer, ReservationRequestSubmitSerializer
)
from . import ai_service
from .services.reservation_filter import score_submission, is_auto_approved
from .utils.pdf_exports import ReservationPDFExporter, RegistrationFormPDFExporter
from .utils.csv_exports import (
    TimeTrackingCSVExporter, GuestCSVExporter,
    PensionGuestCSVExporter, ReservationCSVExporter
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

    @action(detail=False, methods=['get'], url_path='export-csv')
    def export_csv(self, request):
        """
        Exportiert Gäste als CSV.
        Beispiel: GET /api/guests/export-csv/
        """
        queryset = self.filter_queryset(self.get_queryset())
        queryset = queryset[:1000]  # Limit for performance

        exporter = GuestCSVExporter()
        csv_buffer = exporter.generate_guests_csv(queryset, include_gdpr=True)

        response = HttpResponse(csv_buffer, content_type='text/csv; charset=utf-8')
        filename = f"gaeste_{datetime.now().strftime('%Y%m%d')}.csv"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


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
        return Response({'status': 'Reservierung konnte nicht bestätigt werden (Status ist nicht "pending_confirmation")'}, status=status.HTTP_400_BAD_REQUEST)

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

            # Suche nach überlappenden Reservierungen
            overlapping_reservations = Reservation.objects.filter(
                table=table,
                status__in=['confirmed', 'pending_confirmation'],
                reservation_time__lt=end_time,  # Andere Reservierung startet vor Ende dieser
            )

            # Prüfe manuell, ob Endzeit der anderen Reservierung nach Start dieser liegt
            has_overlap = False
            for res in overlapping_reservations:
                other_end_time = res.reservation_time + timezone.timedelta(minutes=res.duration_minutes)
                if other_end_time > reservation_time:  # Andere Reservierung endet nach Start dieser
                    has_overlap = True
                    break

            if not has_overlap:
                available_tables.append(TableSerializer(table).data)

        if table_id: # Antwort für einen spezifischen Tisch
            if available_tables:
                return Response({"table_id": table_id, "available": True, "details": available_tables[0]})
            else:
                # Hier könnte man noch genauer prüfen, warum (z.B. Kapazität, schon belegt)
                return Response({"table_id": table_id, "available": False, "reason": "Tisch ist im gewünschten Zeitraum belegt oder nicht reservierbar."})
        else: # Antwort für eine allgemeine Anfrage
            return Response({"requested_time": reservation_time, "duration": duration_minutes, "num_guests": num_guests, "available_tables": available_tables})

    @action(detail=True, methods=['get'], url_path='export-pdf')
    def export_single_pdf(self, request, pk=None):
        """
        Exportiert eine einzelne Reservierung als PDF.
        Beispiel: GET /api/reservations/{id}/export-pdf/
        """
        reservation = self.get_object()
        exporter = ReservationPDFExporter()
        pdf_buffer = exporter.generate_single_reservation(reservation)

        response = HttpResponse(pdf_buffer, content_type='application/pdf')
        filename = f"reservierung_{reservation.reservation_id or reservation.id}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=['get'], url_path='export-pdf')
    def export_list_pdf(self, request):
        """
        Exportiert mehrere Reservierungen als PDF.
        Parameter: date_from, date_to (optional)
        Beispiel: GET /api/reservations/export-pdf/?date_from=2024-01-01&date_to=2024-01-31
        """
        queryset = self.filter_queryset(self.get_queryset())

        # Filter by date range if provided
        date_from_str = request.query_params.get('date_from')
        date_to_str = request.query_params.get('date_to')

        date_from = None
        date_to = None

        if date_from_str:
            try:
                date_from = datetime.strptime(date_from_str, "%Y-%m-%d").date()
                queryset = queryset.filter(date__gte=date_from)
            except ValueError:
                pass

        if date_to_str:
            try:
                date_to = datetime.strptime(date_to_str, "%Y-%m-%d").date()
                queryset = queryset.filter(date__lte=date_to)
            except ValueError:
                pass

        # Limit to reasonable number
        queryset = queryset[:200]

        exporter = ReservationPDFExporter()
        pdf_buffer = exporter.generate_reservation_list(queryset, date_from, date_to)

        response = HttpResponse(pdf_buffer, content_type='application/pdf')
        filename = f"reservierungen_{datetime.now().strftime('%Y%m%d')}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=['get'], url_path='export-csv')
    def export_csv(self, request):
        """
        Exportiert Reservierungen als CSV.
        Parameter: date_from, date_to (optional)
        Beispiel: GET /api/reservations/export-csv/?date_from=2024-01-01&date_to=2024-01-31
        """
        queryset = self.filter_queryset(self.get_queryset())

        # Filter by date range if provided
        date_from_str = request.query_params.get('date_from')
        date_to_str = request.query_params.get('date_to')

        date_from = None
        date_to = None

        if date_from_str:
            try:
                date_from = datetime.strptime(date_from_str, "%Y-%m-%d").date()
                queryset = queryset.filter(date__gte=date_from)
            except ValueError:
                pass

        if date_to_str:
            try:
                date_to = datetime.strptime(date_to_str, "%Y-%m-%d").date()
                queryset = queryset.filter(date__lte=date_to)
            except ValueError:
                pass

        queryset = queryset[:1000]  # Limit for performance

        exporter = ReservationCSVExporter()
        csv_buffer = exporter.generate_reservations_csv(queryset, date_from, date_to)

        response = HttpResponse(csv_buffer, content_type='text/csv; charset=utf-8')
        filename = f"reservierungen_{datetime.now().strftime('%Y%m%d')}.csv"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


def _create_guest_and_reservation(req: ReservationRequest) -> Reservation:
    """
    Erstellt (oder findet einen bestehenden) Guest und legt darauf eine
    Reservation mit Status 'pending_confirmation' an - identisch zum
    bisherigen Ablauf, nur ausgelöst durch eine freigegebene Anfrage.
    Wird sowohl bei Auto-Freigabe als auch beim manuellen 'approve' genutzt.
    """
    guest = None
    if req.email:
        guest = Guest.objects.filter(email__iexact=req.email).first()
    if not guest:
        guest = Guest.objects.filter(phone_number=req.phone_number).first()
    if not guest:
        guest = Guest.objects.create(
            first_name=req.first_name,
            last_name=req.last_name,
            phone_number=req.phone_number,
            email=req.email or None,
        )

    reservation = Reservation.objects.create(
        guest=guest,
        reservation_time=req.requested_time,
        number_of_guests=req.number_of_guests,
        notes=req.message or None,
        status='pending_confirmation',
    )
    return reservation


class ReservationRequestViewSet(mixins.CreateModelMixin,
                                mixins.ListModelMixin,
                                mixins.RetrieveModelMixin,
                                viewsets.GenericViewSet):
    """
    API Endpunkt für eingehende Reservierungsanfragen (Quarantäne).

    - POST /api/reservation-requests/ : öffentliche Einreichung (Gast, ohne Login),
      wird gegen Spam-/Phishing-Heuristiken geprüft.
    - GET  /api/reservation-requests/?status=pending_review : Mitarbeiter-Ansicht.
    - POST /api/reservation-requests/{id}/approve/ : manuelle Freigabe.
    - POST /api/reservation-requests/{id}/reject/  : Ablehnung.

    Bewusst kein PUT/PATCH/DELETE: Inhalte dürfen nach der Risiko-Bewertung
    nicht mehr verändert und Quarantäne-Datensätze nicht gelöscht werden.
    """
    queryset = ReservationRequest.objects.all()
    serializer_class = ReservationRequestSerializer

    def get_permissions(self):
        # Einreichung ist immer öffentlich; alles andere folgt dem globalen
        # Default, damit eine spätere Einschränkung dort automatisch greift.
        if self.action == 'create':
            return [AllowAny()]
        return super().get_permissions()

    def get_queryset(self):
        """Filtern nach Status, z.B. /api/reservation-requests/?status=pending_review"""
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset

    def create(self, request, *args, **kwargs):
        """
        Öffentliche Einreichung einer Reservierungsanfrage. Erstellt IMMER einen
        ReservationRequest-Datensatz (Quarantäne). Nur bei niedrigem Risiko wird
        direkt Guest + Reservation angelegt (auto_approved).
        """
        input_serializer = ReservationRequestSubmitSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        data = input_serializer.validated_data

        source_ip = request.META.get('REMOTE_ADDR') or None

        risk_score, risk_reasons = score_submission(
            first_name=data['first_name'],
            last_name=data['last_name'],
            phone_number=data['phone_number'],
            email=data.get('email'),
            requested_time=data['requested_time'],
            number_of_guests=data['number_of_guests'],
            message=data.get('message', ''),
            source_ip=source_ip,
            recent_requests_queryset=ReservationRequest.objects.all(),
        )

        auto_approved = is_auto_approved(risk_score)

        with transaction.atomic():
            req = self._create_request(data, source_ip, risk_score, risk_reasons, auto_approved)

        # Öffentliche Antwort bewusst knapp: Status, Score, Gründe und IP gehen
        # den Einreicher nichts an (sonst lassen sich die Heuristiken austesten).
        return Response(
            {'id': req.id, 'detail': 'Anfrage eingegangen.'},
            status=status.HTTP_201_CREATED
        )

    @staticmethod
    def _create_request(data, source_ip, risk_score, risk_reasons, auto_approved):
        req = ReservationRequest.objects.create(
            first_name=data['first_name'],
            last_name=data['last_name'],
            phone_number=data['phone_number'],
            email=data.get('email') or None,
            requested_time=data['requested_time'],
            number_of_guests=data['number_of_guests'],
            message=data.get('message', ''),
            source_ip=source_ip,
            status='auto_approved' if auto_approved else 'pending_review',
            risk_score=risk_score,
            risk_reasons=risk_reasons,
        )

        if auto_approved:
            req.reservation = _create_guest_and_reservation(req)
            req.reviewed_at = timezone.now()
            req.save(update_fields=['reservation', 'reviewed_at'])
        return req

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        """Manuelle Freigabe einer in Quarantäne stehenden Anfrage durch Mitarbeiter."""
        req = self.get_object()
        with transaction.atomic():
            # Bedingtes UPDATE statt Lesen-dann-Schreiben: bei gleichzeitigen
            # Klicks gewinnt genau einer, es entsteht keine doppelte Reservierung.
            claimed = ReservationRequest.objects.filter(
                pk=req.pk, status='pending_review'
            ).update(status='approved', reviewed_at=timezone.now())
            if not claimed:
                return Response(
                    {'error': 'Nur Anfragen mit Status "pending_review" können freigegeben werden.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            req.refresh_from_db()
            req.reservation = _create_guest_and_reservation(req)
            req.save(update_fields=['reservation'])

        return Response(ReservationRequestSerializer(req).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        """Ablehnung einer in Quarantäne stehenden Anfrage - keine Guest/Reservation-Erstellung."""
        req = self.get_object()
        claimed = ReservationRequest.objects.filter(
            pk=req.pk, status='pending_review'
        ).update(status='rejected', reviewed_at=timezone.now())
        if not claimed:
            return Response(
                {'error': 'Nur Anfragen mit Status "pending_review" können abgelehnt werden.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        req.refresh_from_db()

        return Response(ReservationRequestSerializer(req).data, status=status.HTTP_200_OK)


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

    @action(detail=False, methods=['get'], url_path='export-csv')
    def export_csv(self, request):
        """
        Exportiert Zeiterfassung als CSV.
        Parameter: employee_id, date_from, date_to (optional)
        Beispiel: GET /api/time-tracking/export-csv/?date_from=2024-01-01&date_to=2024-01-31
        """
        queryset = self.filter_queryset(self.get_queryset())

        # Parse date parameters
        date_from_str = request.query_params.get('date_from')
        date_to_str = request.query_params.get('date_to')

        date_from = None
        date_to = None

        if date_from_str:
            try:
                date_from = datetime.strptime(date_from_str, "%Y-%m-%d").date()
            except ValueError:
                pass

        if date_to_str:
            try:
                date_to = datetime.strptime(date_to_str, "%Y-%m-%d").date()
            except ValueError:
                pass

        queryset = queryset[:1000]  # Limit for performance

        exporter = TimeTrackingCSVExporter()
        csv_buffer = exporter.generate_time_tracking_csv(queryset, date_from, date_to)

        response = HttpResponse(csv_buffer, content_type='text/csv; charset=utf-8')
        filename = f"zeiterfassung_{datetime.now().strftime('%Y%m%d')}.csv"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


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

    @action(detail=False, methods=['get'], url_path='export-csv')
    def export_csv(self, request):
        """
        Exportiert Pensionsgäste als CSV.
        Beispiel: GET /api/pension-guests/export-csv/
        """
        queryset = self.filter_queryset(self.get_queryset())
        queryset = queryset[:1000]  # Limit for performance

        exporter = PensionGuestCSVExporter()
        csv_buffer = exporter.generate_pension_guests_csv(queryset)

        response = HttpResponse(csv_buffer, content_type='text/csv; charset=utf-8')
        filename = f"pensionsgaeste_{datetime.now().strftime('%Y%m%d')}.csv"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


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

    @action(detail=True, methods=['get'], url_path='export-pdf')
    def export_pdf(self, request, pk=None):
        """
        Exportiert einen Meldeschein als BMG-konformes PDF.
        Beispiel: GET /api/registration-forms/{id}/export-pdf/
        """
        registration = self.get_object()
        exporter = RegistrationFormPDFExporter()
        pdf_buffer = exporter.generate_registration_form(registration)

        response = HttpResponse(pdf_buffer, content_type='application/pdf')
        filename = f"meldeschein_{registration.guest.last_name}_{datetime.now().strftime('%Y%m%d')}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


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

