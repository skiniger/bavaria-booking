import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, X, Save } from 'lucide-react';
import { api } from '../../services/api';
import { Area } from '../../types';

interface AreaFormProps {
  onClose: () => void;
  area?: Area;
}

export const AreaForm: React.FC<AreaFormProps> = ({ onClose, area }) => {
  const queryClient = useQueryClient();
  const isEdit = !!area;

  const [formData, setFormData] = useState<Partial<Area>>({
    name: area?.name || '',
    description: area?.description || '',
    color: area?.color || 'blue',
    location: area?.location || '',
    is_active: area?.is_active ?? true,
    layout_width: area?.layout_width || 10,
    layout_height: area?.layout_height || 10,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<Area>) => api.areas.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      onClose();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<Area>) => api.areas.update(area!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      onClose();
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Name ist erforderlich';
    }

    if (!formData.color) {
      newErrors.color = 'Farbe ist erforderlich';
    }

    if (!formData.layout_width || formData.layout_width < 5 || formData.layout_width > 30) {
      newErrors.layout_width = 'Breite muss zwischen 5 und 30 sein';
    }

    if (!formData.layout_height || formData.layout_height < 5 || formData.layout_height > 30) {
      newErrors.layout_height = 'Höhe muss zwischen 5 und 30 sein';
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

  const availableColors = [
    { value: 'blue', label: 'Blau', class: 'bg-bavaria-blue' },
    { value: 'green', label: 'Grün', class: 'bg-bavaria-green' },
    { value: 'yellow', label: 'Gelb', class: 'bg-bavaria-yellow' },
    { value: 'red', label: 'Rot', class: 'bg-bavaria-red' },
    { value: 'purple', label: 'Lila', class: 'bg-purple-500' },
    { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
    { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
    { value: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <MapPin className="h-6 w-6 text-bavaria-blue" />
            <h2 className="text-xl font-semibold text-gray-800">
              {isEdit ? 'Servicebereich bearbeiten' : 'Neuer Servicebereich'}
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
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-bavaria-blue focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="z.B. Wirtshaus, Wintergarten, Biergarten"
            />
            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Beschreibung
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue focus:border-transparent resize-none"
              placeholder="Optionale Beschreibung des Bereichs"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Farbe *
            </label>
            <div className="grid grid-cols-4 gap-3">
              {availableColors.map(color => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: color.value })}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg border-2 transition-all ${
                    formData.color === color.value
                      ? 'border-bavaria-blue bg-bavaria-blue bg-opacity-10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-6 h-6 rounded ${color.class}`}></div>
                  <span className="text-sm">{color.label}</span>
                </button>
              ))}
            </div>
            {errors.color && <p className="text-sm text-red-500 mt-1">{errors.color}</p>}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Standort
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue focus:border-transparent"
              placeholder="z.B. Erdgeschoss, 1. Stock, Außenbereich"
            />
          </div>

          {/* Layout Dimensions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Layout-Raster-Größe
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Breite *</label>
                <input
                  type="number"
                  min="5"
                  max="30"
                  value={formData.layout_width}
                  onChange={(e) =>
                    setFormData({ ...formData, layout_width: parseInt(e.target.value) || 10 })
                  }
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-bavaria-blue focus:border-transparent ${
                    errors.layout_width ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.layout_width && (
                  <p className="text-xs text-red-500 mt-1">{errors.layout_width}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Höhe *</label>
                <input
                  type="number"
                  min="5"
                  max="30"
                  value={formData.layout_height}
                  onChange={(e) =>
                    setFormData({ ...formData, layout_height: parseInt(e.target.value) || 10 })
                  }
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-bavaria-blue focus:border-transparent ${
                    errors.layout_height ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.layout_height && (
                  <p className="text-xs text-red-500 mt-1">{errors.layout_height}</p>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Das Raster definiert die Anzahl der Felder für die Tischplatzierung (5-30 pro Dimension)
            </p>
          </div>

          {/* Is Active */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-bavaria-blue focus:ring-bavaria-blue border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
              Bereich ist aktiv
            </label>
          </div>

          {/* Warning about layout changes */}
          {isEdit && (
            <div className="bg-yellow-50 border-l-4 border-bavaria-yellow p-4">
              <p className="text-sm text-gray-700">
                <strong>Hinweis:</strong> Das Ändern der Layout-Raster-Größe kann die Position
                bestehender Tische beeinflussen. Überprüfen Sie nach dem Speichern das Layout im Editor.
              </p>
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
                : 'Bereich erstellen'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
