from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AreaViewSet, TableViewSet, GuestViewSet, ReservationViewSet,
    TableCombinationViewSet, EmployeeViewSet, TimeTrackingViewSet,
    PensionGuestViewSet, RegistrationFormViewSet, SystemSettingsViewSet,
    OpeningHoursViewSet, SpecialOpeningHoursViewSet,
    DashboardViewSet,
    ChatConversationViewSet, ChatMessageViewSet,
    AnalyticsSnapshotViewSet, CapacityRecommendationViewSet, AnalyticsAPIViewSet
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
router.register(r'opening-hours', OpeningHoursViewSet, basename='opening-hours')
router.register(r'special-opening-hours', SpecialOpeningHoursViewSet, basename='special-opening-hours')
router.register(r'dashboard', DashboardViewSet, basename='dashboard')

# Phase 3: KI & Analytics
router.register(r'chat-conversations', ChatConversationViewSet, basename='chat-conversation')
router.register(r'chat-messages', ChatMessageViewSet, basename='chat-message')
router.register(r'analytics-snapshots', AnalyticsSnapshotViewSet, basename='analytics-snapshot')
router.register(r'capacity-recommendations', CapacityRecommendationViewSet, basename='capacity-recommendation')
router.register(r'analytics', AnalyticsAPIViewSet, basename='analytics')

# The API URLs are now determined automatically by the router.
urlpatterns = [
    path('', include(router.urls)),
]
