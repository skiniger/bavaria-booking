import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pensionGuestsAPI } from '../../services/api';
import type { PensionGuest } from '../../types';
import { X, User, FileText, Home, Phone, Shield } from 'lucide-react';

interface PensionGuestFormProps {
  isOpen: boolean;
  onClose: () => void;
  onGuestCreated?: (guest: PensionGuest) => void;
  editGuest?: PensionGuest;
}

export default function PensionGuestForm({
  isOpen,
  onClose,
  onGuestCreated,
  editGuest,
}: PensionGuestFormProps) {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<Partial<PensionGuest>>(
    editGuest || {
      salutation: 'herr',
      first_name: '',
      last_name: '',
      birth_date: '',
      nationality: 'Deutschland',
      street: '',
      house_number: '',
      postal_code: '',
      city: '',
      country: 'Deutschland',
      document_type: 'id_card',
      document_number: '',
      email: '',
      phone: '',
      gdpr_consent: false,
    }
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createOrUpdateMutation = useMutation({
    mutationFn: (data: Partial<PensionGuest>) => {
      if (editGuest) {
        return pensionGuestsAPI.update(editGuest.id, data);
      }
      return pensionGuestsAPI.create(data);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['pension-guests'] });
      if (onGuestCreated) {
        onGuestCreated(response.data);
      }
      onClose();
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
      salutation: 'herr',
      first_name: '',
      last_name: '',
      birth_date: '',
      nationality: 'Deutschland',
      street: '',
      house_number: '',
      postal_code: '',
      city: '',
      country: 'Deutschland',
      document_type: 'id_card',
      document_number: '',
      email: '',
      phone: '',
      gdpr_consent: false,
    });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name) newErrors.first_name = 'Vorname ist erforderlich';
    if (!formData.last_name) newErrors.last_name = 'Nachname ist erforderlich';
    if (!formData.birth_date) newErrors.birth_date = 'Geburtsdatum ist erforderlich';
    if (!formData.nationality) newErrors.nationality = 'Staatsangehörigkeit ist erforderlich';
    if (!formData.street) newErrors.street = 'Straße ist erforderlich';
    if (!formData.house_number) newErrors.house_number = 'Hausnummer ist erforderlich';
    if (!formData.postal_code) newErrors.postal_code = 'PLZ ist erforderlich';
    if (!formData.city) newErrors.city = 'Ort ist erforderlich';
    if (!formData.country) newErrors.country = 'Land ist erforderlich';
    if (!formData.document_number) newErrors.document_number = 'Dokumentnummer ist erforderlich';
    if (!editGuest && !formData.gdpr_consent) {
      newErrors.gdpr_consent = 'DSGVO-Einwilligung ist erforderlich';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const submitData = {
      ...formData,
      gdpr_consent_date: formData.gdpr_consent ? new Date().toISOString() : undefined,
    };

    createOrUpdateMutation.mutate(submitData);
  };

  const updateField = (field: keyof PensionGuest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold">
            {editGuest ? 'Gast bearbeiten' : 'Neuer Pensionsgast'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Personal Information */}
          <div className="card bg-gray-50">
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Persönliche Daten
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Anrede *
                </label>
                <select
                  value={formData.salutation}
                  onChange={(e) => updateField('salutation', e.target.value)}
                  className="input"
                  required
                >
                  <option value="herr">Herr</option>
                  <option value="frau">Frau</option>
                  <option value="divers">Divers</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Vorname *
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => updateField('first_name', e.target.value)}
                  className={`input ${errors.first_name ? 'border-red-500' : ''}`}
                  required
                />
                {errors.first_name && (
                  <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Nachname *
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => updateField('last_name', e.target.value)}
                  className={`input ${errors.last_name ? 'border-red-500' : ''}`}
                  required
                />
                {errors.last_name && (
                  <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Geburtsdatum *
                </label>
                <input
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => updateField('birth_date', e.target.value)}
                  className={`input ${errors.birth_date ? 'border-red-500' : ''}`}
                  required
                  max={new Date().toISOString().split('T')[0]}
                />
                {errors.birth_date && (
                  <p className="text-red-500 text-xs mt-1">{errors.birth_date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Staatsangehörigkeit *
                </label>
                <input
                  type="text"
                  value={formData.nationality}
                  onChange={(e) => updateField('nationality', e.target.value)}
                  className={`input ${errors.nationality ? 'border-red-500' : ''}`}
                  required
                />
                {errors.nationality && (
                  <p className="text-red-500 text-xs mt-1">{errors.nationality}</p>
                )}
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="card bg-gray-50">
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <Home className="w-5 h-5 mr-2" />
              Adresse
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3">
                <label className="block text-sm font-medium mb-1">
                  Straße *
                </label>
                <input
                  type="text"
                  value={formData.street}
                  onChange={(e) => updateField('street', e.target.value)}
                  className={`input ${errors.street ? 'border-red-500' : ''}`}
                  required
                />
                {errors.street && (
                  <p className="text-red-500 text-xs mt-1">{errors.street}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Hausnr. *
                </label>
                <input
                  type="text"
                  value={formData.house_number}
                  onChange={(e) => updateField('house_number', e.target.value)}
                  className={`input ${errors.house_number ? 'border-red-500' : ''}`}
                  required
                />
                {errors.house_number && (
                  <p className="text-red-500 text-xs mt-1">{errors.house_number}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Postleitzahl *
                </label>
                <input
                  type="text"
                  value={formData.postal_code}
                  onChange={(e) => updateField('postal_code', e.target.value)}
                  className={`input ${errors.postal_code ? 'border-red-500' : ''}`}
                  required
                />
                {errors.postal_code && (
                  <p className="text-red-500 text-xs mt-1">{errors.postal_code}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Ort *
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  className={`input ${errors.city ? 'border-red-500' : ''}`}
                  required
                />
                {errors.city && (
                  <p className="text-red-500 text-xs mt-1">{errors.city}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Land *
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => updateField('country', e.target.value)}
                  className={`input ${errors.country ? 'border-red-500' : ''}`}
                  required
                />
                {errors.country && (
                  <p className="text-red-500 text-xs mt-1">{errors.country}</p>
                )}
              </div>
            </div>
          </div>

          {/* Document Information */}
          <div className="card bg-gray-50">
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Ausweisdokument (BMG-Pflichtangabe)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Dokumenttyp *
                </label>
                <select
                  value={formData.document_type}
                  onChange={(e) => updateField('document_type', e.target.value)}
                  className="input"
                  required
                >
                  <option value="id_card">Personalausweis</option>
                  <option value="passport">Reisepass</option>
                  <option value="driving_license">Führerschein</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Dokumentnummer *
                </label>
                <input
                  type="text"
                  value={formData.document_number}
                  onChange={(e) => updateField('document_number', e.target.value)}
                  className={`input ${errors.document_number ? 'border-red-500' : ''}`}
                  required
                  placeholder="z.B. T22000129"
                />
                {errors.document_number && (
                  <p className="text-red-500 text-xs mt-1">{errors.document_number}</p>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="card bg-gray-50">
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <Phone className="w-5 h-5 mr-2" />
              Kontaktdaten
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  className="input"
                  placeholder="+49 123 456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  E-Mail
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className="input"
                  placeholder="gast@example.com"
                />
              </div>
            </div>
          </div>

          {/* GDPR Consent */}
          {!editGuest && (
            <div className="card bg-blue-50">
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Datenschutz (DSGVO)
              </h3>

              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.gdpr_consent}
                  onChange={(e) => updateField('gdpr_consent', e.target.checked)}
                  className="mt-1 mr-3"
                  required
                />
                <div className="flex-1">
                  <p className="font-medium">Einwilligung zur Datenverarbeitung *</p>
                  <p className="text-sm text-gray-700 mt-1">
                    Ich willige ein, dass meine personenbezogenen Daten zum Zweck der
                    Durchführung des Aufenthalts und zur Erfüllung gesetzlicher Meldepflichten
                    (BMG) gespeichert und verarbeitet werden. Die Einwilligung kann jederzeit
                    widerrufen werden. Die Rechtmäßigkeit der bis zum Widerruf erfolgten
                    Verarbeitung bleibt hiervon unberührt.
                  </p>
                  {errors.gdpr_consent && (
                    <p className="text-red-500 text-xs mt-1">{errors.gdpr_consent}</p>
                  )}
                </div>
              </label>
            </div>
          )}

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
              disabled={createOrUpdateMutation.isPending}
              className="btn-primary"
            >
              {createOrUpdateMutation.isPending
                ? 'Wird gespeichert...'
                : editGuest
                ? 'Änderungen speichern'
                : 'Gast anlegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
