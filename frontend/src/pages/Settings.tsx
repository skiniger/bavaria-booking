export default function Settings() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Einstellungen</h1>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Systemkonfiguration</h2>
        <p className="text-gray-600 mb-4">
          Individuelle Systemeinstellungen und Firmendaten:
        </p>

        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Firmendaten (Name, Adresse, Kontakt, Logo)</li>
          <li>Standard Reservierungsdauer</li>
          <li>Auto-Logout Einstellungen</li>
          <li>Backup-Frequenz (3x täglich)</li>
          <li>Kurtaxe-Satz</li>
          <li>Öffnungszeiten</li>
          <li>DSGVO-Einstellungen</li>
          <li>Erweiterbare Systemfunktionen</li>
        </ul>

        <div className="mt-6">
          <button className="btn-primary">Einstellungen speichern</button>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">PWA & Offline-Funktionalität</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">Lokale Speicherung</h3>
            <p className="text-sm text-gray-600">IndexedDB für Offline-Daten</p>
          </div>
          <div>
            <h3 className="font-medium mb-2">Automatische Backups</h3>
            <p className="text-sm text-gray-600">3x täglich automatisch</p>
          </div>
          <div>
            <h3 className="font-medium mb-2">Sync-Queue</h3>
            <p className="text-sm text-gray-600">Offline-Änderungen werden synchronisiert</p>
          </div>
          <div>
            <h3 className="font-medium mb-2">Hintergrundsynchronisation</h3>
            <p className="text-sm text-gray-600">Service Worker aktiv</p>
          </div>
        </div>
      </div>
    </div>
  );
}
