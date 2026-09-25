import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { reservationsAPI, guestsAPI, tablesAPI } from '../../services/api';
import type { Table, Guest, Reservation } from '../../types';
import { X, Search, Calendar, Clock, Users, CreditCard, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface ReservationFormProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTable?: Table;
  selectedDate?: Date;
  editReservation?: Reservation;
}

export default function ReservationForm({
  isOpen,
  onClose,
  selectedTable,
  selectedDate,
}: ReservationFormProps) {
  // TODO: editReservation wird noch nicht zum Vorbefüllen genutzt (Bearbeiten bestehender Reservierungen).
  const queryClient = useQueryClient();

  // Form State
  const [step, setStep] = useState(1);
  const [searchPhone, setSearchPhone] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);

  // Guest Data
  const [guestData, setGuestData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    email: '',
    allergies: '',
    special_requests: '',
    notes: '',
    gdpr_consent: false,
  });

  // Reservation Data
  const [reservationData, setReservationData] = useState({
    table: selectedTable?.id || '',
    reservation_date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    reservation_time: '18:00',
    duration_minutes: 120,
    number_of_guests: 2,
    payment_method: '' as 'cash' | 'ec' | 'credit_card' | 'invoice' | '',
    notes: '',
  });

  // Search for existing guests
  const { data: searchResults = [] } = useQuery({
    queryKey: ['guest-search', searchPhone],
    queryFn: () =>
      guestsAPI.search({ phone: searchPhone }).then((res) => res.data),
    enabled: searchPhone.length >= 3,
  });

  // Get available tables
  const { data: availableTables = [] } = useQuery({
    queryKey: ['tables'],
    queryFn: () => tablesAPI.getAll().then((res) => res.data),
  });

  // Create/Update Guest Mutation
  const createGuestMutation = useMutation({
    mutationFn: (data: Partial<Guest>) => guestsAPI.create(data),
    onSuccess: (response) => {
      setSelectedGuest(response.data);
      setStep(2);
    },
  });

  // Create Reservation Mutation
  const createReservationMutation = useMutation({
    mutationFn: (data: Partial<Reservation>) => reservationsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      onClose();
      resetForm();
    },
  });

  const resetForm = () => {
    setStep(1);
    setSearchPhone('');
    setSelectedGuest(null);
    setGuestData({
      first_name: '',
      last_name: '',
      phone_number: '',
      email: '',
      allergies: '',
      special_requests: '',
      notes: '',
      gdpr_consent: false,
    });
    setReservationData({
      table: '',
      reservation_date: format(new Date(), 'yyyy-MM-dd'),
      reservation_time: '18:00',
      duration_minutes: 120,
      number_of_guests: 2,
      payment_method: '',
      notes: '',
    });
  };

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGuest) {
      setStep(2);
    } else {
      createGuestMutation.mutate({
        ...guestData,
        gdpr_consent_date: guestData.gdpr_consent ? new Date().toISOString() : undefined,
      });
    }
  };

  const handleReservationSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const reservationDateTime = `${reservationData.reservation_date}T${reservationData.reservation_time}:00`;

    createReservationMutation.mutate({
      guest: selectedGuest?.id,
      table: reservationData.table || undefined,
      reservation_time: reservationDateTime,
      duration_minutes: reservationData.duration_minutes,
      number_of_guests: reservationData.number_of_guests,
      payment_method: reservationData.payment_method || undefined,
      notes: reservationData.notes,
      status: 'pending_confirmation',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h2 className="text-2xl font-bold">Neue Reservierung</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-4 p-6 bg-gray-50">
          <div className={`flex items-center ${step >= 1 ? 'text-bavaria-blue' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-bavaria-blue text-white' : 'bg-gray-300'}`}>
              1
            </div>
            <span className="ml-2 font-medium">Gast</span>
          </div>
          <div className="w-12 h-1 bg-gray-300"></div>
          <div className={`flex items-center ${step >= 2 ? 'text-bavaria-blue' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-bavaria-blue text-white' : 'bg-gray-300'}`}>
              2
            </div>
            <span className="ml-2 font-medium">Reservierung</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <form onSubmit={handleGuestSubmit} className="space-y-4">
              <h3 className="text-lg font-bold mb-4">Schritt 1: Gast auswählen oder anlegen</h3>

              {/* Guest Search */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Gast suchen (Telefonnummer)
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="tel"
                    value={searchPhone}
                    onChange={(e) => setSearchPhone(e.target.value)}
                    className="input pl-10"
                    placeholder="Telefonnummer eingeben..."
                  />
                </div>

                {searchResults.length > 0 && (
                  <div className="mt-2 border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {searchResults.map((guest) => (
                      <button
                        key={guest.id}
                        type="button"
                        onClick={() => {
                          setSelectedGuest(guest);
                          setGuestData({
                            first_name: guest.first_name,
                            last_name: guest.last_name,
                            phone_number: guest.phone_number,
                            email: guest.email || '',
                            allergies: guest.allergies || '',
                            special_requests: guest.special_requests || '',
                            notes: guest.notes || '',
                            gdpr_consent: guest.gdpr_consent,
                          });
                        }}
                        className="w-full text-left p-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="font-medium">
                          {guest.first_name} {guest.last_name}
                        </div>
                        <div className="text-sm text-gray-600">{guest.phone_number}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-3">
                  {selectedGuest ? 'Gastdaten' : 'Neuen Gast anlegen'}
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Vorname *
                    </label>
                    <input
                      type="text"
                      required
                      value={guestData.first_name}
                      onChange={(e) =>
                        setGuestData({ ...guestData, first_name: e.target.value })
                      }
                      className="input"
                      disabled={!!selectedGuest}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Nachname *
                    </label>
                    <input
                      type="text"
                      required
                      value={guestData.last_name}
                      onChange={(e) =>
                        setGuestData({ ...guestData, last_name: e.target.value })
                      }
                      className="input"
                      disabled={!!selectedGuest}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Telefon *
                    </label>
                    <input
                      type="tel"
                      required
                      value={guestData.phone_number}
                      onChange={(e) =>
                        setGuestData({ ...guestData, phone_number: e.target.value })
                      }
                      className="input"
                      disabled={!!selectedGuest}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">E-Mail</label>
                    <input
                      type="email"
                      value={guestData.email}
                      onChange={(e) =>
                        setGuestData({ ...guestData, email: e.target.value })
                      }
                      className="input"
                      disabled={!!selectedGuest}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1">
                    Allergien / Unverträglichkeiten
                  </label>
                  <textarea
                    value={guestData.allergies}
                    onChange={(e) =>
                      setGuestData({ ...guestData, allergies: e.target.value })
                    }
                    className="input"
                    rows={2}
                    disabled={!!selectedGuest}
                    placeholder="z.B. Nussallergie, Laktoseintoleranz"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1">
                    Besondere Wünsche
                  </label>
                  <textarea
                    value={guestData.special_requests}
                    onChange={(e) =>
                      setGuestData({ ...guestData, special_requests: e.target.value })
                    }
                    className="input"
                    rows={2}
                    placeholder="z.B. Fensterplatz, Hochstuhl benötigt"
                  />
                </div>

                {!selectedGuest && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        required
                        checked={guestData.gdpr_consent}
                        onChange={(e) =>
                          setGuestData({ ...guestData, gdpr_consent: e.target.checked })
                        }
                        className="mt-1 mr-2"
                      />
                      <span className="text-sm">
                        <strong>DSGVO-Einwilligung: *</strong> Ich willige ein, dass
                        meine Daten zum Zweck der Reservierungsverwaltung gespeichert
                        werden. Die Einwilligung kann jederzeit widerrufen werden.
                      </span>
                    </label>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <button type="button" onClick={onClose} className="btn-secondary">
                  Abbrechen
                </button>
                <button type="submit" className="btn-primary">
                  Weiter zur Reservierung
                </button>
              </div>
            </form>
          )}

          {step === 2 && selectedGuest && (
            <form onSubmit={handleReservationSubmit} className="space-y-4">
              <h3 className="text-lg font-bold mb-4">Schritt 2: Reservierungsdetails</h3>

              {/* Guest Info */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="font-medium">
                  {selectedGuest.first_name} {selectedGuest.last_name}
                </div>
                <div className="text-sm text-gray-600">{selectedGuest.phone_number}</div>
                {selectedGuest.allergies && (
                  <div className="mt-2 flex items-start text-sm text-red-600">
                    <AlertCircle className="w-4 h-4 mr-1 mt-0.5" />
                    <span>Allergien: {selectedGuest.allergies}</span>
                  </div>
                )}
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Datum *
                  </label>
                  <input
                    type="date"
                    required
                    value={reservationData.reservation_date}
                    onChange={(e) =>
                      setReservationData({
                        ...reservationData,
                        reservation_date: e.target.value,
                      })
                    }
                    className="input"
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    Uhrzeit *
                  </label>
                  <input
                    type="time"
                    required
                    value={reservationData.reservation_time}
                    onChange={(e) =>
                      setReservationData({
                        ...reservationData,
                        reservation_time: e.target.value,
                      })
                    }
                    className="input"
                  />
                </div>
              </div>

              {/* Number of Guests & Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    Anzahl Gäste *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="20"
                    value={reservationData.number_of_guests}
                    onChange={(e) =>
                      setReservationData({
                        ...reservationData,
                        number_of_guests: parseInt(e.target.value),
                      })
                    }
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Dauer (Minuten) *
                  </label>
                  <select
                    value={reservationData.duration_minutes}
                    onChange={(e) =>
                      setReservationData({
                        ...reservationData,
                        duration_minutes: parseInt(e.target.value),
                      })
                    }
                    className="input"
                  >
                    <option value="60">60 Min</option>
                    <option value="90">90 Min</option>
                    <option value="120">120 Min</option>
                    <option value="150">150 Min</option>
                    <option value="180">180 Min</option>
                  </select>
                </div>
              </div>

              {/* Table Selection */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tisch {selectedTable && `(vorausgewählt: ${selectedTable.table_number})`}
                </label>
                <select
                  value={reservationData.table}
                  onChange={(e) =>
                    setReservationData({ ...reservationData, table: e.target.value })
                  }
                  className="input"
                >
                  <option value="">Kein Tisch zugewiesen</option>
                  {availableTables
                    .filter((t) => t.is_reservable)
                    .map((table) => (
                      <option key={table.id} value={table.id}>
                        {table.area_name} - Tisch {table.table_number} ({table.capacity}{' '}
                        Plätze) - {table.status === 'available' ? 'Verfügbar' : 'Belegt'}
                      </option>
                    ))}
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center">
                  <CreditCard className="w-4 h-4 mr-1" />
                  Zahlungsart
                </label>
                <select
                  value={reservationData.payment_method}
                  onChange={(e) =>
                    setReservationData({
                      ...reservationData,
                      payment_method: e.target.value as 'cash' | 'ec' | 'credit_card' | 'invoice' | '',
                    })
                  }
                  className="input"
                >
                  <option value="">Noch nicht festgelegt</option>
                  <option value="cash">Bar</option>
                  <option value="ec">EC-Karte</option>
                  <option value="credit_card">Kreditkarte</option>
                  <option value="invoice">Rechnung</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Interne Notizen
                </label>
                <textarea
                  value={reservationData.notes}
                  onChange={(e) =>
                    setReservationData({ ...reservationData, notes: e.target.value })
                  }
                  className="input"
                  rows={3}
                  placeholder="Interne Notizen zur Reservierung..."
                />
              </div>

              <div className="flex justify-between pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-secondary"
                >
                  Zurück
                </button>
                <div className="space-x-2">
                  <button type="button" onClick={onClose} className="btn-secondary">
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={createReservationMutation.isPending}
                  >
                    {createReservationMutation.isPending
                      ? 'Wird erstellt...'
                      : 'Reservierung erstellen'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
