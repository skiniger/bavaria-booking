import { useState } from 'react';
import { Settings as SettingsIcon, Clock, Mail, Shield, Database } from 'lucide-react';
import { SystemSettingsForm } from '../components/settings/SystemSettingsForm';
import { OpeningHoursManager } from '../components/settings/OpeningHoursManager';
import { AdvancedSettings } from '../components/settings/AdvancedSettings';

type TabType = 'general' | 'hours' | 'advanced';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabType>('general');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Einstellungen</h1>
        <p className="text-gray-600 mt-2">
          Verwalten Sie Firmendaten, Öffnungszeiten und Systemeinstellungen
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
                activeTab === 'general'
                  ? 'border-bavaria-blue text-bavaria-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <SettingsIcon className="h-5 w-5" />
              <span>Allgemein</span>
            </button>

            <button
              onClick={() => setActiveTab('hours')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
                activeTab === 'hours'
                  ? 'border-bavaria-blue text-bavaria-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Clock className="h-5 w-5" />
              <span>Öffnungszeiten</span>
            </button>

            <button
              onClick={() => setActiveTab('advanced')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
                activeTab === 'advanced'
                  ? 'border-bavaria-blue text-bavaria-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Mail className="h-5 w-5" />
              <span>Erweitert</span>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* General Settings Tab */}
          {activeTab === 'general' && <SystemSettingsForm />}

          {/* Opening Hours Tab */}
          {activeTab === 'hours' && <OpeningHoursManager />}

          {/* Advanced Settings Tab */}
          {activeTab === 'advanced' && <AdvancedSettings />}
        </div>
      </div>

      {/* PWA Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800">PWA & Offline-Funktionalität</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3">
            <Database className="h-5 w-5 text-bavaria-blue mt-1" />
            <div>
              <h3 className="font-medium text-gray-800">Lokale Speicherung</h3>
              <p className="text-sm text-gray-600">IndexedDB für Offline-Daten</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Database className="h-5 w-5 text-bavaria-green mt-1" />
            <div>
              <h3 className="font-medium text-gray-800">Automatische Backups</h3>
              <p className="text-sm text-gray-600">Konfigurierbar (Standard: 3x täglich)</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-bavaria-yellow mt-1" />
            <div>
              <h3 className="font-medium text-gray-800">Sync-Queue</h3>
              <p className="text-sm text-gray-600">Offline-Änderungen werden synchronisiert</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <SettingsIcon className="h-5 w-5 text-bavaria-red mt-1" />
            <div>
              <h3 className="font-medium text-gray-800">Hintergrundsynchronisation</h3>
              <p className="text-sm text-gray-600">Service Worker aktiv</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
