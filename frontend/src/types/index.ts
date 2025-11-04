// BAVARIABOOKINGX - TypeScript Type Definitions

export interface Area {
  id: string;
  name: string;
  description?: string;
  total_capacity: number;
  color_code: string;
  is_active: boolean;
  allows_combinations: boolean;
  created_at: string;
  updated_at: string;
  tables_count?: number;
  current_capacity?: number;
}

export interface Table {
  id: string;
  area: string;
  area_name?: string;
  area_color?: string;
  table_number: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'out_of_service';
  is_reservable: boolean;
  is_combinable: boolean;
  position_x: number;
  position_y: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TableCombination {
  id: string;
  name: string;
  tables: string[];
  tables_detail?: Table[];
  total_capacity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  email?: string;
  allergies?: string;
  special_requests?: string;
  notes?: string;
  gdpr_consent: boolean;
  gdpr_consent_date?: string;
  created_at: string;
  updated_at: string;
  total_reservations?: number;
}

export interface Reservation {
  id: string;
  guest: string;
  guest_detail?: Guest;
  guest_name?: string;
  table?: string;
  table_detail?: Table;
  table_number?: string;
  area_name?: string;
  reservation_time: string;
  duration_minutes: number;
  number_of_guests: number;
  status: 'pending_confirmation' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled_by_guest' | 'cancelled_by_restaurant' | 'completed' | 'no_show';
  payment_method?: 'cash' | 'ec' | 'credit_card' | 'invoice';
  check_in_time?: string;
  check_out_time?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  employee_number: string;
  role: 'admin' | 'manager' | 'staff';
  phone?: string;
  is_active_employee: boolean;
  can_simultaneous_login: boolean;
  last_check_in?: string;
  last_check_out?: string;
  total_hours_this_month?: number;
  is_checked_in?: boolean;
  date_joined: string;
}

export interface TimeTracking {
  id: string;
  employee: string;
  employee_name?: string;
  employee_detail?: Employee;
  check_in: string;
  check_out?: string;
  auto_logout: boolean;
  manual_correction: boolean;
  correction_note?: string;
  total_hours?: number;
  created_at: string;
  updated_at: string;
}

export interface PensionGuest {
  id: string;
  salutation: 'herr' | 'frau' | 'divers';
  first_name: string;
  last_name: string;
  birth_date: string;
  nationality: string;
  street: string;
  house_number: string;
  postal_code: string;
  city: string;
  country: string;
  document_type: 'id_card' | 'passport' | 'driving_license';
  document_number: string;
  email?: string;
  phone?: string;
  gdpr_consent: boolean;
  gdpr_consent_date?: string;
  created_at: string;
  updated_at: string;
  full_name?: string;
  full_address?: string;
}

export interface RegistrationForm {
  id: string;
  guest: string;
  guest_detail?: PensionGuest;
  guest_name?: string;
  arrival_date: string;
  departure_date: string;
  room_number: string;
  travel_purpose: 'private' | 'business';
  company_name?: string;
  company_address?: string;
  tourist_tax_required: boolean;
  tourist_tax_exemption_reason?: string;
  tourist_tax_amount: number;
  breakfast_included: boolean;
  breakfast_price: number;
  room_price_per_night: number;
  total_amount: number;
  payment_method: 'cash' | 'ec' | 'credit_card' | 'invoice';
  payment_status: 'pending' | 'paid' | 'partially_paid';
  status: 'draft' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
  exported_to_city: boolean;
  export_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  nights?: number;
}

export interface SystemSettings {
  id: string;
  // Firmendaten
  company_name: string;
  company_street: string;
  company_postal_code: string;
  company_city: string;
  company_phone: string;
  company_email: string;
  company_website?: string;
  company_logo_url?: string;
  tax_id?: string;
  vat_id?: string;

  // Reservierungs-Einstellungen
  default_reservation_duration: number;
  reservation_lead_time: number;
  max_guests_per_reservation: number;

  // Kurtaxe-Einstellungen
  tourist_tax_rate: number;
  tourist_tax_enabled: boolean;

  // System-Einstellungen
  auto_logout_hours: number;
  timezone: string;
  language: string;

  // Backup-Einstellungen
  backup_frequency_hours: number;
  last_backup?: string;

  // E-Mail-Einstellungen
  smtp_host?: string;
  smtp_port: number;
  smtp_username?: string;
  smtp_password?: string;
  smtp_use_tls: boolean;
  email_from_address?: string;

  // DSGVO-Einstellungen
  gdpr_consent_text: string;
  gdpr_guest_retention_months: number;
  gdpr_reservation_retention_months: number;
  gdpr_timetracking_retention_years: number;

  // Deprecated
  opening_hours?: Record<string, any>;

  created_at: string;
  updated_at: string;
}

export interface OpeningHours {
  id: string;
  area: string;
  area_name?: string;
  weekday: number; // 0=Montag, 6=Sonntag
  weekday_display?: string;
  is_closed: boolean;
  open_time?: string;
  close_time?: string;
  created_at: string;
  updated_at: string;
}

export interface SpecialOpeningHours {
  id: string;
  area: string;
  area_name?: string;
  date: string;
  description: string;
  is_closed: boolean;
  open_time?: string;
  close_time?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_tables: number;
  available_tables: number;
  occupied_tables: number;
  reserved_tables: number;
  today_reservations: number;
  today_checkins: number;
  active_employees: number;
  current_occupancy_rate: number;
}

export interface AreaCapacity {
  area_id: string;
  area_name: string;
  color_code: string;
  total_capacity: number;
  total_tables: number;
  available_tables: number;
  occupied_tables: number;
  reserved_tables: number;
  occupancy_rate: number;
}

// ============================================================================
// PHASE 3: KI & ANALYTICS TYPES
// ============================================================================

export interface ChatMessage {
  id: string;
  conversation: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  employee: string;
  employee_name?: string;
  title?: string;
  is_active: boolean;
  messages?: ChatMessage[];
  message_count?: number;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsSnapshot {
  id: string;
  snapshot_date: string;

  // Reservierungs-Statistiken
  total_reservations: number;
  confirmed_reservations: number;
  cancelled_reservations: number;
  no_show_count: number;

  // Auslastungs-Statistiken
  average_occupancy_rate: number;
  peak_occupancy_time?: string;

  // Gäste-Statistiken
  total_guests_served: number;
  average_party_size: number;

  // Umsatz
  total_revenue: number;

  // KI-Insights
  ai_insights: string[];

  created_at: string;
}

export interface CapacityRecommendation {
  id: string;
  date: string;
  time_slot: string;
  area: string;
  area_name?: string;

  // Vorhersage
  predicted_occupancy: number;
  confidence_score: number;

  // Empfehlung
  recommendation_type: 'increase_staff' | 'reduce_staff' | 'optimize_tables' | 'accept_more_reservations' | 'limit_reservations' | 'normal_operations';
  recommendation_type_display?: string;
  recommendation_text: string;

  // Basis
  based_on_data: Record<string, any>;

  is_applied: boolean;
  applied_at?: string;
  created_at: string;
}

export interface OccupancyTrend {
  date: string;
  occupancy_rate: number;
  total_reservations: number;
  total_guests: number;
}

export interface RevenueAnalytics {
  period: string;
  total_revenue: number;
  average_per_guest: number;
  reservation_count: number;
}

export interface PredictiveInsight {
  insight_type: string;
  date: string;
  area_name?: string;
  predicted_value: number;
  confidence: number;
  recommendation: string;
}
