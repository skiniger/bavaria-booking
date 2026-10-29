"""API-Tests Reservierungen (Personal-Oberfläche). Angelegt 29.10.2026, Branch test/bavariabookingx-tests."""
import unittest
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from app_core.models import Area, Table, Guest, Reservation


class ReservationApiTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='personal', password='geheim-123', employee_number='EMP-R1')
        self.client.force_login(self.user)
        self.area = Area.objects.create(name='Wirtshaus')
        self.table = Table.objects.create(area=self.area, table_number='T1', capacity=4)
        self.blocked = Table.objects.create(area=self.area, table_number='T2', capacity=6, is_reservable=False)
        self.guest = Guest.objects.create(first_name='Maria', last_name='Huber', phone_number='089 1234567')
        self.when = (timezone.now() + timedelta(days=2)).replace(hour=18, minute=0, second=0, microsecond=0)
        self.url = reverse('reservation-list')

    def payload(self, **kw):
        data = {'guest': str(self.guest.id), 'table': str(self.table.id),
                'reservation_time': self.when.isoformat(), 'number_of_guests': 2, 'duration_minutes': 120}
        data.update(kw)
        return data

    def post(self, **kw):
        return self.client.post(self.url, self.payload(**kw), content_type='application/json')

    def test_create_reservation(self):
        r = self.post()
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.data['status'], 'pending_confirmation')
        self.assertEqual(r.data['guest_details']['last_name'], 'Huber')
        self.assertEqual(r.data['table_details']['table_number'], 'T1')

    def test_create_without_table_is_allowed(self):
        r = self.post(table=None)
        self.assertEqual(r.status_code, 201, r.content)

    def test_missing_guest_is_400(self):
        data = self.payload()
        del data['guest']
        self.assertEqual(self.client.post(self.url, data, content_type='application/json').status_code, 400)

    def test_past_time_is_400(self):
        self.assertEqual(self.post(reservation_time=(timezone.now() - timedelta(hours=2)).isoformat()).status_code, 400)

    def test_zero_guests_is_400(self):
        self.assertEqual(self.post(number_of_guests=0).status_code, 400)

    def test_over_capacity_is_400(self):
        r = self.post(number_of_guests=5)
        self.assertEqual(r.status_code, 400)
        self.assertIn('number_of_guests', r.data)

    def test_non_reservable_table_is_400(self):
        r = self.post(table=str(self.blocked.id))
        self.assertEqual(r.status_code, 400)
        self.assertIn('table', r.data)

    def test_overlap_same_table_is_400(self):
        self.assertEqual(self.post().status_code, 201)
        r = self.post(reservation_time=(self.when + timedelta(minutes=60)).isoformat())
        self.assertEqual(r.status_code, 400)
        self.assertIn('table', r.data)

    def test_back_to_back_is_allowed(self):
        self.assertEqual(self.post().status_code, 201)
        self.assertEqual(self.post(reservation_time=(self.when + timedelta(minutes=120)).isoformat()).status_code, 201)

    def test_cancelled_reservation_frees_table(self):
        r = self.post()
        self.client.post(reverse('reservation-cancel-reservation', args=[r.data['id']]))
        self.assertEqual(self.post().status_code, 201)

    def test_confirm_and_cancel_flow(self):
        rid = self.post().data['id']
        self.assertEqual(self.client.post(reverse('reservation-confirm-reservation', args=[rid])).status_code, 200)
        self.assertEqual(self.client.post(reverse('reservation-confirm-reservation', args=[rid])).status_code, 400)
        self.assertEqual(self.client.post(reverse('reservation-cancel-reservation', args=[rid])).status_code, 200)
        self.assertEqual(Reservation.objects.get(pk=rid).status, 'cancelled_by_restaurant')
        self.assertEqual(self.client.post(reverse('reservation-cancel-reservation', args=[rid])).status_code, 400)

    def test_list_filters(self):
        self.post()
        r = self.client.get(self.url, {'date': self.when.astimezone(timezone.get_current_timezone()).date().isoformat()})
        self.assertEqual(r.data['count'], 1)
        r = self.client.get(self.url, {'status': 'confirmed'})
        self.assertEqual(r.data['count'], 0)
        # ungültiges Datum wird ignoriert (kein 500)
        self.assertEqual(self.client.get(self.url, {'date': '31.12.2026'}).status_code, 200)

    def test_BEFUND_invalid_uuid_filter_returns_400_not_500(self):
        """BEHOBEN (fix/bbx-testbefunde), vorher BEFUND: ?guest_id=kein-uuid führt zu ValidationError → 500 statt 400."""
        r = self.client.get(self.url, {'guest_id': 'kein-uuid'})
        self.assertEqual(r.status_code, 400)

    def test_check_availability(self):
        self.post()
        url = reverse('reservation-check-availability')
        q = {'date': self.when.astimezone(timezone.get_current_timezone()).strftime('%Y-%m-%d'),
             'time': self.when.astimezone(timezone.get_current_timezone()).strftime('%H:%M'),
             'duration': '120', 'guests': '2'}
        r = self.client.get(url, q)
        self.assertEqual(r.status_code, 200, r.content)
        ids = [t['id'] for t in r.data['available_tables']]
        self.assertNotIn(str(self.table.id), ids)  # belegt
        r = self.client.get(url, dict(q, table_id=str(self.table.id)))
        self.assertFalse(r.data['available'])
        self.assertEqual(self.client.get(url, {'date': '2026-12-01'}).status_code, 400)
        self.assertEqual(self.client.get(url, dict(q, guests='viele')).status_code, 400)

    def test_BEFUND_export_pdf_single(self):
        """BEHOBEN (fix/bbx-testbefunde), vorher BEFUND: pdf_exports nutzt reservation.reservation_id/date/time/party_size (gibt es nicht) → HTTP 500."""
        rid = self.post().data['id']
        r = self.client.get(reverse('reservation-export-single-pdf', args=[rid]))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r['Content-Type'], 'application/pdf')

    def test_BEFUND_export_csv(self):
        """BEHOBEN (fix/bbx-testbefunde), vorher BEFUND: csv_exports nutzt res.party_size/reservation_id (gibt es nicht) → HTTP 500."""
        self.post()
        r = self.client.get(reverse('reservation-export-csv'))
        self.assertEqual(r.status_code, 200)
        self.assertIn('text/csv', r['Content-Type'])

    def test_BEFUND_export_list_pdf(self):
        """BEHOBEN (fix/bbx-testbefunde), vorher BEFUND: Listen-PDF nutzt res.party_size → Fehler."""
        self.post()
        self.client.raise_request_exception = False
        r = self.client.get(reverse('reservation-export-list-pdf'))
        self.assertEqual(r.status_code, 200)

    def test_BEFUND_guest_export_csv(self):
        """BEHOBEN (fix/bbx-testbefunde), vorher BEFUND: Gäste-CSV nutzt guest.guest_id (gibt es nicht)."""
        self.client.raise_request_exception = False
        r = self.client.get(reverse('guest-export-csv'))
        self.assertEqual(r.status_code, 200)

    def test_export_contents_and_date_filters(self):
        """Fix 3: Exporte enthalten echte Werte (Ortszeit) und Datumsfilter laufen ohne 500."""
        self.post(number_of_guests=3)
        local = timezone.localtime(self.when)
        day = local.date().isoformat()
        r = self.client.get(reverse('reservation-export-csv'), {'date_from': day, 'date_to': day})
        self.assertEqual(r.status_code, 200)
        body = r.content.decode('utf-8')
        self.assertIn('Huber', body)
        self.assertIn(local.strftime('%d.%m.%Y'), body)
        self.assertIn(local.strftime('%H:%M'), body)
        r = self.client.get(reverse('reservation-export-list-pdf'), {'date_from': day, 'date_to': day})
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.content.startswith(b'%PDF'))
        r = self.client.get(reverse('guest-export-csv'))
        self.assertEqual(r.status_code, 200)
        self.assertIn('Huber', r.content.decode('utf-8'))

    def test_requires_login(self):
        self.client.logout()
        self.assertEqual(self.post().status_code, 403)


