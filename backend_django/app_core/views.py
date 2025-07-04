from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import IntegrityError
from .models import Area, Table, Guest, Reservation
from .serializers import AreaSerializer, TableSerializer, GuestSerializer, ReservationSerializer
from django.utils import timezone

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
