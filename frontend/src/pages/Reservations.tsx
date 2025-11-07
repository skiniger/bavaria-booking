export default function Reservations() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Reservierungen</h1>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Digitales Reservierungsbuch</h2>
        <p className="text-gray-600 mb-4">
          Hier werden alle Funktionen für das Reservierungsmanagement implementiert:
        </p>

        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Live Check-in / Check-out pro Tisch</li>
          <li>Klickbare Tische mit Details</li>
          <li>Echtzeit-Kapazitätsanzeige</li>
          <li>Farbcode pro Tisch</li>
          <li>Kalenderübersicht (50-Jahres-Zeitraum)</li>
          <li>Tisch-Kombinationstool</li>
          <li>Erweiterte Reservierungsmaske mit DSGVO-Feldern</li>
          <li>Zahlungsarten (Bar / EC / Kreditkarte / Rechnung)</li>
          <li>Allergien und besondere Hinweise</li>
        </ul>

        <div className="mt-6">
          <button className="btn-primary mr-2">Neue Reservierung</button>
          <button className="btn-secondary">Kalenderansicht</button>
        </div>
      </div>
    </div>
  );
}
