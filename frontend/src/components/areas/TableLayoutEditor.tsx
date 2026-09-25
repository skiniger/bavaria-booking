import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Grid, ZoomIn, ZoomOut, RotateCw, Trash2 } from 'lucide-react';
import { areasAPI, tablesAPI } from '../../services/api';
import type { Area, Table } from '../../types';

interface TableLayoutEditorProps {
  areaId: string;
  onClose?: () => void;
}

interface DraggingTable {
  id: string;
  offsetX: number;
  offsetY: number;
}

export const TableLayoutEditor: React.FC<TableLayoutEditorProps> = ({ areaId, onClose }) => {
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [gridSize] = useState(50); // Grid cell size in pixels
  const [isDragging, setIsDragging] = useState(false);
  const [draggingTable, setDraggingTable] = useState<DraggingTable | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);

  // Fetch area
  const { data: area } = useQuery<Area>({
    queryKey: ['areas', areaId],
    queryFn: async () => {
      const response = await areasAPI.getById(areaId);
      return response.data;
    },
    enabled: !!areaId,
  });

  // Fetch tables
  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: ['tables', areaId],
    queryFn: async () => {
      const response = await tablesAPI.getAll(areaId);
      return response.data;
    },
    enabled: !!areaId,
  });

  // Update table position mutation
  const updateTableMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Table> }) => {
      const response = await tablesAPI.update(id, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });

  // Delete table mutation
  const deleteTableMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await tablesAPI.delete(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      setSelectedTableId(null);
    },
  });

  const handleMouseDown = (tableId: string, e: React.MouseEvent) => {
    e.preventDefault();
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const tableX = (table.position_x || 0) * gridSize * zoom;
    const tableY = (table.position_y || 0) * gridSize * zoom;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setDraggingTable({
      id: tableId,
      offsetX: mouseX - tableX,
      offsetY: mouseY - tableY,
    });
    setIsDragging(true);
    setSelectedTableId(tableId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !draggingTable || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate new grid position
    const newX = Math.round((mouseX - draggingTable.offsetX) / (gridSize * zoom));
    const newY = Math.round((mouseY - draggingTable.offsetY) / (gridSize * zoom));

    // Constrain to grid boundaries
    const maxX = (area?.layout_width || 10) - 1;
    const maxY = (area?.layout_height || 10) - 1;
    const constrainedX = Math.max(0, Math.min(newX, maxX));
    const constrainedY = Math.max(0, Math.min(newY, maxY));

    // Update table position temporarily (visual feedback)
    const table = tables.find(t => t.id === draggingTable.id);
    if (table && (table.position_x !== constrainedX || table.position_y !== constrainedY)) {
      // Update immediately for smooth dragging
      queryClient.setQueryData(['tables', areaId], (old: Table[] | undefined) =>
        old?.map(t =>
          t.id === draggingTable.id
            ? { ...t, position_x: constrainedX, position_y: constrainedY }
            : t
        )
      );
    }
  };

  const handleMouseUp = () => {
    if (isDragging && draggingTable) {
      const table = tables.find(t => t.id === draggingTable.id);
      if (table) {
        // Save to backend
        updateTableMutation.mutate({
          id: table.id,
          data: {
            position_x: table.position_x,
            position_y: table.position_y,
          },
        });
      }
    }
    setIsDragging(false);
    setDraggingTable(null);
  };

  const handleRotateTable = () => {
    if (!selectedTableId) return;
    const table = tables.find(t => t.id === selectedTableId);
    if (!table) return;

    const newRotation = ((table.rotation || 0) + 90) % 360;
    updateTableMutation.mutate({
      id: table.id,
      data: { rotation: newRotation },
    });
  };

  const handleDeleteTable = () => {
    if (!selectedTableId) return;
    const table = tables.find(t => t.id === selectedTableId);
    if (!table) return;

    if (confirm(`Möchten Sie den Tisch "${table.table_number}" wirklich löschen?`)) {
      deleteTableMutation.mutate(table.id);
    }
  };

  const handleZoomIn = () => setZoom(Math.min(zoom + 0.2, 2));
  const handleZoomOut = () => setZoom(Math.max(zoom - 0.2, 0.5));

  const selectedTable = tables.find(t => t.id === selectedTableId);

  if (!area) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bavaria-blue"></div>
      </div>
    );
  }

  const canvasWidth = area.layout_width * gridSize * zoom;
  const canvasHeight = area.layout_height * gridSize * zoom;

  return (
    <div className="bg-white rounded-lg shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Grid className="h-6 w-6 text-bavaria-blue" />
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Tischlayout-Editor</h2>
            <p className="text-sm text-gray-600">{area.name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Toolbar */}
        <div className="w-64 border-r border-gray-200 p-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Ansicht</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Zoom: {Math.round(zoom * 100)}%</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleZoomOut}
                  className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center justify-center"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  onClick={handleZoomIn}
                  className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center justify-center"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`w-full px-3 py-2 rounded transition-colors flex items-center justify-center space-x-2 ${
                  showGrid
                    ? 'bg-bavaria-blue text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Grid className="h-4 w-4" />
                <span className="text-sm">Grid {showGrid ? 'aus' : 'ein'}blenden</span>
              </button>
            </div>
          </div>

          {selectedTable && (
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Tisch {selectedTable.table_number}
              </h3>
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  <div className="flex justify-between mb-1">
                    <span>Position:</span>
                    <span className="font-medium">
                      X: {selectedTable.position_x}, Y: {selectedTable.position_y}
                    </span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>Kapazität:</span>
                    <span className="font-medium">{selectedTable.capacity} Plätze</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>Rotation:</span>
                    <span className="font-medium">{selectedTable.rotation || 0}°</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>Status:</span>
                    <span className={`font-medium ${
                      selectedTable.status === 'available' ? 'text-bavaria-green' :
                      selectedTable.status === 'reserved' ? 'text-bavaria-yellow' :
                      'text-bavaria-red'
                    }`}>
                      {selectedTable.status === 'available' ? 'Frei' :
                       selectedTable.status === 'reserved' ? 'Reserviert' :
                       selectedTable.status === 'occupied' ? 'Besetzt' : 'Außer Betrieb'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={handleRotateTable}
                    className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
                  >
                    <RotateCw className="h-4 w-4" />
                    <span className="text-sm">Drehen (90°)</span>
                  </button>
                  <button
                    onClick={handleDeleteTable}
                    disabled={deleteTableMutation.isPending}
                    className="w-full px-3 py-2 bg-bavaria-red text-white rounded hover:bg-red-600 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="text-sm">Löschen</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Legende</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-bavaria-green rounded"></div>
                <span className="text-gray-600">Frei</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-bavaria-yellow rounded"></div>
                <span className="text-gray-600">Reserviert</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-bavaria-red rounded"></div>
                <span className="text-gray-600">Besetzt</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-400 rounded"></div>
                <span className="text-gray-600">Außer Betrieb</span>
              </div>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 p-6 bg-gray-50 overflow-auto">
          <div
            ref={canvasRef}
            className="relative bg-white border-2 border-gray-300 rounded-lg mx-auto"
            style={{
              width: `${canvasWidth}px`,
              height: `${canvasHeight}px`,
              cursor: isDragging ? 'grabbing' : 'default',
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Grid */}
            {showGrid && (
              <svg
                className="absolute inset-0 pointer-events-none"
                width={canvasWidth}
                height={canvasHeight}
              >
                {/* Vertical lines */}
                {Array.from({ length: area.layout_width + 1 }).map((_, i) => (
                  <line
                    key={`v-${i}`}
                    x1={i * gridSize * zoom}
                    y1={0}
                    x2={i * gridSize * zoom}
                    y2={canvasHeight}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                ))}
                {/* Horizontal lines */}
                {Array.from({ length: area.layout_height + 1 }).map((_, i) => (
                  <line
                    key={`h-${i}`}
                    x1={0}
                    y1={i * gridSize * zoom}
                    x2={canvasWidth}
                    y2={i * gridSize * zoom}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                ))}
              </svg>
            )}

            {/* Tables */}
            {tables.map(table => {
              const x = (table.position_x || 0) * gridSize * zoom;
              const y = (table.position_y || 0) * gridSize * zoom;
              const size = gridSize * zoom * 0.8;

              const statusColors = {
                available: 'bg-bavaria-green hover:bg-green-600',
                reserved: 'bg-bavaria-yellow hover:bg-yellow-600',
                occupied: 'bg-bavaria-red hover:bg-red-600',
                out_of_service: 'bg-gray-400 hover:bg-gray-500',
              };

              return (
                <div
                  key={table.id}
                  className={`absolute rounded-lg shadow-md transition-all cursor-move flex items-center justify-center text-white font-semibold ${
                    statusColors[table.status]
                  } ${selectedTableId === table.id ? 'ring-4 ring-bavaria-blue z-10' : ''}`}
                  style={{
                    left: `${x}px`,
                    top: `${y}px`,
                    width: `${size}px`,
                    height: `${size}px`,
                    transform: `rotate(${table.rotation || 0}deg)`,
                  }}
                  onMouseDown={(e) => handleMouseDown(table.id, e)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTableId(table.id);
                  }}
                >
                  <div className="text-center" style={{ transform: `rotate(-${table.rotation || 0}deg)` }}>
                    <div className="text-lg">{table.table_number}</div>
                    <div className="text-xs opacity-90">{table.capacity}P</div>
                  </div>
                </div>
              );
            })}

            {/* Empty state */}
            {tables.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <Grid className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Keine Tische vorhanden</p>
                  <p className="text-sm">Fügen Sie Tische über das Hauptmenü hinzu</p>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-4 p-4 bg-bavaria-blue bg-opacity-10 rounded-lg border border-bavaria-blue border-opacity-20">
            <h4 className="text-sm font-semibold text-bavaria-blue mb-2">Bedienung</h4>
            <ul className="text-xs text-gray-700 space-y-1">
              <li>• Klicken und ziehen Sie Tische, um sie zu verschieben</li>
              <li>• Klicken Sie auf einen Tisch, um ihn auszuwählen</li>
              <li>• Nutzen Sie die Toolbar, um Tische zu drehen oder zu löschen</li>
              <li>• Positionen werden automatisch im Raster ausgerichtet</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
