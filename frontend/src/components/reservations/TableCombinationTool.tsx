import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tablesAPI, tableCombinationsAPI } from '../../services/api';
import type { TableCombination } from '../../types';
import { X, Trash2, Save } from 'lucide-react';

interface TableCombinationToolProps {
  isOpen: boolean;
  onClose: () => void;
  areaId?: string;
}

export default function TableCombinationTool({
  isOpen,
  onClose,
  areaId,
}: TableCombinationToolProps) {
  const queryClient = useQueryClient();
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [combinationName, setCombinationName] = useState('');

  const { data: tables = [] } = useQuery({
    queryKey: ['tables', areaId],
    queryFn: () => tablesAPI.getAll(areaId).then((res) => res.data),
    enabled: !!areaId,
  });

  const { data: existingCombinations = [] } = useQuery({
    queryKey: ['table-combinations'],
    queryFn: () => tableCombinationsAPI.getAll().then((res) => res.data),
  });

  const createCombinationMutation = useMutation({
    mutationFn: (data: Partial<TableCombination>) =>
      tableCombinationsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-combinations'] });
      resetForm();
    },
  });

  const deleteCombinationMutation = useMutation({
    mutationFn: (id: string) => tableCombinationsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-combinations'] });
    },
  });

  const resetForm = () => {
    setSelectedTables([]);
    setCombinationName('');
  };

  const toggleTableSelection = (tableId: string) => {
    setSelectedTables((prev) =>
      prev.includes(tableId)
        ? prev.filter((id) => id !== tableId)
        : [...prev, tableId]
    );
  };

  const handleCreateCombination = () => {
    if (!combinationName || selectedTables.length < 2) {
      alert('Bitte geben Sie einen Namen ein und wählen Sie mindestens 2 Tische aus.');
      return;
    }

    const totalCapacity = tables
      .filter((t) => selectedTables.includes(t.id))
      .reduce((sum, t) => sum + t.capacity, 0);

    createCombinationMutation.mutate({
      name: combinationName,
      tables: selectedTables,
      total_capacity: totalCapacity,
      is_active: true,
    });
  };

  const combinableTables = tables.filter((t) => t.is_combinable);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h2 className="text-2xl font-bold">Tischkombinationen</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create New Combination */}
            <div>
              <h3 className="text-lg font-bold mb-4">Neue Kombination erstellen</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Name der Kombination
                  </label>
                  <input
                    type="text"
                    value={combinationName}
                    onChange={(e) => setCombinationName(e.target.value)}
                    className="input"
                    placeholder="z.B. Große Tafel, Familienbereich..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tische auswählen (min. 2)
                  </label>
                  {combinableTables.length === 0 && (
                    <p className="text-gray-500 text-sm">
                      Keine kombinierbaren Tische verfügbar
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {combinableTables.map((table) => (
                      <button
                        key={table.id}
                        onClick={() => toggleTableSelection(table.id)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          selectedTables.includes(table.id)
                            ? 'border-bavaria-blue bg-bavaria-blue text-white'
                            : 'border-gray-300 hover:border-bavaria-blue'
                        }`}
                      >
                        <div className="font-bold">
                          {table.area_name} - {table.table_number}
                        </div>
                        <div className="text-sm">{table.capacity} Plätze</div>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedTables.length > 0 && (
                  <div className="p-4 bg-bavaria-blue bg-opacity-10 rounded-lg">
                    <div className="font-medium text-bavaria-blue">
                      Ausgewählte Tische: {selectedTables.length}
                    </div>
                    <div className="text-sm text-bavaria-blue">
                      Gesamtkapazität:{' '}
                      {tables
                        .filter((t) => selectedTables.includes(t.id))
                        .reduce((sum, t) => sum + t.capacity, 0)}{' '}
                      Plätze
                    </div>
                  </div>
                )}

                <div className="flex space-x-2">
                  <button
                    onClick={handleCreateCombination}
                    disabled={
                      !combinationName ||
                      selectedTables.length < 2 ||
                      createCombinationMutation.isPending
                    }
                    className="btn-primary flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {createCombinationMutation.isPending
                      ? 'Wird erstellt...'
                      : 'Kombination erstellen'}
                  </button>
                  <button onClick={resetForm} className="btn-secondary">
                    Zurücksetzen
                  </button>
                </div>
              </div>
            </div>

            {/* Existing Combinations */}
            <div>
              <h3 className="text-lg font-bold mb-4">Bestehende Kombinationen</h3>

              {existingCombinations.length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  Noch keine Tischkombinationen erstellt
                </p>
              )}

              <div className="space-y-3">
                {existingCombinations.map((combination) => (
                  <div
                    key={combination.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-bold text-lg mb-2">
                          {combination.name}
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          {combination.total_capacity} Plätze gesamt
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {combination.tables_detail?.map((table) => (
                            <span
                              key={table.id}
                              className="px-2 py-1 bg-gray-100 rounded text-xs"
                            >
                              {table.area_name} - {table.table_number}
                            </span>
                          ))}
                        </div>
                        <div className="mt-2">
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs ${
                              combination.is_active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {combination.is_active ? 'Aktiv' : 'Inaktiv'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteCombinationMutation.mutate(combination.id)}
                        disabled={deleteCombinationMutation.isPending}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">
              ℹ️ Hinweis zu Tischkombinationen
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Nur Tische mit dem Flag "Kombinierbar" können kombiniert werden</li>
              <li>• Mindestens 2 Tische müssen für eine Kombination ausgewählt werden</li>
              <li>• Die Gesamtkapazität wird automatisch berechnet</li>
              <li>
                • Kombinationen eignen sich für große Gruppen oder Veranstaltungen
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
