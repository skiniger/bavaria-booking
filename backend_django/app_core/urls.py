from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AreaViewSet, TableViewSet, GuestViewSet, ReservationViewSet

# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r'areas', AreaViewSet, basename='area')
router.register(r'tables', TableViewSet, basename='table')
router.register(r'guests', GuestViewSet, basename='guest')
router.register(r'reservations', ReservationViewSet, basename='reservation')

# The API URLs are now determined automatically by the router.
urlpatterns = [
    path('', include(router.urls)),
]
