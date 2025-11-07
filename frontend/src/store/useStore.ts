import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Area, Table, Reservation, Employee, SystemSettings } from '../types';

interface AppState {
  // UI State
  currentArea: Area | null;
  setCurrentArea: (area: Area | null) => void;

  // Current User/Employee
  currentEmployee: Employee | null;
  setCurrentEmployee: (employee: Employee | null) => void;

  // System Settings
  systemSettings: SystemSettings | null;
  setSystemSettings: (settings: SystemSettings | null) => void;

  // Cached Data
  areas: Area[];
  setAreas: (areas: Area[]) => void;

  tables: Table[];
  setTables: (tables: Table[]) => void;

  reservations: Reservation[];
  setReservations: (reservations: Reservation[]) => void;

  // Offline Queue
  offlineQueue: any[];
  addToOfflineQueue: (item: any) => void;
  clearOfflineQueue: () => void;

  // App State
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // UI State
      currentArea: null,
      setCurrentArea: (area) => set({ currentArea: area }),

      // Current User
      currentEmployee: null,
      setCurrentEmployee: (employee) => set({ currentEmployee: employee }),

      // System Settings
      systemSettings: null,
      setSystemSettings: (settings) => set({ systemSettings: settings }),

      // Cached Data
      areas: [],
      setAreas: (areas) => set({ areas }),

      tables: [],
      setTables: (tables) => set({ tables }),

      reservations: [],
      setReservations: (reservations) => set({ reservations }),

      // Offline Queue
      offlineQueue: [],
      addToOfflineQueue: (item) =>
        set((state) => ({ offlineQueue: [...state.offlineQueue, item] })),
      clearOfflineQueue: () => set({ offlineQueue: [] }),

      // App State
      isOnline: navigator.onLine,
      setIsOnline: (online) => set({ isOnline: online }),
    }),
    {
      name: 'bavaria-booking-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentArea: state.currentArea,
        currentEmployee: state.currentEmployee,
        systemSettings: state.systemSettings,
        areas: state.areas,
        tables: state.tables,
        offlineQueue: state.offlineQueue,
      }),
    }
  )
);
