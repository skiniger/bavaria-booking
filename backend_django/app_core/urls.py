from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AreaViewSet, TableViewSet, GuestViewSet, ReservationViewSet,
    TableCombinationViewSet, EmployeeViewSet, TimeTrackingViewSet,
    PensionGuestViewSet, RegistrationFormViewSet, SystemSettingsViewSet,
    DashboardViewSet
)

# Create a router and register our viewsets with it.
router = DefaultRouter()

# Restaurant & Reservierungen
router.register(r'areas', AreaViewSet, basename='area')
router.register(r'tables', TableViewSet, basename='table')
router.register(r'table-combinations', TableCombinationViewSet, basename='table-combination')
router.register(r'guests', GuestViewSet, basename='guest')
router.register(r'reservations', ReservationViewSet, basename='reservation')

# Personalverwaltung
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'time-tracking', TimeTrackingViewSet, basename='time-tracking')

# Pension & Rezeption
router.register(r'pension-guests', PensionGuestViewSet, basename='pension-guest')
router.register(r'registration-forms', RegistrationFormViewSet, basename='registration-form')

# System & Einstellungen
router.register(r'system-settings', SystemSettingsViewSet, basename='system-settings')
router.register(r'dashboard', DashboardViewSet, basename='dashboard')

# The API URLs are now determined automatically by the router.
urlpatterns = [
    path('', include(router.urls)),
]
