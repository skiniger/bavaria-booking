"""
Anmeldung für die Mitarbeiter-Oberfläche (Session-Cookie + CSRF).
"""
from django.contrib.auth import authenticate, login, logout
from django.core.cache import cache
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


def _user_payload(user):
    return {
        'id': str(user.pk),
        'username': user.username,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'is_staff': user.is_staff,
    }


@method_decorator(ensure_csrf_cookie, name='dispatch')
class CsrfCookieView(APIView):
    """Setzt das csrftoken-Cookie, damit das Frontend POSTs signieren kann."""
    permission_classes = [AllowAny]

    def get(self, request):
        get_token(request)
        return Response({'detail': 'CSRF-Cookie gesetzt.'})


LOGIN_MAX_FAILURES = 10
LOGIN_LOCKOUT_SECONDS = 15 * 60


def _login_fail_key(request, username):
    ip = request.META.get('REMOTE_ADDR', '')
    return f'login-fail:{ip}:{username.strip().lower()}'


class LoginView(APIView):
    """Login mit Sperre: nach 10 Fehlversuchen (IP + Benutzername) 15 Minuten HTTP 429."""
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        if not isinstance(username, str) or not isinstance(password, str) or not username or not password:
            return Response({'detail': 'Benutzername und Passwort erforderlich.'}, status=status.HTTP_400_BAD_REQUEST)

        key = _login_fail_key(request, username)
        failures = cache.get(key, 0)
        if failures >= LOGIN_MAX_FAILURES:
            return Response({'detail': 'Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.'},
                            status=status.HTTP_429_TOO_MANY_REQUESTS)

        user = authenticate(request, username=username, password=password)
        if user is None or not user.is_active or not getattr(user, 'is_active_employee', True):
            cache.set(key, failures + 1, LOGIN_LOCKOUT_SECONDS)
            return Response({'detail': 'Anmeldung fehlgeschlagen.'}, status=status.HTTP_401_UNAUTHORIZED)

        cache.delete(key)
        login(request, user)
        return Response(_user_payload(user))


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(_user_payload(request.user))