class ChatMockTests(TestCase):
    """MeitiAI: regelbasierter Mock (kein Provider)."""

    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='personal', password='geheim-123', employee_number='EMP-C1')
        self.client.force_login(self.user)

    def test_send_message_returns_assistant_reply(self):
        from app_core.models import ChatConversation
        conv = ChatConversation.objects.create(employee=self.user, title='Test')
        url = reverse('chat-conversation-send-message', args=[conv.id])
        self.assertEqual(self.client.post(url, {'content': ''}, content_type='application/json').status_code, 400)
        r = self.client.post(url, {'content': 'Wie ist die Auslastung?'}, content_type='application/json')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.data['assistant_message']['role'], 'assistant')
        self.assertTrue(r.data['assistant_message']['content'])

    def test_BEFUND_chat_answer_uses_real_data(self):
        """BEHOBEN (fix/bbx-testbefunde), vorher BEFUND: Antworten sind fest verdrahtete Beispielzahlen (z. B. '23 Reservierungen'),
        unabhängig von der Datenbank. Hier: 0 Reservierungen in der DB."""
        from app_core import ai_service
        answer = ai_service.generate_chat_response([], 'Wie viele Reservierungen haben wir heute?')
        self.assertNotIn('23 Reservierungen', answer)
        self.assertIn('keine Reservierungen', answer)

    def test_chat_counts_todays_reservations(self):
        from app_core import ai_service
        from app_core.models import Guest, Reservation
        g = Guest.objects.create(first_name='Chat', last_name='Test')
        now = timezone.localtime()
        when = now.replace(hour=12, minute=0, second=0, microsecond=0)
        Reservation.objects.create(guest=g, reservation_time=when, number_of_guests=4, status='confirmed')
        Reservation.objects.create(guest=g, reservation_time=when, number_of_guests=2, status='cancelled_by_guest')
        answer = ai_service.generate_chat_response([], 'Reservierungen heute?')
        self.assertIn('2 Reservierungen', answer)
        self.assertIn('4 Personen', answer)
        self.assertIn('1 storniert', answer)
