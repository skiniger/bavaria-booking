"""Rollenprüfung für sensible Endpunkte."""
from rest_framework.permissions import BasePermission, SAFE_METHODS


def is_admin_user(user):
    """Admin = Superuser oder Mitarbeiter mit Rolle 'admin'."""
    return bool(user and user.is_authenticated and (user.is_superuser or getattr(user, 'role', None) == 'admin'))


class ReadAuthenticatedWriteAdmin(BasePermission):
    """Lesen für angemeldete Konten (z. B. Kurtaxe-Satz im Meldeschein), Ändern nur für Admins."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return is_admin_user(request.user)
