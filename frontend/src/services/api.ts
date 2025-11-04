import axios from 'axios';
import type {
  Area, Table, TableCombination, Guest, Reservation,
  Employee, TimeTracking, PensionGuest, RegistrationForm,
  SystemSettings, DashboardStats, AreaCapacity
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Interceptor für Fehlerbehandlung
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// ===== AREAS =====
export const areasAPI = {
  getAll: () => api.get<Area[]>('/areas/'),
  getById: (id: string) => api.get<Area>(`/areas/${id}/`),
  create: (data: Partial<Area>) => api.post<Area>('/areas/', data),
  update: (id: string, data: Partial<Area>) => api.patch<Area>(`/areas/${id}/`, data),
  delete: (id: string) => api.delete(`/areas/${id}/`),
};

// ===== TABLES =====
export const tablesAPI = {
  getAll: (areaId?: string) => api.get<Table[]>('/tables/', { params: { area_id: areaId } }),
  getById: (id: string) => api.get<Table>(`/tables/${id}/`),
  create: (data: Partial<Table>) => api.post<Table>('/tables/', data),
  update: (id: string, data: Partial<Table>) => api.patch<Table>(`/tables/${id}/`, data),
  delete: (id: string) => api.delete(`/tables/${id}/`),
};

// ===== TABLE COMBINATIONS =====
export const tableCombinationsAPI = {
  getAll: () => api.get<TableCombination[]>('/table-combinations/'),
  getById: (id: string) => api.get<TableCombination>(`/table-combinations/${id}/`),
  create: (data: Partial<TableCombination>) => api.post<TableCombination>('/table-combinations/', data),
  update: (id: string, data: Partial<TableCombination>) => api.patch<TableCombination>(`/table-combinations/${id}/`, data),
  delete: (id: string) => api.delete(`/table-combinations/${id}/`),
};

// ===== GUESTS =====
export const guestsAPI = {
  getAll: () => api.get<Guest[]>('/guests/'),
  getById: (id: string) => api.get<Guest>(`/guests/${id}/`),
  search: (params: { phone?: string; name?: string }) => api.get<Guest[]>('/guests/search/', { params }),
  create: (data: Partial<Guest>) => api.post<Guest>('/guests/', data),
  update: (id: string, data: Partial<Guest>) => api.patch<Guest>(`/guests/${id}/`, data),
  delete: (id: string) => api.delete(`/guests/${id}/`),
};

// ===== RESERVATIONS =====
export const reservationsAPI = {
  getAll: (params?: { date?: string; guest_id?: string; table_id?: string; status?: string }) =>
    api.get<Reservation[]>('/reservations/', { params }),
  getById: (id: string) => api.get<Reservation>(`/reservations/${id}/`),
  create: (data: Partial<Reservation>) => api.post<Reservation>('/reservations/', data),
  update: (id: string, data: Partial<Reservation>) => api.patch<Reservation>(`/reservations/${id}/`, data),
  delete: (id: string) => api.delete(`/reservations/${id}/`),
  confirm: (id: string) => api.post(`/reservations/${id}/confirm/`),
  cancel: (id: string) => api.post(`/reservations/${id}/cancel/`),
  checkAvailability: (params: {
    table_id?: string;
    date: string;
    time: string;
    duration: number;
    guests: number;
  }) => api.get('/reservations/check-availability/', { params }),
};

// ===== EMPLOYEES =====
export const employeesAPI = {
  getAll: () => api.get<Employee[]>('/employees/'),
  getById: (id: string) => api.get<Employee>(`/employees/${id}/`),
  create: (data: Partial<Employee>) => api.post<Employee>('/employees/', data),
  update: (id: string, data: Partial<Employee>) => api.patch<Employee>(`/employees/${id}/`, data),
  delete: (id: string) => api.delete(`/employees/${id}/`),
  checkIn: (id: string) => api.post<TimeTracking>(`/employees/${id}/check-in/`),
  checkOut: (id: string) => api.post<TimeTracking>(`/employees/${id}/check-out/`),
};

// ===== TIME TRACKING =====
export const timeTrackingAPI = {
  getAll: (params?: { employee_id?: string; date_from?: string; date_to?: string }) =>
    api.get<TimeTracking[]>('/time-tracking/', { params }),
  getById: (id: string) => api.get<TimeTracking>(`/time-tracking/${id}/`),
  create: (data: Partial<TimeTracking>) => api.post<TimeTracking>('/time-tracking/', data),
  update: (id: string, data: Partial<TimeTracking>) => api.patch<TimeTracking>(`/time-tracking/${id}/`, data),
  delete: (id: string) => api.delete(`/time-tracking/${id}/`),
};

// ===== PENSION GUESTS =====
export const pensionGuestsAPI = {
  getAll: () => api.get<PensionGuest[]>('/pension-guests/'),
  getById: (id: string) => api.get<PensionGuest>(`/pension-guests/${id}/`),
  search: (params: { name?: string; document_number?: string }) =>
    api.get<PensionGuest[]>('/pension-guests/search/', { params }),
  create: (data: Partial<PensionGuest>) => api.post<PensionGuest>('/pension-guests/', data),
  update: (id: string, data: Partial<PensionGuest>) => api.patch<PensionGuest>(`/pension-guests/${id}/`, data),
  delete: (id: string) => api.delete(`/pension-guests/${id}/`),
};

// ===== REGISTRATION FORMS =====
export const registrationFormsAPI = {
  getAll: (params?: { status?: string; date_from?: string; date_to?: string }) =>
    api.get<RegistrationForm[]>('/registration-forms/', { params }),
  getById: (id: string) => api.get<RegistrationForm>(`/registration-forms/${id}/`),
  create: (data: Partial<RegistrationForm>) => api.post<RegistrationForm>('/registration-forms/', data),
  update: (id: string, data: Partial<RegistrationForm>) => api.patch<RegistrationForm>(`/registration-forms/${id}/`, data),
  delete: (id: string) => api.delete(`/registration-forms/${id}/`),
  checkIn: (id: string) => api.post<RegistrationForm>(`/registration-forms/${id}/check-in/`),
  checkOut: (id: string) => api.post<RegistrationForm>(`/registration-forms/${id}/check-out/`),
  exportToCity: (id: string) => api.post(`/registration-forms/${id}/export/`),
};

// ===== SYSTEM SETTINGS =====
export const systemSettingsAPI = {
  getAll: () => api.get<SystemSettings[]>('/system-settings/'),
  getById: (id: string) => api.get<SystemSettings>(`/system-settings/${id}/`),
  update: (id: string, data: Partial<SystemSettings>) => api.patch<SystemSettings>(`/system-settings/${id}/`, data),
};

// ===== DASHBOARD =====
export const dashboardAPI = {
  getStats: () => api.get<DashboardStats>('/dashboard/stats/'),
  getCapacityByArea: () => api.get<AreaCapacity[]>('/dashboard/capacity-by-area/'),
};

export default api;
