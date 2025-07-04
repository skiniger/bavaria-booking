"""
URL configuration for project_config project.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('app_core.urls')), # Einbindung der app_core URLs unter /api/v1/
    # Hier könnten später weitere API-Versionen oder andere Apps eingebunden werden
]
