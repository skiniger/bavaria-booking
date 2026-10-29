"""Tests für Anmeldung (Session + CSRF) und die geschlossene API."""
from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse


class AuthTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='personal', password='geheim-123', employee_number='EMP-A1',
        )

    def _login(self, client=None, password='geheim-123'):
        client = client or self.client
        return client.post(reverse('auth-login'), {'username': 'personal', 'password': password},
                           content_type='application/json')

    def test_login_with_valid_credentials(self):
        response = self._login()
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data['username'], 'personal')
        self.assertNotIn('password', response.data)
        self.assertEqual(self.client.get(reverse('auth-me')).status_code, 200)

    def test_login_with_wrong_password(self):
        self.assertEqual(self._login(password='falsch').status_code, 401)
        self.assertEqual(self.client.get(reverse('auth-me')).status_code, 403)

    def test_login_missing_fields(self):
        response = self.client.post(reverse('auth-login'), {'username': 'personal'},
                                    content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_inactive_employee_cannot_login(self):
        self.user.is_active_employee = False
        self.user.save()
        self.assertEqual(self._login().status_code, 401)

    def test_logout_ends_session(self):
        self._login()
        self.assertEqual(self.client.post(reverse('auth-logout')).status_code, 204)
        self.assertEqual(self.client.get(reverse('auth-me')).status_code, 403)

    def test_csrf_endpoint_sets_cookie(self):
        response = self.client.get(reverse('auth-csrf'))
        self.assertEqual(response.status_code, 200)
        self.assertIn('csrftoken', response.cookies)

    def test_authenticated_post_requires_csrf_token(self):
        client = Client(enforce_csrf_checks=True)
        client.get(reverse('auth-csrf'))
        self.assertEqual(self._login(client).status_code, 200)
        token = client.cookies['csrftoken'].value

        self.assertEqual(client.post(reverse('auth-logout')).status_code, 403)
        self.assertEqual(client.post(reverse('auth-logout'), HTTP_X_CSRFTOKEN=token).status_code, 204)


class ApiClosedTests(TestCase):
    """Stichprobe: bestehende Endpunkte sind ohne Anmeldung nicht mehr erreichbar."""

    def test_existing_endpoints_require_login(self):
        for name in ('reservation-list', 'guest-list', 'employee-list', 'pension-guest-list'):
            self.assertEqual(self.client.get(reverse(name)).status_code, 403, name)
        response = self.client.post(reverse('reservation-list'), {}, content_type='application/json')
        self.assertEqual(response.status_code, 403)

    def test_public_reservation_request_still_open(self):
        response = self.client.post(reverse('reservation-request-list'), {}, content_type='application/json')
        # 400 (Validierung) statt 403 – der Endpunkt ist ohne Login erreichbar.
        self.assertEqual(response.status_code, 400)


# ---------------------------------------------------------------------------
# Erweiterung 29.10.2026 (Branch test/bavariabookingx-tests)
# ---------------------------------------------------------------------------
import unittest  # noqa: E402

from app_core.models import SystemSettings  # noqa: E402


class AuthEdgeCaseTests(TestCase):
    """Randfälle der Anmeldung."""

    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='personal', password='geheim-123', employee_number='EMP-B1',
        )

    def _post(self, data, client=None):
        return (client or self.client).post(reverse('auth-login'), data, content_type='application/json')

    def test_unknown_user_gets_401_same_message_as_wrong_password(self):
        r1 = self._post({'username': 'gibtsnicht', 'password': 'x'})
        r2 = self._post({'username': 'personal', 'password': 'falsch'})
        self.assertEqual(r1.status_code, 401)
        self.assertEqual(r2.status_code, 401)
        # Keine Benutzer-Enumeration: identische Meldung.
        self.assertEqual(r1.data, r2.data)

    def test_non_string_credentials_return_400(self):
        for data in ({'username': ['personal'], 'password': 'geheim-123'},
                     {'username': 'personal', 'password': 123},
                     {'username': '', 'password': ''},
                     {}):
            self.assertEqual(self._post(data).status_code, 400, data)

    def test_django_is_active_false_cannot_login(self):
        self.user.is_active = False
        self.user.save()
        self.assertEqual(self._post({'username': 'personal', 'password': 'geheim-123'}).status_code, 401)

    def test_login_get_not_allowed(self):
        self.assertEqual(self.client.get(reverse('auth-login')).status_code, 405)

    def test_me_without_session_is_403(self):
        self.assertEqual(self.client.get(reverse('auth-me')).status_code, 403)

    def test_logout_without_session_is_403(self):
        self.assertEqual(self.client.post(reverse('auth-logout')).status_code, 403)

    def test_login_without_csrf_token_is_allowed_but_logout_needs_it(self):
        """Login selbst braucht kein CSRF-Token (DRF prüft CSRF nur für angemeldete Sessions)."""
        client = Client(enforce_csrf_checks=True)
        self.assertEqual(self._post({'username': 'personal', 'password': 'geheim-123'}, client).status_code, 200)
        self.assertEqual(client.post(reverse('auth-logout')).status_code, 403)

    def test_wrong_csrf_token_rejected(self):
        client = Client(enforce_csrf_checks=True)
        client.get(reverse('auth-csrf'))
        self._post({'username': 'personal', 'password': 'geheim-123'}, client)
        r = client.post(reverse('auth-logout'), HTTP_X_CSRFTOKEN='x' * 64)
        self.assertEqual(r.status_code, 403)

    def test_session_rotates_on_login(self):
        self.client.get(reverse('auth-csrf'))
        self._post({'username': 'personal', 'password': 'geheim-123'})
        first = self.client.session.session_key
        self.client.post(reverse('auth-logout'))
        self._post({'username': 'personal', 'password': 'geheim-123'})
        self.assertNotEqual(first, self.client.session.session_key)

    @unittest.expectedFailure
    def test_BEFUND_login_has_rate_limit(self):
        """BEFUND: Es gibt kein Rate-Limit/Lockout für /api/auth/login/ (Brute-Force möglich).
        Erwartet wäre spätestens nach 10 Fehlversuchen 429."""
        for _ in range(15):
            r = self._post({'username': 'personal', 'password': 'falsch'})
        self.assertEqual(r.status_code, 429)


