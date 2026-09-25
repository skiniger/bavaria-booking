import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, Edit, Trash2, Grid, Eye, EyeOff } from 'lucide-react';
import { areasAPI } from '../../services/api';
import type { Area } from '../../types';

interface AreaManagementProps {
  onEditArea?: (area: Area) => void;
  onAddArea?: () => void;
  onManageTables?: (areaId: string) => void;
}

export const AreaManagement: React.FC<AreaManagementProps> = ({
  onEditArea,
  onAddArea,
  onManageTables,
}) => {
  const queryClient = useQueryClient();
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  // Fetch areas
  const { data: areas = [], isLoading } = useQuery<Area[]>({
    queryKey: ['areas'],
    queryFn: async () => {
      const response = await areasAPI.getAll();
      return response.data;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await areasAPI.delete(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const response = await areasAPI.update(id, { is_active });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
    },
  });

  const handleDelete = (area: Area) => {
    if (
      confirm(
        `Möchten Sie den Servicebereich "${area.name}" wirklich löschen?\n\nAlle zugehörigen Tische werden ebenfalls gelöscht.`
      )
    ) {
      deleteMutation.mutate(area.id);
    }
  };

  const handleToggleActive = (area: Area) => {
    toggleActiveMutation.mutate({
      id: area.id,
      is_active: !area.is_active,
    });
  };

  // Get area color class
  const getAreaColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'bg-bavaria-blue',
      green: 'bg-bavaria-green',
      yellow: 'bg-bavaria-yellow',
      red: 'bg-bavaria-red',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      pink: 'bg-pink-500',
      indigo: 'bg-indigo-500',
    };
    return colorMap[color] || 'bg-gray-500';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bavaria-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <MapPin className="h-6 w-6 text-bavaria-blue" />
          <h2 className="text-xl font-semibold text-gray-800">
            Servicebereiche ({areas.length})
          </h2>
        </div>
        <button
          onClick={onAddArea}
          className="px-4 py-2 bg-bavaria-green text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Neuer Bereich</span>
        </button>
      </div>

      {/* Areas Grid */}
      {areas.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-4">Noch keine Servicebereiche angelegt</p>
          <button
            onClick={onAddArea}
            className="px-6 py-2 bg-bavaria-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Ersten Servicebereich anlegen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {areas.map(area => (
            <div
              key={area.id}
              className={`bg-white rounded-lg shadow hover:shadow-lg transition-shadow ${
                selectedArea === area.id ? 'ring-2 ring-bavaria-blue' : ''
              }`}
              onClick={() => setSelectedArea(area.id)}
            >
              <div className={`h-3 rounded-t-lg ${getAreaColorClass(area.color)}`} />
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-gray-800 text-lg">{area.name}</h3>
                      {!area.is_active && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          Inaktiv
                        </span>
                      )}
                    </div>
                    {area.description && (
                      <p className="text-sm text-gray-600">{area.description}</p>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Kapazität</p>
                    <p className="text-2xl font-bold text-bavaria-blue">
                      {area.total_capacity}
                    </p>
                    <p className="text-xs text-gray-500">Plätze</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Tische</p>
                    <p className="text-2xl font-bold text-bavaria-green">
                      {area.tables_count || 0}
                    </p>
                    <p className="text-xs text-gray-500">Gesamt</p>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="space-y-2 mb-4 text-sm">
                  {area.location && (
                    <div className="flex items-center space-x-2 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{area.location}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Grid className="h-4 w-4" />
                    <span>Layout: {area.layout_width}x{area.layout_height} Grid</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onManageTables?.(area.id);
                    }}
                    className="px-3 py-1.5 text-sm text-bavaria-blue hover:bg-bavaria-blue hover:bg-opacity-10 rounded transition-colors flex items-center space-x-1"
                  >
                    <Grid className="h-4 w-4" />
                    <span>Tische</span>
                  </button>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActive(area);
                      }}
                      className="p-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      title={area.is_active ? 'Deaktivieren' : 'Aktivieren'}
                    >
                      {area.is_active ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditArea?.(area);
                      }}
                      className="p-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      title="Bearbeiten"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(area);
                      }}
                      disabled={deleteMutation.isPending}
                      className="p-1.5 text-sm text-bavaria-red hover:bg-bavaria-red hover:bg-opacity-10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Statistics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-bavaria-blue">
          <p className="text-sm text-gray-600">Gesamt Bereiche</p>
          <p className="text-3xl font-bold text-gray-800">{areas.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-bavaria-green">
          <p className="text-sm text-gray-600">Aktive Bereiche</p>
          <p className="text-3xl font-bold text-gray-800">
            {areas.filter(a => a.is_active).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-bavaria-yellow">
          <p className="text-sm text-gray-600">Gesamtkapazität</p>
          <p className="text-3xl font-bold text-gray-800">
            {areas.reduce((sum, a) => sum + a.total_capacity, 0)} Plätze
          </p>
        </div>
      </div>
    </div>
  );
};
