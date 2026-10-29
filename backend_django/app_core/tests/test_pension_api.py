"""API-Tests Pension / Meldeschein. Angelegt 29.10.2026, Branch test/bavariabookingx-tests."""
import unittest
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from app_core.models import PensionGuest, RegistrationForm


GUEST = {
    'salutation': 'frau', 'first_name': 'Erika', 'last_name': 'Musterfrau', 'birth_date': '1980-05-17',
    'nationality': 'deutsch', 'street': 'Dorfstr.', 'house_number': '1', 'postal_code': '86000',
    'city': 'Augsburg', 'country': 'Deutschland', 'document_type': 'id_card', 'document_number': 'T22000129',
}


class PensionApiTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='rezeption', password='geheim-123', employee_number='EMP-P1')
        self.client.force_login(self.user)

    def create_guest(self, **kw):
        return self.client.post(reverse('pension-guest-list'), dict(GUEST, **kw), content_type='application/json')

    def form_payload(self, guest_id, **kw):
        arrival = date.today() + timedelta(days=5)
        data = {'guest': guest_id, 'arrival_date': arrival.isoformat(),
                'departure_date': (arrival + timedelta(days=3)).isoformat(), 'room_number': '7',
                'travel_purpose': 'private', 'room_price_per_night': '60.00', 'payment_method': 'cash',
                'breakfast_included': True, 'breakfast_price': '10.00', 'tourist_tax_amount': '7.50'}
        data.update(kw)
        return data

    def test_create_pension_guest(self):
        r = self.create_guest()
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.data['full_name'], 'Erika Musterfrau')
        self.assertIn('86000 Augsburg', r.data['full_address'])

    def test_pension_guest_required_fields(self):
        r = self.client.post(reverse('pension-guest-list'), {'first_name': 'X'}, content_type='application/json')
        self.assertEqual(r.status_code, 400)
        for f in ('last_name', 'birth_date', 'nationality', 'document_type', 'document_number', 'salutation'):
            self.assertIn(f, r.data)

    def test_invalid_choices_and_email(self):
        self.assertEqual(self.create_guest(document_type='bibliotheksausweis').status_code, 400)
        self.assertEqual(self.create_guest(email='kein-at').status_code, 400)
        self.assertEqual(self.create_guest(birth_date='17.05.1980').status_code, 400)

    def test_search(self):
        self.create_guest()
        r = self.client.get(reverse('pension-guest-search-guests'), {'name': 'muster'})
        self.assertEqual(len(r.data), 1)
        r = self.client.get(reverse('pension-guest-search-guests'), {'document_number': '000129'})
        self.assertEqual(len(r.data), 1)

    def test_registration_form_total_and_nights(self):
        gid = self.create_guest().data['id']
        r = self.client.post(reverse('registration-form-list'), self.form_payload(gid), content_type='application/json')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.data['nights'], 3)
        # 3 × 60 + 3 × 10 + 7,50 = 217,50
        self.assertEqual(Decimal(r.data['total_amount']), Decimal('217.50'))
        self.assertEqual(r.data['status'], 'draft')
        self.assertEqual(r.data['guest_name'], 'Erika Musterfrau')

    def test_total_without_breakfast(self):
        gid = self.create_guest().data['id']
        r = self.client.post(reverse('registration-form-list'),
                             self.form_payload(gid, breakfast_included=False), content_type='application/json')
        self.assertEqual(Decimal(r.data['total_amount']), Decimal('187.50'))

    def test_status_workflow(self):
        gid = self.create_guest().data['id']
        fid = self.client.post(reverse('registration-form-list'), self.form_payload(gid),
                               content_type='application/json').data['id']
        check_in = reverse('registration-form-check-in-guest', args=[fid])
        check_out = reverse('registration-form-check-out-guest', args=[fid])
        export = reverse('registration-form-export-to-city', args=[fid])
        self.assertEqual(self.client.post(check_in).status_code, 400)       # draft → nicht erlaubt
        self.assertEqual(self.client.post(export).status_code, 400)
        self.client.patch(reverse('registration-form-detail', args=[fid]), {'status': 'confirmed'},
                          content_type='application/json')
        self.assertEqual(self.client.post(check_out).status_code, 400)      # nicht eingecheckt
        self.assertEqual(self.client.post(check_in).status_code, 200)
        self.assertEqual(self.client.post(check_out).status_code, 200)
        r = self.client.post(export)
        self.assertEqual(r.status_code, 200)
        self.assertTrue(RegistrationForm.objects.get(pk=fid).exported_to_city)

    @unittest.expectedFailure
    def test_BEFUND_meldeschein_pdf_export(self):
        """BEFUND: Meldeschein-PDF nutzt guest.guest_id (gibt es nicht) → HTTP 500."""
        gid = self.create_guest().data['id']
        fid = self.client.post(reverse('registration-form-list'), self.form_payload(gid),
                               content_type='application/json').data['id']
        r = self.client.get(reverse('registration-form-export-pdf', args=[fid]))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r['Content-Type'], 'application/pdf')
        self.assertTrue(r.content.startswith(b'%PDF'))

    @unittest.expectedFailure
    def test_BEFUND_pension_guest_export_csv(self):
        """BEFUND: Pensionsgäste-CSV nutzt guest.guest_id (gibt es nicht)."""
        self.create_guest()
        self.client.raise_request_exception = False
        r = self.client.get(reverse('pension-guest-export-csv'))
        self.assertEqual(r.status_code, 200)

    def test_filter_by_status(self):
        gid = self.create_guest().data['id']
        self.client.post(reverse('registration-form-list'), self.form_payload(gid), content_type='application/json')
        self.assertEqual(self.client.get(reverse('registration-form-list'), {'status': 'draft'}).data['count'], 1)
        self.assertEqual(self.client.get(reverse('registration-form-list'), {'status': 'checked_in'}).data['count'], 0)

    def test_guest_with_registration_cannot_be_deleted(self):
        """PROTECT: Gast mit Meldeschein darf nicht verschwinden."""
        gid = self.create_guest().data['id']
        self.client.post(reverse('registration-form-list'), self.form_payload(gid), content_type='application/json')
        try:
            r = self.client.delete(reverse('pension-guest-detail', args=[gid]))
            code = r.status_code
        except Exception:  # ProtectedError schlägt bis zum Test durch
            code = 500
        self.assertTrue(PensionGuest.objects.filter(pk=gid).exists())
        self.assertNotEqual(code, 204)

    @unittest.expectedFailure
    def test_BEFUND_delete_guest_with_registration_returns_clean_error(self):
        """BEFUND: Löschen eines Gastes mit Meldeschein wirft ProtectedError → HTTP 500 statt 400/409."""
        gid = self.create_guest().data['id']
        self.client.post(reverse('registration-form-list'), self.form_payload(gid), content_type='application/json')
        self.client.raise_request_exception = False
        r = self.client.delete(reverse('pension-guest-detail', args=[gid]))
        self.assertIn(r.status_code, (400, 409))

    @unittest.expectedFailure
    def test_BEFUND_departure_before_arrival_rejected(self):
        """BEFUND: Abreise vor Anreise wird angenommen; Summe wird negativ."""
        gid = self.create_guest().data['id']
        arrival = date.today() + timedelta(days=5)
        r = self.client.post(reverse('registration-form-list'),
                             self.form_payload(gid, departure_date=(arrival - timedelta(days=2)).isoformat()),
                             content_type='application/json')
        self.assertEqual(r.status_code, 400)

    @unittest.expectedFailure
    def test_BEFUND_business_trip_requires_company(self):
        """BEFUND: Reisezweck 'business' ohne Firmenname wird angenommen (keine Pflichtprüfung)."""
        gid = self.create_guest().data['id']
        r = self.client.post(reverse('registration-form-list'),
                             self.form_payload(gid, travel_purpose='business'), content_type='application/json')
        self.assertEqual(r.status_code, 400)

    def test_requires_login(self):
        self.client.logout()
        self.assertEqual(self.client.get(reverse('registration-form-list')).status_code, 403)
        self.assertEqual(self.create_guest().status_code, 403)