class PermissionScopeTests(TestCase):
    """Rechte: jedes angemeldete Konto hat aktuell Vollzugriff (kein Rollenmodell in der API)."""

    def setUp(self):
        self.staff = get_user_model().objects.create_user(
            username='service', password='geheim-123', employee_number='EMP-S1', role='staff',
        )
        self.client.force_login(self.staff)

    def test_all_main_endpoints_reachable_when_logged_in(self):
        for name in ('reservation-list', 'guest-list', 'employee-list', 'pension-guest-list',
                     'registration-form-list', 'area-list', 'table-list', 'system-settings-list'):
            self.assertEqual(self.client.get(reverse(name)).status_code, 200, name)

    @unittest.expectedFailure
    def test_BEFUND_staff_role_cannot_create_employees(self):
        """BEFUND: Rolle 'staff' kann neue Mitarbeiter anlegen (keine Rollenprüfung in EmployeeViewSet)."""
        r = self.client.post(reverse('employee-list'), {
            'username': 'neu', 'employee_number': 'EMP-X9', 'role': 'admin',
        }, content_type='application/json')
        self.assertIn(r.status_code, (403, 405))

    @unittest.expectedFailure
    def test_BEFUND_smtp_password_not_readable_via_api(self):
        """BEFUND: SystemSettingsSerializer (fields='__all__') liefert smtp_password im Klartext an jedes Konto."""
        SystemSettings.objects.create(
            company_name='Test', company_street='S', company_postal_code='1', company_city='O',
            company_phone='1', company_email='t@example.com', smtp_password='geheim-smtp',
        )
        r = self.client.get(reverse('system-settings-list'))
        self.assertEqual(r.status_code, 200)
        self.assertNotIn('geheim-smtp', r.content.decode())
