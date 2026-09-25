"""Tests für die Spam-/Phishing-Filterung öffentlicher Reservierungsanfragen."""
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta

from app_core.models import ReservationRequest, Reservation
from app_core.services.reservation_filter import score_submission, RISK_SCORE_THRESHOLD


class ScoreSubmissionTests(TestCase):
    """Testet die reine Scoring-Funktion direkt, ohne HTTP-Schicht."""

    def _future_time(self, days=3):
        return timezone.now() + timedelta(days=days)

    def test_clean_submission_has_low_score(self):
        score, reasons = score_submission(
            first_name="Maria",
            last_name="Huber",
            phone_number="089 1234567",
            email="maria.huber@example.com",
            requested_time=self._future_time(),
            number_of_guests=4,
            message="Wir feiern einen Geburtstag, ein Fensterplatz wäre schön.",
        )
        self.assertEqual(reasons, [])
        self.assertLess(score, RISK_SCORE_THRESHOLD)

    def test_message_with_link_scores_high(self):
        score, reasons = score_submission(
            first_name="Max",
            last_name="Mustermann",
            phone_number="089 1234567",
            email="max@example.com",
            requested_time=self._future_time(),
            number_of_guests=2,
            message="Bitte bestätigen Sie hier: http://phishing-example.test/verify",
        )
        self.assertGreaterEqual(score, RISK_SCORE_THRESHOLD)
        self.assertTrue(any('Link' in r for r in reasons))

    def test_malformed_email_scores_high(self):
        score, reasons = score_submission(
            first_name="Erika",
            last_name="Musterfrau",
            phone_number="089 1234567",
            email="not-an-email",
            requested_time=self._future_time(),
            number_of_guests=2,
            message="",
        )
        self.assertGreater(score, 0)
        self.assertTrue(any('E-Mail' in r for r in reasons))


class ReservationRequestEndpointTests(TestCase):
    """Testet den öffentlichen Submission-Endpunkt sowie die Approve-Action."""

    def setUp(self):
        self.list_url = reverse('reservation-request-list')
        self.future_time = (timezone.now() + timedelta(days=2)).isoformat()

    def test_clean_submission_is_auto_approved_and_creates_reservation(self):
        payload = {
            "first_name": "Maria",
            "last_name": "Huber",
            "phone_number": "089 1234567",
            "email": "maria.huber@example.com",
            "requested_time": self.future_time,
            "number_of_guests": 4,
            "message": "Ein Fensterplatz wäre schön.",
        }
        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, 201, response.content)
        req = ReservationRequest.objects.get(pk=response.data['id'])
        self.assertEqual(req.status, 'auto_approved')
        self.assertIsNotNone(req.reservation)
        self.assertEqual(Reservation.objects.count(), 1)

    def test_spammy_submission_is_quarantined_without_reservation(self):
        payload = {
            "first_name": "Spam",
            "last_name": "Bot",
            "phone_number": "abc",
            "email": "not-an-email",
            "requested_time": self.future_time,
            "number_of_guests": 2,
            "message": "Klick hier: http://phishing.test/win",
        }
        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, 201, response.content)
        req = ReservationRequest.objects.get(pk=response.data['id'])
        self.assertEqual(req.status, 'pending_review')
        self.assertIsNone(req.reservation)
        self.assertEqual(Reservation.objects.count(), 0)

    def test_approve_creates_reservation_for_pending_request(self):
        req = ReservationRequest.objects.create(
            first_name="Verdacht",
            last_name="Fall",
            phone_number="089 7654321",
            email="verdacht@example.com",
            requested_time=timezone.now() + timedelta(days=1),
            number_of_guests=3,
            message="",
            status='pending_review',
            risk_score=RISK_SCORE_THRESHOLD,
            risk_reasons=['manuell zu prüfen'],
        )
        approve_url = reverse('reservation-request-approve', args=[req.id])
        response = self.client.post(approve_url)
        self.assertEqual(response.status_code, 200, response.content)
        req.refresh_from_db()
        self.assertEqual(req.status, 'approved')
        self.assertIsNotNone(req.reservation)
        self.assertEqual(Reservation.objects.count(), 1)


