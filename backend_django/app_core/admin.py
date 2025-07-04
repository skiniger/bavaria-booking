from django.contrib import admin
from .models import Area, Table, Guest, Reservation

@admin.register(Area)
class AreaAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'created_at', 'updated_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'description')

@admin.register(Table)
class TableAdmin(admin.ModelAdmin):
    list_display = ('table_number', 'area', 'capacity', 'status', 'is_reservable')
    list_filter = ('area', 'status', 'is_reservable', 'capacity')
    search_fields = ('table_number', 'area__name', 'notes')
    list_editable = ('status', 'is_reservable', 'capacity') # Erlaubt direkte Bearbeitung in der Liste
    autocomplete_fields = ['area'] # Für eine bessere Area-Auswahl

@admin.register(Guest)
class GuestAdmin(admin.ModelAdmin):
    list_display = ('last_name', 'first_name', 'phone_number', 'email', 'created_at')
    search_fields = ('last_name', 'first_name', 'phone_number', 'email', 'notes')

@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ('guest', 'table', 'reservation_time', 'number_of_guests', 'status', 'duration_minutes')
    list_filter = ('status', 'reservation_time', 'table__area')
    search_fields = ('guest__last_name', 'guest__first_name', 'guest__phone_number', 'table__table_number', 'notes')
    autocomplete_fields = ['guest', 'table'] # Für bessere Auswahl
    list_editable = ('status', 'table') # Erlaubt direkte Bearbeitung
    date_hierarchy = 'reservation_time' # Fügt eine Datumsnavigation hinzu

    fieldsets = (
        (None, {
            'fields': ('guest', 'table', 'number_of_guests')
        }),
        ('Zeitliche Details', {
            'fields': ('reservation_time', 'duration_minutes')
        }),
        ('Status und Notizen', {
            'fields': ('status', 'notes')
        }),
    )
    # Ggf. readonly_fields für 'created_at', 'updated_at' hinzufügen, wenn sie nicht in fieldsets sind

# Um einen Superuser zu erstellen (lokal): python manage.py createsuperuser
