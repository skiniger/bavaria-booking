import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Grid, X, Save } from 'lucide-react';
import { api } from '../../services/api';
import { Table, Area } from '../../types';

interface TableFormProps {
  onClose: () => void;
  table?: Table;
  areaId?: string;
}

export const TableForm: React.FC<TableFormProps> = ({ onClose, table, areaId }) => {
  const queryClient = useQueryClient();
  const isEdit = !!table;

  const [formData, setFormData] = useState<Partial<Table>>({
    area: table?.area || areaId || '',
    table_number: table?.table_number || '',
    capacity: table?.capacity || 4,
    status: table?.status || 'available',
    is_combinable: table?.is_combinable ?? true,
    position_x: table?.position_x ?? 0,
    position_y: table?.position_y ?? 0,
    rotation: table?.rotation ?? 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch areas
  const { data: areas = [] } = useQuery<Area[]>({
    queryKey: ['areas'],
    queryFn: api.areas.getAll,
  });

  // Fetch tables (to check for duplicate table numbers)
  const { data: existingTables = [] } = useQuery<Table[]>({
    queryKey: ['tables'],
    queryFn: api.tables.getAll,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<Table>) => api.tables.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      onClose();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<Table>) => api.tables.update(table!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      onClose();
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.area) {
      newErrors.area = 'Servicebereich ist erforderlich';
    }

    if (!formData.table_number?.trim()) {
      newErrors.table_number = 'Tischnummer ist erforderlich';
    } else {
      // Check for duplicate table number in the same area
      const duplicate = existingTables.find(
        t =>
          t.area === formData.area &&
          t.table_number === formData.table_number &&
          (!isEdit || t.id !== table.id)
      );
      if (duplicate) {
        newErrors.table_number = 'Diese Tischnummer existiert bereits in diesem Bereich';
      }
    }

    if (!formData.capacity || formData.capacity < 1 || formData.capacity > 20) {
      newErrors.capacity = 'Kapazität muss zwischen 1 und 20 sein';
    }

    if (formData.position_x === undefined || formData.position_x < 0) {
      newErrors.position_x = 'Position X muss >= 0 sein';
    }

    if (formData.position_y === undefined || formData.position_y < 0) {
      newErrors.position_y = 'Position Y muss >= 0 sein';
    }

    if (formData.rotation !== undefined && (formData.rotation < 0 || formData.rotation >= 360)) {
      newErrors.rotation = 'Rotation muss zwischen 0 und 359 sein';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    if (isEdit) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const selectedArea = areas.find(a => a.id === formData.area);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Grid className="h-6 w-6 text-bavaria-blue" />
            <h2 className="text-xl font-semibold text-gray-800">
              {isEdit ? 'Tisch bearbeiten' : 'Neuer Tisch'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Area Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Servicebereich *
            </label>
            <select
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-bavaria-blue focus:border-transparent ${
                errors.area ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isEdit} // Don't allow changing area for existing tables
            >
              <option value="">Servicebereich auswählen...</option>
              {areas.map(area => (
                <option key={area.id} value={area.id}>
                  {area.name} ({area.total_capacity} Plätze)
                </option>
              ))}
            </select>
            {errors.area && <p className="text-sm text-red-500 mt-1">{errors.area}</p>}
            {isEdit && (
              <p className="text-xs text-gray-500 mt-1">
                Der Servicebereich kann bei bestehenden Tischen nicht geändert werden
              </p>
            )}
          </div>

          {/* Table Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tischnummer *
            </label>
            <input
              type="text"
              value={formData.table_number}
              onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-bavaria-blue focus:border-transparent ${
                errors.table_number ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="z.B. T1, T2, WH-01, etc."
            />
            {errors.table_number && (
              <p className="text-sm text-red-500 mt-1">{errors.table_number}</p>
            )}
          </div>

          {/* Capacity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kapazität (Anzahl Plätze) *
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={formData.capacity}
              onChange={(e) =>
                setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })
              }
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-bavaria-blue focus:border-transparent ${
                errors.capacity ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.capacity && <p className="text-sm text-red-500 mt-1">{errors.capacity}</p>}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as Table['status'] })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue focus:border-transparent"
            >
              <option value="available">Frei</option>
              <option value="reserved">Reserviert</option>
              <option value="occupied">Besetzt</option>
              <option value="out_of_service">Außer Betrieb</option>
            </select>
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Position im Layout
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">X (Horizontal) *</label>
                <input
                  type="number"
                  min="0"
                  max={selectedArea?.layout_width ? selectedArea.layout_width - 1 : 99}
                  value={formData.position_x}
                  onChange={(e) =>
                    setFormData({ ...formData, position_x: parseInt(e.target.value) || 0 })
                  }
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-bavaria-blue focus:border-transparent ${
                    errors.position_x ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.position_x && (
                  <p className="text-xs text-red-500 mt-1">{errors.position_x}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Y (Vertikal) *</label>
                <input
                  type="number"
                  min="0"
                  max={selectedArea?.layout_height ? selectedArea.layout_height - 1 : 99}
                  value={formData.position_y}
                  onChange={(e) =>
                    setFormData({ ...formData, position_y: parseInt(e.target.value) || 0 })
                  }
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-bavaria-blue focus:border-transparent ${
                    errors.position_y ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.position_y && (
                  <p className="text-xs text-red-500 mt-1">{errors.position_y}</p>
                )}
              </div>
            </div>
            {selectedArea && (
              <p className="text-xs text-gray-500 mt-2">
                Maximale Position: X: 0-{selectedArea.layout_width - 1}, Y: 0-
                {selectedArea.layout_height - 1}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Tipp: Nutzen Sie den visuellen Layout-Editor für einfache Positionierung
            </p>
          </div>

          {/* Rotation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rotation (Grad)
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="0"
                max="359"
                step="90"
                value={formData.rotation}
                onChange={(e) =>
                  setFormData({ ...formData, rotation: parseInt(e.target.value) || 0 })
                }
                className="flex-1"
              />
              <input
                type="number"
                min="0"
                max="359"
                value={formData.rotation}
                onChange={(e) =>
                  setFormData({ ...formData, rotation: parseInt(e.target.value) || 0 })
                }
                className={`w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-bavaria-blue focus:border-transparent ${
                  errors.rotation ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <span className="text-sm text-gray-600">°</span>
            </div>
            {errors.rotation && <p className="text-sm text-red-500 mt-1">{errors.rotation}</p>}
            <div className="flex items-center space-x-2 mt-2">
              {[0, 90, 180, 270].map(deg => (
                <button
                  key={deg}
                  type="button"
                  onClick={() => setFormData({ ...formData, rotation: deg })}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    formData.rotation === deg
                      ? 'bg-bavaria-blue text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>

          {/* Is Combinable */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_combinable"
              checked={formData.is_combinable}
              onChange={(e) => setFormData({ ...formData, is_combinable: e.target.checked })}
              className="h-4 w-4 text-bavaria-blue focus:ring-bavaria-blue border-gray-300 rounded"
            />
            <label htmlFor="is_combinable" className="ml-2 block text-sm text-gray-700">
              Tisch kann mit anderen Tischen kombiniert werden
            </label>
          </div>

          {/* Preview */}
          {formData.table_number && (
            <div className="bg-bavaria-blue bg-opacity-10 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-bavaria-blue mb-3">Vorschau</h3>
              <div className="flex items-center justify-center py-4">
                <div
                  className={`w-20 h-20 rounded-lg shadow-md flex items-center justify-center text-white font-semibold transition-transform ${
                    formData.status === 'available'
                      ? 'bg-bavaria-green'
                      : formData.status === 'reserved'
                      ? 'bg-bavaria-yellow'
                      : formData.status === 'occupied'
                      ? 'bg-bavaria-red'
                      : 'bg-gray-400'
                  }`}
                  style={{ transform: `rotate(${formData.rotation}deg)` }}
                >
                  <div
                    className="text-center"
                    style={{ transform: `rotate(-${formData.rotation}deg)` }}
                  >
                    <div className="text-lg">{formData.table_number}</div>
                    <div className="text-xs opacity-90">{formData.capacity}P</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="px-6 py-2 bg-bavaria-blue text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Save className="h-5 w-5" />
            <span>
              {createMutation.isPending || updateMutation.isPending
                ? 'Wird gespeichert...'
                : isEdit
                ? 'Änderungen speichern'
                : 'Tisch erstellen'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