class ReservationRequestHardeningTests(TestCase):
    """Absicherung des öffentlichen Endpunkts gegen Manipulation und Doppel-Freigaben."""

    def setUp(self):
        self.list_url = reverse('reservation-request-list')
        self.payload = {
            "first_name": "Maria",
            "last_name": "Huber",
            "phone_number": "089 1234567",
            "email": "maria.huber@example.com",
            "requested_time": (timezone.now() + timedelta(days=2)).isoformat(),
            "number_of_guests": 4,
            "message": "",
        }

    def _pending(self):
        return ReservationRequest.objects.create(
            first_name="Verdacht", last_name="Fall", phone_number="089 7654321",
            requested_time=timezone.now() + timedelta(days=1), number_of_guests=2,
            status='pending_review', risk_score=RISK_SCORE_THRESHOLD,
        )

    def test_internal_fields_in_payload_are_ignored(self):
        payload = dict(self.payload, message="Klick: http://phishing.test",
                       status='approved', risk_score=0, risk_reasons=[])
        response = self.client.post(self.list_url, payload, content_type='application/json')
        self.assertEqual(response.status_code, 201, response.content)
        req = ReservationRequest.objects.get(pk=response.data['id'])
        self.assertEqual(req.status, 'pending_review')
        self.assertGreaterEqual(req.risk_score, RISK_SCORE_THRESHOLD)
        self.assertEqual(Reservation.objects.count(), 0)

    def test_public_response_does_not_leak_scoring(self):
        response = self.client.post(self.list_url, self.payload, content_type='application/json')
        self.assertEqual(response.status_code, 201, response.content)
        for key in ('status', 'risk_score', 'risk_reasons', 'source_ip'):
            self.assertNotIn(key, response.data)

    def test_missing_required_fields_return_400(self):
        response = self.client.post(self.list_url, {"first_name": "X"}, content_type='application/json')
        self.assertEqual(response.status_code, 400)
        for field in ('last_name', 'phone_number', 'requested_time', 'number_of_guests'):
            self.assertIn(field, response.data)

    def test_malformed_input_returns_400(self):
        for bad in ({"number_of_guests": "viele"}, {"requested_time": "morgen"},
                    {"phone_number": "1" * 50}, {"number_of_guests": 0}):
            response = self.client.post(self.list_url, dict(self.payload, **bad),
                                        content_type='application/json')
            self.assertEqual(response.status_code, 400, bad)
        response = self.client.post(self.list_url, [1, 2], content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_update_and_delete_are_not_allowed(self):
        req = self._pending()
        detail_url = reverse('reservation-request-detail', args=[req.id])
        self.assertEqual(self.client.patch(detail_url, {"message": "harmlos"},
                                           content_type='application/json').status_code, 405)
        self.assertEqual(self.client.put(detail_url, {}, content_type='application/json').status_code, 405)
        self.assertEqual(self.client.delete(detail_url).status_code, 405)
        self.assertTrue(ReservationRequest.objects.filter(pk=req.pk).exists())

    def test_past_date_is_quarantined(self):
        payload = dict(self.payload, requested_time=(timezone.now() - timedelta(days=30)).isoformat())
        response = self.client.post(self.list_url, payload, content_type='application/json')
        req = ReservationRequest.objects.get(pk=response.data['id'])
        self.assertEqual(req.status, 'pending_review')
        self.assertEqual(Reservation.objects.count(), 0)

    def test_flood_from_same_ip_is_quarantined(self):
        for i in range(8):
            self.client.post(self.list_url, dict(self.payload, email=f"gast{i}@example.com"),
                             content_type='application/json')
        # Die ersten RATE_LIMIT_MAX_SUBMISSIONS dürfen durch, danach Quarantäne.
        self.assertEqual(Reservation.objects.count(), 5)
        self.assertEqual(ReservationRequest.objects.filter(status='pending_review').count(), 3)

    def test_approve_twice_creates_single_reservation(self):
        req = self._pending()
        url = reverse('reservation-request-approve', args=[req.id])
        self.assertEqual(self.client.post(url).status_code, 200)
        self.assertEqual(self.client.post(url).status_code, 400)
        self.assertEqual(Reservation.objects.count(), 1)

    def test_rejected_cannot_be_approved(self):
        req = self._pending()
        self.assertEqual(self.client.post(reverse('reservation-request-reject', args=[req.id])).status_code, 200)
        self.assertEqual(self.client.post(reverse('reservation-request-approve', args=[req.id])).status_code, 400)
        req.refresh_from_db()
        self.assertEqual(req.status, 'rejected')
        self.assertEqual(Reservation.objects.count(), 0)

    def test_auto_approved_cannot_be_approved_again(self):
        response = self.client.post(self.list_url, self.payload, content_type='application/json')
        url = reverse('reservation-request-approve', args=[response.data['id']])
        self.assertEqual(self.client.post(url).status_code, 400)
        self.assertEqual(Reservation.objects.count(), 1)
