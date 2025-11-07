export default function Staff() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Personalverwaltung</h1>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Mitarbeiter & Zeiterfassung</h2>
        <p className="text-gray-600 mb-4">
          Vollständiges Personal-Management-System:
        </p>

        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Mitarbeiter-Login & Rollen (Admin / Manager / Personal)</li>
          <li>Simultanes Anmelden erlaubt</li>
          <li>Zeiterfassung (automatisch via Check-in/out)</li>
          <li>Manuelle Korrekturen</li>
          <li>Auto-Logout nach 24h</li>
          <li>Mitarbeiterdatenverwaltung</li>
          <li>Stundenübersicht & Filter</li>
        </ul>

        <div className="mt-6">
          <button className="btn-success mr-2">Check-in</button>
          <button className="btn-danger mr-2">Check-out</button>
          <button className="btn-secondary">Zeitübersicht</button>
        </div>
      </div>
    </div>
  );
}
