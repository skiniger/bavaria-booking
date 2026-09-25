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
