import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pensionGuestsAPI, registrationFormsAPI } from '../services/api';
import type { PensionGuest, RegistrationForm } from '../types';
import { Plus, Users } from 'lucide-react';

// Import Components
import PensionGuestForm from '../components/pension/PensionGuestForm';
import RegistrationFormComponent from '../components/pension/RegistrationFormComponent';
import RegistrationFormList from '../components/pension/RegistrationFormList';
import RegistrationFormDetails from '../components/pension/RegistrationFormDetails';

export default function Pension() {
  const queryClient = useQueryClient();
  const [selectedGuest, setSelectedGuest] = useState<PensionGuest | null>(null);
  const [selectedForm, setSelectedForm] = useState<RegistrationForm | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal States
  const [isGuestFormOpen, setIsGuestFormOpen] = useState(false);
  const [isRegistrationFormOpen, setIsRegistrationFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [showGuestSearch, setShowGuestSearch] = useState(false);

  // Fetch Statistics
  const { data: todayForms = [] } = useQuery({
    queryKey: ['registration-forms-today'],
    queryFn: () =>
      registrationFormsAPI
        .getAll({ date_from: new Date().toISOString().split('T')[0] })
        .then((res) => res.data),
  });

  const { data: guests = [] } = useQuery({
    queryKey: ['pension-guests'],
    queryFn: () => pensionGuestsAPI.getAll().then((res) => res.data),
  });

  // Search Guests
  const { data: searchResults = [] } = useQuery({
    queryKey: ['pension-guest-search', searchTerm],
    queryFn: () =>
      pensionGuestsAPI.search({ name: searchTerm }).then((res) => res.data),
    enabled: searchTerm.length >= 2,
  });

  // Check-in/Check-out Mutations
  const checkInMutation = useMutation({
    mutationFn: (id: string) => registrationFormsAPI.checkIn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registration-forms'] });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: (id: string) => registrationFormsAPI.checkOut(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registration-forms'] });
    },
  });

  const handleNewMeldeschein = () => {
    setShowGuestSearch(true);
  };

  const handleGuestSelected = (guest: PensionGuest) => {
    setSelectedGuest(guest);
    setShowGuestSearch(false);
    setIsRegistrationFormOpen(true);
  };

  const handleNewGuest = () => {
    setShowGuestSearch(false);
    setIsGuestFormOpen(true);
  };

  const handleGuestCreated = (guest: PensionGuest) => {
    setSelectedGuest(guest);
    setIsRegistrationFormOpen(true);
  };

  const currentlyCheckedIn = todayForms.filter((f) => f.status === 'checked_in').length;
  const pendingCheckouts = todayForms.filter((f) => f.status === 'checked_in').length;
  const totalGuests = guests.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pension & Rezeption</h1>
          <p className="text-gray-600 mt-1">
            BMG-konforme Meldeschein-Verwaltung
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleNewMeldeschein}
            className="btn-primary flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Neuer Meldeschein
          </button>
          <button
            onClick={() => setIsGuestFormOpen(true)}
            className="btn-secondary flex items-center"
          >
            <Users className="w-5 h-5 mr-2" />
            Neuer Gast
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-bavaria-green text-white">
          <div className="text-sm opacity-90">Aktuell eingecheckt</div>
          <div className="text-3xl font-bold">{currentlyCheckedIn}</div>
          <div className="text-sm opacity-90">Gäste</div>
        </div>

        <div className="card bg-bavaria-blue text-white">
          <div className="text-sm opacity-90">Heute</div>
          <div className="text-3xl font-bold">{todayForms.length}</div>
          <div className="text-sm opacity-90">Meldescheine</div>
        </div>

        <div className="card bg-bavaria-yellow text-white">
          <div className="text-sm opacity-90">Ausstehende Check-outs</div>
          <div className="text-3xl font-bold">{pendingCheckouts}</div>
          <div className="text-sm opacity-90">Gäste</div>
        </div>

        <div className="card bg-bavaria-red text-white">
          <div className="text-sm opacity-90">Gesamt</div>
          <div className="text-3xl font-bold">{totalGuests}</div>
          <div className="text-sm opacity-90">Gäste registriert</div>
        </div>
      </div>

      {/* Guest Search Modal */}
      {showGuestSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Gast auswählen</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Gast suchen
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input"
                  placeholder="Name oder Dokumentnummer eingeben..."
                  autoFocus
                />
              </div>

              {searchTerm.length >= 2 && (
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {searchResults.length === 0 && (
                    <p className="text-gray-500 text-center py-8">Keine Gäste gefunden</p>
                  )}
                  {searchResults.map((guest) => (
                    <button
                      key={guest.id}
                      onClick={() => handleGuestSelected(guest)}
                      className="w-full text-left p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-medium">
                        {guest.first_name} {guest.last_name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {guest.street} {guest.house_number}, {guest.postal_code} {guest.city}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {guest.document_type === 'id_card' && 'Personalausweis'}
                        {guest.document_type === 'passport' && 'Reisepass'}
                        {guest.document_type === 'driving_license' && 'Führerschein'}
                        : {guest.document_number}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex justify-between mt-6 pt-4 border-t">
                <button
                  onClick={handleNewGuest}
                  className="btn-secondary"
                >
                  Neuen Gast anlegen
                </button>
                <button
                  onClick={() => {
                    setShowGuestSearch(false);
                    setSearchTerm('');
                  }}
                  className="btn-secondary"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Registration Forms List */}
      <RegistrationFormList
        onViewDetails={(form) => {
          setSelectedForm(form);
          setIsDetailsOpen(true);
        }}
        onCheckIn={(form) => checkInMutation.mutate(form.id)}
        onCheckOut={(form) => checkOutMutation.mutate(form.id)}
      />

      {/* Modals */}
      <PensionGuestForm
        isOpen={isGuestFormOpen}
        onClose={() => {
          setIsGuestFormOpen(false);
          setSelectedGuest(null);
        }}
        onGuestCreated={handleGuestCreated}
      />

      <RegistrationFormComponent
        isOpen={isRegistrationFormOpen}
        onClose={() => {
          setIsRegistrationFormOpen(false);
          setSelectedGuest(null);
        }}
        selectedGuest={selectedGuest || undefined}
      />

      <RegistrationFormDetails
        form={selectedForm}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedForm(null);
        }}
      />

      {/* Info Box */}
      <div className="card bg-gradient-to-r from-bavaria-green to-green-600 text-white">
        <h3 className="text-xl font-bold mb-3">✨ BMG-konformes Meldeschein-System</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium mb-2">📋 Vollständige Funktionen:</div>
            <ul className="space-y-1 opacity-90">
              <li>✓ Gäste- und Dokumentdaten</li>
              <li>✓ Reisezweck & Firmenangaben</li>
              <li>✓ Kurtaxe-Management & Befreiung</li>
              <li>✓ Frühstücksauswahl</li>
            </ul>
          </div>
          <div>
            <div className="font-medium mb-2">🎯 Features:</div>
            <ul className="space-y-1 opacity-90">
              <li>✓ Zahlungsoptionen & automatische Berechnung</li>
              <li>✓ DSGVO-konforme Einwilligungen</li>
              <li>✓ Export zur Stadt-Registrierung</li>
              <li>✓ Check-in/Check-out Management</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
