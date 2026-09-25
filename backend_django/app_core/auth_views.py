"""
Anmeldung für die Mitarbeiter-Oberfläche (Session-Cookie + CSRF).
"""
from django.contrib.auth import authenticate, login, logout
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


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        if not isinstance(username, str) or not isinstance(password, str) or not username or not password:
            return Response({'detail': 'Benutzername und Passwort erforderlich.'}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, username=username, password=password)
        if user is None or not user.is_active or not getattr(user, 'is_active_employee', True):
            return Response({'detail': 'Anmeldung fehlgeschlagen.'}, status=status.HTTP_401_UNAUTHORIZED)

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
