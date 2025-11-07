export default function Pension() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Pension & Rezeption</h1>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Meldeschein-Verwaltung</h2>
        <p className="text-gray-600 mb-4">
          BMG-konformes Meldeschein-Formular mit allen erforderlichen Feldern:
        </p>

        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Gäste- und Dokumentdaten</li>
          <li>Reisezweck & Firmenangaben</li>
          <li>Kurtaxe-Management & Befreiung</li>
          <li>Frühstücksauswahl</li>
          <li>Zahlungsoptionen & Summenberechnung</li>
          <li>Einwilligungen & DSGVO-Checkboxen</li>
          <li>Export zur Stadt-Registrierung</li>
        </ul>

        <div className="mt-6">
          <button className="btn-primary mr-2">Neuer Meldeschein</button>
          <button className="btn-secondary">Gäste suchen</button>
        </div>
      </div>
    </div>
  );
}
