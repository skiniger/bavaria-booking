from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    Area, Table, Guest, Reservation, TableCombination,
    Employee, TimeTracking, PensionGuest, RegistrationForm,
    SystemSettings, OpeningHours, SpecialOpeningHours,
    ChatConversation, ChatMessage, AnalyticsSnapshot, CapacityRecommendation
)

# ============================================================================
# CORE RESTAURANT MODELS
# ============================================================================

@admin.register(Area)
class AreaAdmin(admin.ModelAdmin):
    list_display = ('name', 'total_capacity', 'is_active', 'allows_combinations', 'created_at')
    list_filter = ('is_active', 'allows_combinations')
    search_fields = ('name', 'description')
    list_editable = ('is_active', 'allows_combinations')

@admin.register(Table)
class TableAdmin(admin.ModelAdmin):
    list_display = ('table_number', 'area', 'capacity', 'status', 'is_reservable', 'is_combinable')
    list_filter = ('area', 'status', 'is_reservable', 'is_combinable')
    search_fields = ('table_number', 'area__name', 'notes')
    list_editable = ('status', 'is_reservable')
    autocomplete_fields = ['area']

@admin.register(TableCombination)
class TableCombinationAdmin(admin.ModelAdmin):
    list_display = ('name', 'total_capacity', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name',)
    filter_horizontal = ('tables',)

@admin.register(Guest)
class GuestAdmin(admin.ModelAdmin):
    list_display = ('last_name', 'first_name', 'phone_number', 'email', 'gdpr_consent', 'created_at')
    list_filter = ('gdpr_consent',)
    search_fields = ('last_name', 'first_name', 'phone_number', 'email')

@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ('guest', 'table', 'reservation_time', 'number_of_guests', 'status', 'payment_method')
    list_filter = ('status', 'payment_method', 'table__area')
    search_fields = ('guest__last_name', 'guest__first_name', 'guest__phone_number', 'table__table_number')
    autocomplete_fields = ['guest', 'table']
    list_editable = ('status',)
    date_hierarchy = 'reservation_time'

# ============================================================================
# STAFF MANAGEMENT
# ============================================================================

@admin.register(Employee)
class EmployeeAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'employee_number', 'role', 'is_active_employee')
    list_filter = ('role', 'is_active', 'is_active_employee', 'can_simultaneous_login')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'employee_number')
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Employee Info', {'fields': ('employee_number', 'role', 'phone', 'is_active_employee', 'can_simultaneous_login')}),
        ('Check-in/out', {'fields': ('last_check_in', 'last_check_out')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Employee Info', {'fields': ('employee_number', 'role', 'phone')}),
    )

@admin.register(TimeTracking)
class TimeTrackingAdmin(admin.ModelAdmin):
    list_display = ('employee', 'check_in', 'check_out', 'total_hours', 'auto_logout', 'manual_correction')
    list_filter = ('auto_logout', 'manual_correction', 'check_in')
    search_fields = ('employee__username', 'employee__first_name', 'employee__last_name')
    date_hierarchy = 'check_in'
    readonly_fields = ('total_hours',)

# ============================================================================
# PENSION & RECEPTION
# ============================================================================

@admin.register(PensionGuest)
class PensionGuestAdmin(admin.ModelAdmin):
    list_display = ('last_name', 'first_name', 'birth_date', 'nationality', 'document_type', 'gdpr_consent')
    list_filter = ('salutation', 'nationality', 'document_type', 'gdpr_consent')
    search_fields = ('last_name', 'first_name', 'document_number', 'email', 'phone')

@admin.register(RegistrationForm)
class RegistrationFormAdmin(admin.ModelAdmin):
    list_display = ('guest', 'room_number', 'arrival_date', 'departure_date', 'status', 'payment_status', 'exported_to_city')
    list_filter = ('status', 'payment_status', 'exported_to_city', 'travel_purpose', 'arrival_date')
    search_fields = ('guest__last_name', 'guest__first_name', 'room_number')
    date_hierarchy = 'arrival_date'
    autocomplete_fields = ['guest']

# ============================================================================
# SETTINGS
# ============================================================================

@admin.register(SystemSettings)
class SystemSettingsAdmin(admin.ModelAdmin):
    list_display = ('company_name', 'company_email', 'language', 'timezone', 'tourist_tax_enabled')
    fieldsets = (
        ('Firmendaten', {'fields': ('company_name', 'company_street', 'company_postal_code', 'company_city', 'company_phone', 'company_email', 'company_website', 'tax_id', 'vat_id')}),
        ('Reservierungen', {'fields': ('default_reservation_duration', 'reservation_lead_time', 'max_guests_per_reservation')}),
        ('Kurtaxe', {'fields': ('tourist_tax_rate', 'tourist_tax_enabled')}),
        ('System', {'fields': ('auto_logout_hours', 'timezone', 'language')}),
        ('Backup', {'fields': ('backup_frequency_hours', 'last_backup')}),
        ('E-Mail', {'fields': ('smtp_host', 'smtp_port', 'smtp_username', 'smtp_password', 'smtp_use_tls', 'email_from_address')}),
        ('DSGVO', {'fields': ('gdpr_consent_text', 'gdpr_guest_retention_months', 'gdpr_reservation_retention_months', 'gdpr_timetracking_retention_years')}),
    )

@admin.register(OpeningHours)
class OpeningHoursAdmin(admin.ModelAdmin):
    list_display = ('area', 'weekday', 'is_closed', 'open_time', 'close_time')
    list_filter = ('area', 'weekday', 'is_closed')
    list_editable = ('is_closed', 'open_time', 'close_time')

@admin.register(SpecialOpeningHours)
class SpecialOpeningHoursAdmin(admin.ModelAdmin):
    list_display = ('area', 'date', 'description', 'is_closed', 'open_time', 'close_time')
    list_filter = ('area', 'is_closed', 'date')
    search_fields = ('description',)
    date_hierarchy = 'date'

# ============================================================================
# PHASE 3: KI & ANALYTICS
# ============================================================================

@admin.register(ChatConversation)
class ChatConversationAdmin(admin.ModelAdmin):
    list_display = ('employee', 'title', 'is_active', 'created_at', 'updated_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('title', 'employee__username')
    date_hierarchy = 'created_at'

@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('conversation', 'role', 'created_at', 'content_preview')
    list_filter = ('role', 'created_at')
    search_fields = ('content',)
    date_hierarchy = 'created_at'

    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Content Preview'

@admin.register(AnalyticsSnapshot)
class AnalyticsSnapshotAdmin(admin.ModelAdmin):
    list_display = ('snapshot_date', 'total_reservations', 'confirmed_reservations', 'average_occupancy_rate', 'total_guests_served', 'total_revenue')
    list_filter = ('snapshot_date',)
    date_hierarchy = 'snapshot_date'
    readonly_fields = ('created_at',)

@admin.register(CapacityRecommendation)
class CapacityRecommendationAdmin(admin.ModelAdmin):
    list_display = ('area', 'date', 'time_slot', 'predicted_occupancy', 'recommendation_type', 'is_applied')
    list_filter = ('area', 'recommendation_type', 'is_applied', 'date')
    search_fields = ('recommendation_text',)
    date_hierarchy = 'date'
    list_editable = ('is_applied',)
