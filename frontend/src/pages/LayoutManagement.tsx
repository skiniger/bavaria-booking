import { useState } from 'react';
import { MapPin, Plus } from 'lucide-react';
import { AreaManagement } from '../components/areas/AreaManagement';
import { TableLayoutEditor } from '../components/areas/TableLayoutEditor';
import { AreaForm } from '../components/areas/AreaForm';
import { TableForm } from '../components/areas/TableForm';
import type { Area } from '../types';

type ViewMode = 'areas' | 'layout';

export default function LayoutManagement() {
  const [viewMode, setViewMode] = useState<ViewMode>('areas');
  const [showAreaForm, setShowAreaForm] = useState(false);
  const [showTableForm, setShowTableForm] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | undefined>();
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [showLayoutEditor, setShowLayoutEditor] = useState(false);

  const handleEditArea = (area: Area) => {
    setEditingArea(area);
    setShowAreaForm(true);
  };

  const handleAddArea = () => {
    setEditingArea(undefined);
    setShowAreaForm(true);
  };

  const handleManageTables = (areaId: string) => {
    setSelectedAreaId(areaId);
    setShowLayoutEditor(true);
  };

  const handleAddTable = () => {
    setShowTableForm(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Layout-Verwaltung</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleAddTable}
            className="px-4 py-2 bg-bavaria-green text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Neuer Tisch</span>
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setViewMode('areas')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
                viewMode === 'areas'
                  ? 'border-bavaria-blue text-bavaria-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <MapPin className="h-5 w-5" />
              <span>Servicebereiche</span>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Areas Management */}
          {viewMode === 'areas' && (
            <AreaManagement
              onEditArea={handleEditArea}
              onAddArea={handleAddArea}
              onManageTables={handleManageTables}
            />
          )}
        </div>
      </div>

      {/* Area Form Modal */}
      {showAreaForm && (
        <AreaForm
          onClose={() => {
            setShowAreaForm(false);
            setEditingArea(undefined);
          }}
          area={editingArea}
        />
      )}

      {/* Table Form Modal */}
      {showTableForm && (
        <TableForm
          onClose={() => setShowTableForm(false)}
          areaId={selectedAreaId || undefined}
        />
      )}

      {/* Layout Editor Modal */}
      {showLayoutEditor && selectedAreaId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-7xl max-h-[95vh] overflow-hidden">
            <TableLayoutEditor
              areaId={selectedAreaId}
              onClose={() => {
                setShowLayoutEditor(false);
                setSelectedAreaId(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
