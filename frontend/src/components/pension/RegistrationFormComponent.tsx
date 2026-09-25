import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { registrationFormsAPI, systemSettingsAPI } from '../../services/api';
import type { PensionGuest, RegistrationForm } from '../../types';
import { X, User, Calendar, Briefcase, Euro, Coffee, CreditCard, FileCheck } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface RegistrationFormComponentProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGuest?: PensionGuest;
  editForm?: RegistrationForm;
}

export default function RegistrationFormComponent({
  isOpen,
  onClose,
  selectedGuest,
  editForm,
}: RegistrationFormComponentProps) {
  const queryClient = useQueryClient();

  // Fetch system settings for default values
  const { data: settings } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => systemSettingsAPI.getAll().then((res) => res.data[0]),
  });

  const [formData, setFormData] = useState<Partial<RegistrationForm>>(
    editForm || {
      guest: selectedGuest?.id || '',
      arrival_date: format(new Date(), 'yyyy-MM-dd'),
      departure_date: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'),
      room_number: '',
      travel_purpose: 'private',
      company_name: '',
      company_address: '',
      tourist_tax_required: true,
      tourist_tax_exemption_reason: '',
      tourist_tax_amount: 0,
      breakfast_included: false,
      breakfast_price: 0,
      room_price_per_night: 0,
      total_amount: 0,
      payment_method: 'cash',
      payment_status: 'pending',
      status: 'draft',
      notes: '',
    }
  );

  const [calculatedValues, setCalculatedValues] = useState({
    nights: 0,
    roomTotal: 0,
    breakfastTotal: 0,
    totalAmount: 0,
  });

  // Calculate values when dates or prices change
  useEffect(() => {
    if (formData.arrival_date && formData.departure_date) {
      const nights = differenceInDays(
        new Date(formData.departure_date),
        new Date(formData.arrival_date)
      );

      const roomTotal = (formData.room_price_per_night || 0) * nights;
      const breakfastTotal = formData.breakfast_included
        ? (formData.breakfast_price || 0) * nights
        : 0;
      const touristTaxTotal = formData.tourist_tax_required
        ? (formData.tourist_tax_amount || settings?.tourist_tax_rate || 0) * nights
        : 0;
      const totalAmount = roomTotal + breakfastTotal + touristTaxTotal;

      setCalculatedValues({
        nights,
        roomTotal,
        breakfastTotal,
        totalAmount,
      });

      setFormData((prev) => ({
        ...prev,
        tourist_tax_amount: formData.tourist_tax_required
          ? settings?.tourist_tax_rate || 2.5
          : 0,
      }));
    }
  }, [
    formData.arrival_date,
    formData.departure_date,
    formData.room_price_per_night,
    formData.breakfast_included,
    formData.breakfast_price,
    formData.tourist_tax_required,
    formData.tourist_tax_amount,
    settings,
  ]);

  const createOrUpdateMutation = useMutation({
    mutationFn: (data: Partial<RegistrationForm>) => {
      if (editForm) {
        return registrationFormsAPI.update(editForm.id, data);
      }
      return registrationFormsAPI.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registration-forms'] });
      queryClient.invalidateQueries({ queryKey: ['pension-guests'] });
      onClose();
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
      guest: '',
      arrival_date: format(new Date(), 'yyyy-MM-dd'),
      departure_date: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'),
      room_number: '',
      travel_purpose: 'private',
      company_name: '',
      company_address: '',
      tourist_tax_required: true,
      tourist_tax_exemption_reason: '',
      tourist_tax_amount: 0,
      breakfast_included: false,
      breakfast_price: 0,
      room_price_per_night: 0,
      total_amount: 0,
      payment_method: 'cash',
      payment_status: 'pending',
      status: 'draft',
      notes: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = {
      ...formData,
      total_amount: calculatedValues.totalAmount,
    };

    createOrUpdateMutation.mutate(submitData);
  };

  const updateField = <K extends keyof RegistrationForm>(field: K, value: RegistrationForm[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold">
              {editForm ? 'Meldeschein bearbeiten' : 'Neuer Meldeschein'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              BMG-konformes Meldeformular für Beherbergungsstätten
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Guest Information */}
          {selectedGuest && (
            <div className="card bg-bavaria-blue bg-opacity-10">
              <h3 className="text-lg font-bold mb-2 flex items-center text-bavaria-blue">
                <User className="w-5 h-5 mr-2" />
                Gast
              </h3>
              <div className="text-sm space-y-1">
                <div className="font-medium text-lg">
                  {selectedGuest.first_name} {selectedGuest.last_name}
                </div>
                <div className="text-gray-600">
                  Geboren: {format(new Date(selectedGuest.birth_date), 'dd.MM.yyyy')}
                </div>
                <div className="text-gray-600">
                  {selectedGuest.street} {selectedGuest.house_number}, {selectedGuest.postal_code} {selectedGuest.city}
                </div>
                <div className="text-gray-600">
                  {selectedGuest.document_type === 'id_card' && 'Personalausweis'}
                  {selectedGuest.document_type === 'passport' && 'Reisepass'}
                  {selectedGuest.document_type === 'driving_license' && 'Führerschein'}
                  : {selectedGuest.document_number}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Stay Information */}
              <div className="card bg-gray-50">
                <h3 className="text-lg font-bold mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Aufenthaltsdaten
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Anreisedatum *
                    </label>
                    <input
                      type="date"
                      value={formData.arrival_date}
                      onChange={(e) => updateField('arrival_date', e.target.value)}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Abreisedatum *
                    </label>
                    <input
                      type="date"
                      value={formData.departure_date}
                      onChange={(e) => updateField('departure_date', e.target.value)}
                      className="input"
                      required
                      min={formData.arrival_date}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Zimmernummer *
                    </label>
                    <input
                      type="text"
                      value={formData.room_number}
                      onChange={(e) => updateField('room_number', e.target.value)}
                      className="input"
                      required
                      placeholder="z.B. 101, 2A"
                    />
                  </div>

                  {calculatedValues.nights > 0 && (
                    <div className="p-3 bg-bavaria-blue bg-opacity-10 rounded-lg">
                      <div className="text-sm text-bavaria-blue font-medium">
                        Anzahl Nächte: {calculatedValues.nights}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Travel Purpose */}
              <div className="card bg-gray-50">
                <h3 className="text-lg font-bold mb-4 flex items-center">
                  <Briefcase className="w-5 h-5 mr-2" />
                  Reisezweck
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Zweck des Aufenthalts *
                    </label>
                    <select
                      value={formData.travel_purpose}
                      onChange={(e) => updateField('travel_purpose', e.target.value as RegistrationForm['travel_purpose'])}
                      className="input"
                      required
                    >
                      <option value="private">Privat</option>
                      <option value="business">Geschäftlich</option>
                    </select>
                  </div>

                  {formData.travel_purpose === 'business' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Firmenname
                        </label>
                        <input
                          type="text"
                          value={formData.company_name}
                          onChange={(e) => updateField('company_name', e.target.value)}
                          className="input"
                          placeholder="Firma GmbH"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Firmenadresse
                        </label>
                        <textarea
                          value={formData.company_address}
                          onChange={(e) => updateField('company_address', e.target.value)}
                          className="input"
                          rows={2}
                          placeholder="Straße, PLZ Ort"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Breakfast */}
              <div className="card bg-gray-50">
                <h3 className="text-lg font-bold mb-4 flex items-center">
                  <Coffee className="w-5 h-5 mr-2" />
                  Frühstück
                </h3>

                <div className="space-y-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.breakfast_included}
                      onChange={(e) => updateField('breakfast_included', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="font-medium">Frühstück inklusive</span>
                  </label>

                  {formData.breakfast_included && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Frühstückspreis pro Tag (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.breakfast_price}
                        onChange={(e) =>
                          updateField('breakfast_price', parseFloat(e.target.value))
                        }
                        className="input"
                        placeholder="z.B. 8.50"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Tourist Tax */}
              <div className="card bg-gray-50">
                <h3 className="text-lg font-bold mb-4 flex items-center">
                  <Euro className="w-5 h-5 mr-2" />
                  Kurtaxe
                </h3>

                <div className="space-y-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.tourist_tax_required}
                      onChange={(e) =>
                        updateField('tourist_tax_required', e.target.checked)
                      }
                      className="mr-2"
                    />
                    <span className="font-medium">Kurtaxepflichtig</span>
                  </label>

                  {!formData.tourist_tax_required && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Befreiungsgrund
                      </label>
                      <textarea
                        value={formData.tourist_tax_exemption_reason}
                        onChange={(e) =>
                          updateField('tourist_tax_exemption_reason', e.target.value)
                        }
                        className="input"
                        rows={2}
                        placeholder="z.B. Einwohner, Kinder unter 14 Jahren, etc."
                      />
                    </div>
                  )}

                  {formData.tourist_tax_required && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Kurtaxe pro Nacht (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.tourist_tax_amount}
                        onChange={(e) =>
                          updateField('tourist_tax_amount', parseFloat(e.target.value))
                        }
                        className="input"
                        placeholder="z.B. 2.50"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Standard: {settings?.tourist_tax_rate || 2.5} € pro Nacht
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing */}
              <div className="card bg-gray-50">
                <h3 className="text-lg font-bold mb-4 flex items-center">
                  <Euro className="w-5 h-5 mr-2" />
                  Preise & Berechnung
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Zimmerpreis pro Nacht (€) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.room_price_per_night}
                      onChange={(e) =>
                        updateField('room_price_per_night', parseFloat(e.target.value))
                      }
                      className="input"
                      required
                      placeholder="z.B. 89.00"
                    />
                  </div>

                  {/* Calculation Summary */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Übernachtungen:</span>
                      <span className="font-medium">
                        {calculatedValues.nights} × {formData.room_price_per_night || 0} € ={' '}
                        {calculatedValues.roomTotal.toFixed(2)} €
                      </span>
                    </div>

                    {formData.breakfast_included && (
                      <div className="flex justify-between text-sm">
                        <span>Frühstück:</span>
                        <span className="font-medium">
                          {calculatedValues.nights} × {formData.breakfast_price || 0} € ={' '}
                          {calculatedValues.breakfastTotal.toFixed(2)} €
                        </span>
                      </div>
                    )}

                    {formData.tourist_tax_required && (
                      <div className="flex justify-between text-sm">
                        <span>Kurtaxe:</span>
                        <span className="font-medium">
                          {calculatedValues.nights} × {formData.tourist_tax_amount || 0} € ={' '}
                          {(
                            calculatedValues.nights * (formData.tourist_tax_amount || 0)
                          ).toFixed(2)}{' '}
                          €
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>Gesamtsumme:</span>
                      <span className="text-bavaria-blue">
                        {calculatedValues.totalAmount.toFixed(2)} €
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="card bg-gray-50">
                <h3 className="text-lg font-bold mb-4 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Zahlung
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Zahlungsart *
                    </label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => updateField('payment_method', e.target.value as RegistrationForm['payment_method'])}
                      className="input"
                      required
                    >
                      <option value="cash">Bar</option>
                      <option value="ec">EC-Karte</option>
                      <option value="credit_card">Kreditkarte</option>
                      <option value="invoice">Rechnung</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Zahlungsstatus *
                    </label>
                    <select
                      value={formData.payment_status}
                      onChange={(e) => updateField('payment_status', e.target.value as RegistrationForm['payment_status'])}
                      className="input"
                      required
                    >
                      <option value="pending">Ausstehend</option>
                      <option value="paid">Bezahlt</option>
                      <option value="partially_paid">Teilweise bezahlt</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="card bg-gray-50">
            <label className="block text-sm font-medium mb-1">
              Interne Notizen
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              className="input"
              rows={3}
              placeholder="Interne Notizen zum Aufenthalt..."
            />
          </div>

          {/* BMG Info */}
          <div className="card bg-blue-50">
            <div className="flex items-start">
              <FileCheck className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
              <div className="flex-1 text-sm text-blue-900">
                <p className="font-medium mb-1">ℹ️ BMG-Konformität</p>
                <p>
                  Dieser Meldeschein entspricht den Anforderungen des Bundesmeldegesetzes
                  (BMG) für Beherbergungsstätten. Nach dem Check-in kann der Meldeschein
                  elektronisch zur Stadt-Registrierung exportiert werden.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="btn-secondary"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={createOrUpdateMutation.isPending || !selectedGuest}
              className="btn-primary"
            >
              {createOrUpdateMutation.isPending
                ? 'Wird gespeichert...'
                : editForm
                ? 'Änderungen speichern'
                : 'Meldeschein erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
