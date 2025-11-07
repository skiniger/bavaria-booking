import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Save, AlertCircle } from 'lucide-react';
import { systemSettingsAPI } from '../../services/api';
import { SystemSettings } from '../../types';

export const SystemSettingsForm: React.FC = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<SystemSettings>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch settings
  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: async () => {
      const response = await systemSettingsAPI.getAll();
      return response.data;
    },
  });

  // Initialize form with first settings object
  useEffect(() => {
    if (settings.length > 0) {
      setFormData(settings[0]);
    }
  }, [settings]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<SystemSettings>) => {
      const settingsId = settings[0]?.id;
      return systemSettingsAPI.update(settingsId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
      alert('Einstellungen erfolgreich gespeichert!');
    },
    onError: () => {
      alert('Fehler beim Speichern der Einstellungen');
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.company_name?.trim()) {
      newErrors.company_name = 'Firmenname ist erforderlich';
    }
    if (!formData.company_email) {
      newErrors.company_email = 'E-Mail ist erforderlich';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bavaria-blue"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Firmendaten */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Building2 className="h-6 w-6 text-bavaria-blue" />
          <h3 className="text-lg font-semibold text-gray-800">Firmendaten</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Firmenname *
            </label>
            <input
              type="text"
              value={formData.company_name || ''}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-bavaria-blue ${
                errors.company_name ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.company_name && (
              <p className="text-sm text-red-500 mt-1">{errors.company_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Straße</label>
            <input
              type="text"
              value={formData.company_street || ''}
              onChange={(e) => setFormData({ ...formData, company_street: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">PLZ</label>
              <input
                type="text"
                value={formData.company_postal_code || ''}
                onChange={(e) => setFormData({ ...formData, company_postal_code: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ort</label>
              <input
                type="text"
                value={formData.company_city || ''}
                onChange={(e) => setFormData({ ...formData, company_city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
            <input
              type="tel"
              value={formData.company_phone || ''}
              onChange={(e) => setFormData({ ...formData, company_phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">E-Mail *</label>
            <input
              type="email"
              value={formData.company_email || ''}
              onChange={(e) => setFormData({ ...formData, company_email: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-bavaria-blue ${
                errors.company_email ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.company_email && (
              <p className="text-sm text-red-500 mt-1">{errors.company_email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
            <input
              type="url"
              value={formData.company_website || ''}
              onChange={(e) => setFormData({ ...formData, company_website: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue"
              placeholder="https://"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Logo URL</label>
            <input
              type="url"
              value={formData.company_logo_url || ''}
              onChange={(e) => setFormData({ ...formData, company_logo_url: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue"
              placeholder="https://"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Steuernummer</label>
            <input
              type="text"
              value={formData.tax_id || ''}
              onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">USt-ID</label>
            <input
              type="text"
              value={formData.vat_id || ''}
              onChange={(e) => setFormData({ ...formData, vat_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue"
            />
          </div>
        </div>
      </div>

      {/* Reservierungs-Einstellungen */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Reservierungs-Einstellungen</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Standard Dauer (Minuten)
            </label>
            <input
              type="number"
              min="30"
              max="480"
              value={formData.default_reservation_duration || 120}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  default_reservation_duration: parseInt(e.target.value) || 120,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vorlaufzeit (Tage)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={formData.reservation_lead_time || 90}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  reservation_lead_time: parseInt(e.target.value) || 90,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max. Gäste pro Reservierung
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.max_guests_per_reservation || 20}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  max_guests_per_reservation: parseInt(e.target.value) || 20,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue"
            />
          </div>
        </div>
      </div>

      {/* Kurtaxe & System */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Kurtaxe */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Kurtaxe</h3>

          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="tourist_tax_enabled"
                checked={formData.tourist_tax_enabled ?? true}
                onChange={(e) =>
                  setFormData({ ...formData, tourist_tax_enabled: e.target.checked })
                }
                className="h-4 w-4 text-bavaria-blue focus:ring-bavaria-blue border-gray-300 rounded"
              />
              <label htmlFor="tourist_tax_enabled" className="ml-2 text-sm text-gray-700">
                Kurtaxe aktiv
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kurtaxe-Satz (€ pro Nacht)
              </label>
              <input
                type="number"
                min="0"
                step="0.10"
                value={formData.tourist_tax_rate || 2.5}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tourist_tax_rate: parseFloat(e.target.value) || 2.5,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue"
              />
            </div>
          </div>
        </div>

        {/* System */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">System</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auto-Logout (Stunden)
              </label>
              <input
                type="number"
                min="1"
                max="72"
                value={formData.auto_logout_hours || 24}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    auto_logout_hours: parseInt(e.target.value) || 24,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Zeitzone</label>
              <select
                value={formData.timezone || 'Europe/Berlin'}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue"
              >
                <option value="Europe/Berlin">Europe/Berlin</option>
                <option value="Europe/Vienna">Europe/Vienna</option>
                <option value="Europe/Zurich">Europe/Zurich</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sprache</label>
              <select
                value={formData.language || 'de'}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue"
              >
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end space-x-4 bg-gray-50 p-6 rounded-lg">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <AlertCircle className="h-4 w-4" />
          <span>Änderungen werden sofort wirksam</span>
        </div>
        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="px-6 py-2 bg-bavaria-blue text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <Save className="h-5 w-5" />
          <span>{updateMutation.isPending ? 'Wird gespeichert...' : 'Einstellungen speichern'}</span>
        </button>
      </div>
    </form>
  );
};
