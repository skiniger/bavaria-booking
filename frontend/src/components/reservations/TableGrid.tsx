import { useQuery } from '@tanstack/react-query';
import { tablesAPI } from '../../services/api';
import type { Table, Area } from '../../types';
import { Users, MapPin, Plus } from 'lucide-react';

interface TableGridProps {
  selectedArea: Area | null;
  onTableClick: (table: Table) => void;
  selectedDate?: Date;
}

export default function TableGrid({ selectedArea, onTableClick }: TableGridProps) {

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['tables', selectedArea?.id],
    queryFn: () => tablesAPI.getAll(selectedArea?.id).then((res) => res.data),
    enabled: !!selectedArea,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-bavaria-green hover:bg-green-600';
      case 'occupied':
        return 'bg-bavaria-red hover:bg-red-600';
      case 'reserved':
        return 'bg-bavaria-yellow hover:bg-yellow-600';
      case 'out_of_service':
        return 'bg-gray-400 hover:bg-gray-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return 'Verfügbar';
      case 'occupied':
        return 'Besetzt';
      case 'reserved':
        return 'Reserviert';
      case 'out_of_service':
        return 'Außer Betrieb';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return '✓';
      case 'occupied':
        return '✕';
      case 'reserved':
        return '⏱';
      case 'out_of_service':
        return '⚠';
      default:
        return '';
    }
  };

  if (!selectedArea) {
    return (
      <div className="card">
        <div className="text-center py-12 text-gray-500">
          <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Bitte wählen Sie einen Bereich aus</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="card">
        <div className="text-center py-12 text-gray-500">
          Lade Tische...
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold">{selectedArea.name}</h3>
          <p className="text-gray-600">
            {tables.length} Tische · {selectedArea.total_capacity} Plätze
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-bavaria-green"></div>
            <span className="text-sm">Frei</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-bavaria-yellow"></div>
            <span className="text-sm">Reserviert</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-bavaria-red"></div>
            <span className="text-sm">Belegt</span>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {tables.map((table) => (
          <button
            key={table.id}
            onClick={() => onTableClick(table)}
            className={`relative p-6 rounded-lg shadow-md transition-all transform hover:scale-105 text-white ${getStatusColor(
              table.status
            )}`}
            disabled={table.status === 'out_of_service'}
          >
            {/* Tischnummer */}
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">
                {getStatusIcon(table.status)}
              </div>
              <div className="text-2xl font-bold mb-1">
                {table.table_number}
              </div>
              <div className="flex items-center justify-center text-sm opacity-90">
                <Users className="w-4 h-4 mr-1" />
                <span>{table.capacity}</span>
              </div>
              <div className="text-xs mt-1 opacity-75">
                {getStatusText(table.status)}
              </div>
            </div>

            {/* Kombinierbar Badge */}
            {table.is_combinable && (
              <div className="absolute top-2 right-2">
                <Plus className="w-4 h-4" />
              </div>
            )}
          </button>
        ))}
      </div>

      {tables.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>Keine Tische in diesem Bereich</p>
        </div>
      )}
    </div>
  );
}
