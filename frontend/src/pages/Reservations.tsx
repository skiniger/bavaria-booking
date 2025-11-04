import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { areasAPI, reservationsAPI } from '../services/api';
import type { Area, Table, Reservation } from '../types';
import { Plus, Calendar as CalendarIcon, Grid3x3, Layers } from 'lucide-react';

// Import Components
import TableGrid from '../components/reservations/TableGrid';
import ReservationCalendar from '../components/reservations/ReservationCalendar';
import ReservationForm from '../components/reservations/ReservationForm';
import ReservationDetails from '../components/reservations/ReservationDetails';
import TableCombinationTool from '../components/reservations/TableCombinationTool';

type ViewMode = 'grid' | 'calendar';

export default function Reservations() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  // Modal States
  const [isReservationFormOpen, setIsReservationFormOpen] = useState(false);
  const [isReservationDetailsOpen, setIsReservationDetailsOpen] = useState(false);
  const [isCombinationToolOpen, setIsCombinationToolOpen] = useState(false);

  // Fetch Areas
  const { data: areas = [] } = useQuery({
    queryKey: ['areas'],
    queryFn: () => areasAPI.getAll().then((res) => res.data),
  });

  // Fetch Today's Reservations
  const { data: todayReservations = [] } = useQuery({
    queryKey: ['reservations-today'],
    queryFn: () =>
      reservationsAPI
        .getAll({ date: new Date().toISOString().split('T')[0] })
        .then((res) => res.data),
  });

  // Auto-select first area on load
  if (areas.length > 0 && !selectedArea) {
    setSelectedArea(areas[0]);
  }

  const handleTableClick = (table: Table) => {
    setSelectedTable(table);
    setIsReservationFormOpen(true);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    // Optionally open reservation form or show reservations for that date
  };

  const handleReservationClick = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setIsReservationDetailsOpen(true);
  };

  const handleNewReservation = () => {
    setSelectedTable(null);
    setIsReservationFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reservierungen</h1>
          <p className="text-gray-600 mt-1">
            Digitales Reservierungsbuch mit Live-Check-in/out
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleNewReservation}
            className="btn-primary flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Neue Reservierung
          </button>
          <button
            onClick={() => setIsCombinationToolOpen(true)}
            className="btn-secondary flex items-center"
          >
            <Layers className="w-5 h-5 mr-2" />
            Tischkombinationen
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-bavaria-blue text-white">
          <div className="text-sm opacity-90">Heute</div>
          <div className="text-3xl font-bold">{todayReservations.length}</div>
          <div className="text-sm opacity-90">Reservierungen</div>
        </div>
        <div className="card bg-bavaria-green text-white">
          <div className="text-sm opacity-90">Bestätigt</div>
          <div className="text-3xl font-bold">
            {todayReservations.filter((r) => r.status === 'confirmed').length}
          </div>
          <div className="text-sm opacity-90">Reservierungen</div>
        </div>
        <div className="card bg-bavaria-yellow text-white">
          <div className="text-sm opacity-90">Ausstehend</div>
          <div className="text-3xl font-bold">
            {todayReservations.filter((r) => r.status === 'pending_confirmation').length}
          </div>
          <div className="text-sm opacity-90">Bestätigungen</div>
        </div>
        <div className="card bg-bavaria-red text-white">
          <div className="text-sm opacity-90">Eingecheckt</div>
          <div className="text-3xl font-bold">
            {todayReservations.filter((r) => r.status === 'checked_in').length}
          </div>
          <div className="text-sm opacity-90">Tische aktiv</div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setViewMode('grid')}
          className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
            viewMode === 'grid'
              ? 'bg-bavaria-blue text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <Grid3x3 className="w-5 h-5 mr-2" />
          Tisch-Übersicht
        </button>
        <button
          onClick={() => setViewMode('calendar')}
          className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
            viewMode === 'calendar'
              ? 'bg-bavaria-blue text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <CalendarIcon className="w-5 h-5 mr-2" />
          Kalenderansicht
        </button>
      </div>

      {/* Area Tabs */}
      {viewMode === 'grid' && (
        <div className="card">
          <div className="flex items-center space-x-2 overflow-x-auto pb-2">
            {areas.map((area) => (
              <button
                key={area.id}
                onClick={() => setSelectedArea(area)}
                className={`px-6 py-3 rounded-lg font-medium whitespace-nowrap transition-all ${
                  selectedArea?.id === area.id
                    ? 'text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={
                  selectedArea?.id === area.id
                    ? { backgroundColor: area.color_code }
                    : {}
                }
              >
                {area.name}
                <span className="ml-2 text-sm opacity-75">
                  ({area.total_capacity} Plätze)
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      {viewMode === 'grid' && (
        <TableGrid
          selectedArea={selectedArea}
          onTableClick={handleTableClick}
          selectedDate={selectedDate}
        />
      )}

      {viewMode === 'calendar' && (
        <ReservationCalendar
          onDateSelect={handleDateSelect}
          onReservationClick={handleReservationClick}
        />
      )}

      {/* Modals */}
      <ReservationForm
        isOpen={isReservationFormOpen}
        onClose={() => {
          setIsReservationFormOpen(false);
          setSelectedTable(null);
        }}
        selectedTable={selectedTable || undefined}
        selectedDate={selectedDate}
      />

      <ReservationDetails
        reservation={selectedReservation}
        isOpen={isReservationDetailsOpen}
        onClose={() => {
          setIsReservationDetailsOpen(false);
          setSelectedReservation(null);
        }}
      />

      <TableCombinationTool
        isOpen={isCombinationToolOpen}
        onClose={() => setIsCombinationToolOpen(false)}
        areaId={selectedArea?.id}
      />

      {/* Info Box */}
      <div className="card bg-gradient-to-r from-bavaria-blue to-blue-600 text-white">
        <h3 className="text-xl font-bold mb-3">✨ Vollständiges Reservierungssystem</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium mb-2">📋 Features:</div>
            <ul className="space-y-1 opacity-90">
              <li>✓ Live Check-in / Check-out pro Tisch</li>
              <li>✓ Klickbare Tische mit Echtzeit-Status</li>
              <li>✓ Kalenderübersicht (50-Jahres-Zeitraum)</li>
              <li>✓ DSGVO-konforme Gästedaten</li>
            </ul>
          </div>
          <div>
            <div className="font-medium mb-2">🎯 Funktionen:</div>
            <ul className="space-y-1 opacity-90">
              <li>✓ Tischkombinationen für Großgruppen</li>
              <li>✓ Zahlungsarten-Verwaltung</li>
              <li>✓ Allergien & besondere Wünsche</li>
              <li>✓ Farbcodierte Tischstatus</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
