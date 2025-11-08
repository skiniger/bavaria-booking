"""
URL configuration for project_config project.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('app_core.urls')),  # Changed from api/v1/ to api/
]
