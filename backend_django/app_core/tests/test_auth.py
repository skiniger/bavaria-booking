"""Tests für Anmeldung (Session + CSRF) und die geschlossene API."""
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import Client, TestCase
from django.urls import reverse


class AuthTests(TestCase):
    def setUp(self):
        cache.clear()
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
        cache.clear()
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

    def test_BEFUND_login_has_rate_limit(self):
        """BEHOBEN (fix/bbx-testbefunde), vorher BEFUND: Es gibt kein Rate-Limit/Lockout für /api/auth/login/ (Brute-Force möglich).
        Erwartet wäre spätestens nach 10 Fehlversuchen 429."""
        for _ in range(15):
            r = self._post({'username': 'personal', 'password': 'falsch'})
        self.assertEqual(r.status_code, 429)

    def test_login_lockout_blocks_correct_password_and_success_resets(self):
        for _ in range(3):
            self._post({'username': 'personal', 'password': 'falsch'})
        self.assertEqual(self._post({'username': 'personal', 'password': 'geheim-123'}).status_code, 200)
        cache.clear()
        for _ in range(10):
            self._post({'username': 'personal', 'password': 'falsch'})
        self.assertEqual(self._post({'username': 'personal', 'password': 'geheim-123'}).status_code, 429)


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

    def test_BEFUND_staff_role_cannot_create_employees(self):
        """BEHOBEN (fix/bbx-testbefunde), vorher BEFUND: Rolle 'staff' kann neue Mitarbeiter anlegen (keine Rollenprüfung in EmployeeViewSet)."""
        r = self.client.post(reverse('employee-list'), {
            'username': 'neu', 'employee_number': 'EMP-X9', 'role': 'admin',
        }, content_type='application/json')
        self.assertIn(r.status_code, (403, 405))

    def test_staff_can_still_read_and_check_in(self):
        self.assertEqual(self.client.get(reverse('employee-list')).status_code, 200)
        r = self.client.post(reverse('employee-check-in', args=[self.staff.pk]))
        self.assertEqual(r.status_code, 200, r.content)

    def test_admin_can_create_employee(self):
        admin = get_user_model().objects.create_user(
            username='chef2', password='geheim-123', employee_number='EMP-A8', role='admin')
        self.client.force_login(admin)
        r = self.client.post(reverse('employee-list'), {
            'username': 'neu2', 'employee_number': 'EMP-X8', 'role': 'staff',
        }, content_type='application/json')
        self.assertEqual(r.status_code, 201, r.content)

    def test_BEFUND_smtp_password_not_readable_via_api(self):
        """BEHOBEN (fix/bbx-testbefunde), vorher BEFUND: SystemSettingsSerializer (fields='__all__') liefert smtp_password im Klartext an jedes Konto."""
        SystemSettings.objects.create(
            company_name='Test', company_street='S', company_postal_code='1', company_city='O',
            company_phone='1', company_email='t@example.com', smtp_password='geheim-smtp',
        )
        r = self.client.get(reverse('system-settings-list'))
        self.assertEqual(r.status_code, 200)
        self.assertNotIn('geheim-smtp', r.content.decode())


class SmtpSettingsAccessTests(TestCase):
    """Fix 5: SMTP-Daten nur für Admins, Passwort nie im Klartext, nur setzbar."""

    def setUp(self):
        User = get_user_model()
        self.staff = User.objects.create_user(username='service2', password='geheim-123', employee_number='EMP-S2', role='staff')
        self.admin = User.objects.create_user(username='chef', password='geheim-123', employee_number='EMP-A9', role='admin')
        self.settings = SystemSettings.objects.create(
            company_name='Test', company_street='S', company_postal_code='1', company_city='O',
            company_phone='1', company_email='t@example.com', smtp_host='smtp.example.com',
            smtp_username='mailer', smtp_password='alt-geheim',
        )
        self.detail = reverse('system-settings-detail', args=[self.settings.id])

    def test_staff_reads_without_smtp_fields(self):
        self.client.force_login(self.staff)
        r = self.client.get(self.detail)
        self.assertEqual(r.status_code, 200)
        for key in ('smtp_password', 'smtp_password_set', 'smtp_host', 'smtp_username'):
            self.assertNotIn(key, r.data)
        self.assertIn('tourist_tax_rate', r.data)  # Meldeschein braucht den Satz weiterhin
        self.assertNotIn('alt-geheim', r.content.decode())

    def test_staff_cannot_change_settings(self):
        self.client.force_login(self.staff)
        r = self.client.patch(self.detail, {'smtp_password': 'neu'}, content_type='application/json')
        self.assertEqual(r.status_code, 403)
        self.settings.refresh_from_db()
        self.assertEqual(self.settings.smtp_password, 'alt-geheim')

    def test_admin_sees_smtp_but_password_masked(self):
        self.client.force_login(self.admin)
        r = self.client.get(self.detail)
        self.assertEqual(r.data['smtp_host'], 'smtp.example.com')
        self.assertTrue(r.data['smtp_password_set'])
        self.assertNotIn('smtp_password', r.data)
        self.assertNotIn('alt-geheim', r.content.decode())

    def test_admin_can_set_password_write_only(self):
        self.client.force_login(self.admin)
        r = self.client.patch(self.detail, {'smtp_password': 'neu-geheim'}, content_type='application/json')
        self.assertEqual(r.status_code, 200)
        self.assertNotIn('neu-geheim', r.content.decode())
        self.settings.refresh_from_db()
        self.assertEqual(self.settings.smtp_password, 'neu-geheim')

    def test_blank_password_does_not_overwrite(self):
        self.client.force_login(self.admin)
        r = self.client.patch(self.detail, {'smtp_password': '', 'company_name': 'Neu'}, content_type='application/json')
        self.assertEqual(r.status_code, 200)
        self.settings.refresh_from_db()
        self.assertEqual(self.settings.smtp_password, 'alt-geheim')
        self.assertEqual(self.settings.company_name, 'Neu')

    def test_superuser_counts_as_admin(self):
        su = get_user_model().objects.create_superuser(username='root', password='x', employee_number='EMP-R9')
        self.client.force_login(su)
        self.assertEqual(self.client.patch(self.detail, {'company_name': 'X'}, content_type='application/json').status_code, 200)
