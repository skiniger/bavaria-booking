import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Shield, Database, Save, HelpCircle, RotateCcw } from 'lucide-react';
import { systemSettingsAPI } from '../../services/api';
import { SystemSettings } from '../../types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { resetOnboardingTour } from '../ui/OnboardingTour';

export const AdvancedSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<SystemSettings>>({});

  // Fetch settings
  const { data: settings = [] } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: async () => {
      const response = await systemSettingsAPI.getAll();
      return response.data;
    },
  });

  useEffect(() => {
    if (settings.length > 0) {
      setFormData(settings[0]);
    }
  }, [settings]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<SystemSettings>) => {
      return systemSettingsAPI.update(settings[0]?.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
      alert('Einstellungen erfolgreich gespeichert!');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Email Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Mail className="h-6 w-6 text-bavaria-blue" />
          <h3 className="text-lg font-semibold text-gray-800">E-Mail-Einstellungen</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Server</label>
            <input
              type="text"
              value={formData.smtp_host || ''}
              onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue"
              placeholder="smtp.example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Port</label>
            <input
              type="number"
              value={formData.smtp_port || 587}
              onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) || 587 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Benutzername</label>
            <input
              type="text"
              value={formData.smtp_username || ''}
              onChange={(e) => setFormData({ ...formData, smtp_username: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Passwort</label>
            <input
              type="password"
              value={formData.smtp_password || ''}
              onChange={(e) => setFormData({ ...formData, smtp_password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Absender E-Mail</label>
            <input
              type="email"
              value={formData.email_from_address || ''}
              onChange={(e) => setFormData({ ...formData, email_from_address: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue"
              placeholder="noreply@example.com"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="smtp_use_tls"
              checked={formData.smtp_use_tls ?? true}
              onChange={(e) => setFormData({ ...formData, smtp_use_tls: e.target.checked })}
              className="h-4 w-4 text-bavaria-blue focus:ring-bavaria-blue border-gray-300 rounded"
            />
            <label htmlFor="smtp_use_tls" className="ml-2 text-sm text-gray-700">
              TLS verwenden (empfohlen)
            </label>
          </div>
        </div>
      </div>

      {/* DSGVO Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Shield className="h-6 w-6 text-bavaria-blue" />
          <h3 className="text-lg font-semibold text-gray-800">DSGVO-Einstellungen</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Einwilligungstext
            </label>
            <textarea
              value={formData.gdpr_consent_text || ''}
              onChange={(e) => setFormData({ ...formData, gdpr_consent_text: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue resize-none"
              placeholder="Ich stimme der Verarbeitung meiner personenbezogenen Daten gemäß der Datenschutzerklärung zu."
            />
            <p className="text-xs text-gray-500 mt-1">
              Dieser Text wird bei allen Einwilligungen angezeigt
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gäste-Daten (Monate)
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={formData.gdpr_guest_retention_months || 24}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    gdpr_guest_retention_months: parseInt(e.target.value) || 24,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reservierungen (Monate)
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={formData.gdpr_reservation_retention_months || 12}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    gdpr_reservation_retention_months: parseInt(e.target.value) || 12,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zeiterfassung (Jahre)
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={formData.gdpr_timetracking_retention_years || 10}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    gdpr_timetracking_retention_years: parseInt(e.target.value) || 10,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Backup Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Database className="h-6 w-6 text-bavaria-blue" />
          <h3 className="text-lg font-semibold text-gray-800">Backup-Einstellungen</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Backup-Frequenz (Stunden)
            </label>
            <select
              value={formData.backup_frequency_hours || 8}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  backup_frequency_hours: parseInt(e.target.value),
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue"
            >
              <option value={4}>Alle 4 Stunden (6x täglich)</option>
              <option value={8}>Alle 8 Stunden (3x täglich)</option>
              <option value={12}>Alle 12 Stunden (2x täglich)</option>
              <option value={24}>Täglich</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Letztes Backup
            </label>
            <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg">
              {formData.last_backup ? (
                <span className="text-sm text-gray-700">
                  {format(new Date(formData.last_backup), 'dd.MM.yyyy HH:mm', { locale: de })} Uhr
                </span>
              ) : (
                <span className="text-sm text-gray-500">Noch kein Backup durchgeführt</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-bavaria-blue bg-opacity-10 rounded-lg border-l-4 border-bavaria-blue">
          <p className="text-sm text-gray-700">
            <strong>Hinweis:</strong> Backups werden automatisch gemäß der konfigurierten
            Frequenz durchgeführt. Die Backup-Dateien werden auf dem Server gespeichert.
          </p>
        </div>
      </div>

      {/* Help & Tour */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-6">
          <HelpCircle className="h-6 w-6 text-bavaria-blue" />
          <h3 className="text-lg font-semibold text-gray-800">Hilfe & Einführung</h3>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-bavaria-blue">
            <h4 className="font-medium text-gray-800 mb-2">Onboarding-Tour</h4>
            <p className="text-sm text-gray-600 mb-4">
              Lassen Sie sich durch die wichtigsten Funktionen von BAVARIABOOKINGX führen.
              Die Tour erklärt Dashboard, Reservierungen, Pension, Personal und Analytics.
            </p>
            <button
              type="button"
              onClick={resetOnboardingTour}
              className="px-4 py-2 bg-bavaria-blue text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Tour neu starten</span>
            </button>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">Tastenkombinationen</h4>
            <p className="text-sm text-gray-600 mb-2">
              Nutzen Sie Tastenkombinationen für schnellere Navigation:
            </p>
            <div className="text-xs text-gray-600 space-y-1">
              <div><kbd className="px-2 py-1 bg-white border rounded">?</kbd> - Alle Shortcuts anzeigen</div>
              <div><kbd className="px-2 py-1 bg-white border rounded">Ctrl+D</kbd> - Dashboard</div>
              <div><kbd className="px-2 py-1 bg-white border rounded">Ctrl+R</kbd> - Reservierungen</div>
              <div><kbd className="px-2 py-1 bg-white border rounded">Ctrl+P</kbd> - Pension</div>
              <div><kbd className="px-2 py-1 bg-white border rounded">Ctrl+S</kbd> - Personal</div>
              <div><kbd className="px-2 py-1 bg-white border rounded">Ctrl+Shift+T</kbd> - Tour neu starten</div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end bg-gray-50 p-6 rounded-lg">
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
