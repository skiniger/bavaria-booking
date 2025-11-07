import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, MapPin, Save } from 'lucide-react';
import { openingHoursAPI } from '../../services/api';
import { areasAPI } from '../../services/api';
import { OpeningHours, Area } from '../../types';

const WEEKDAYS = [
  { value: 0, label: 'Montag' },
  { value: 1, label: 'Dienstag' },
  { value: 2, label: 'Mittwoch' },
  { value: 3, label: 'Donnerstag' },
  { value: 4, label: 'Freitag' },
  { value: 5, label: 'Samstag' },
  { value: 6, label: 'Sonntag' },
];

export const OpeningHoursManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedArea, setSelectedArea] = useState<string>('');

  // Fetch areas
  const { data: areas = [] } = useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      const response = await areasAPI.getAll();
      return response.data;
    },
  });

  // Fetch opening hours
  const { data: openingHours = [], isLoading } = useQuery({
    queryKey: ['openingHours', selectedArea],
    queryFn: async () => {
      const response = await openingHoursAPI.getAll(selectedArea || undefined);
      return response.data;
    },
    enabled: !!selectedArea,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<OpeningHours> & { id?: string }) => {
      if (data.id) {
        return await openingHoursAPI.update(data.id, data);
      } else {
        return await openingHoursAPI.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['openingHours'] });
    },
  });

  const handleSave = (weekday: number, isClosed: boolean, openTime?: string, closeTime?: string) => {
    const existing = openingHours.find(oh => oh.weekday === weekday);

    const data: Partial<OpeningHours> & { id?: string } = {
      area: selectedArea,
      weekday,
      is_closed: isClosed,
      open_time: isClosed ? undefined : openTime,
      close_time: isClosed ? undefined : closeTime,
    };

    if (existing) {
      data.id = existing.id;
    }

    saveMutation.mutate(data);
  };

  const getOpeningHour = (weekday: number) => {
    return openingHours.find(oh => oh.weekday === weekday);
  };

  if (!selectedArea) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg mb-4">Wählen Sie einen Servicebereich aus</p>
        <select
          value={selectedArea}
          onChange={(e) => setSelectedArea(e.target.value)}
          className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue"
        >
          <option value="">Servicebereich wählen...</option>
          {areas.map(area => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const selectedAreaData = areas.find(a => a.id === selectedArea);

  return (
    <div className="space-y-6">
      {/* Area Selector */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MapPin className="h-6 w-6 text-bavaria-blue" />
            <h3 className="text-lg font-semibold text-gray-800">Servicebereich</h3>
          </div>
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue"
          >
            {areas.map(area => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Opening Hours Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            Öffnungszeiten für {selectedAreaData?.name}
          </h3>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bavaria-blue"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {WEEKDAYS.map(({ value, label }) => {
                const oh = getOpeningHour(value);
                const [isClosed, setIsClosed] = useState(oh?.is_closed ?? false);
                const [openTime, setOpenTime] = useState(oh?.open_time || '11:00');
                const [closeTime, setCloseTime] = useState(oh?.close_time || '22:00');

                return (
                  <div
                    key={value}
                    className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="w-32 font-medium text-gray-800">{label}</div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`closed-${value}`}
                        checked={isClosed}
                        onChange={(e) => setIsClosed(e.target.checked)}
                        className="h-4 w-4 text-bavaria-blue focus:ring-bavaria-blue border-gray-300 rounded"
                      />
                      <label htmlFor={`closed-${value}`} className="text-sm text-gray-700">
                        Geschlossen
                      </label>
                    </div>

                    {!isClosed && (
                      <>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">Von:</span>
                          <input
                            type="time"
                            value={openTime}
                            onChange={(e) => setOpenTime(e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-bavaria-blue"
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">Bis:</span>
                          <input
                            type="time"
                            value={closeTime}
                            onChange={(e) => setCloseTime(e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-bavaria-blue"
                          />
                        </div>
                      </>
                    )}

                    <button
                      onClick={() => handleSave(value, isClosed, openTime, closeTime)}
                      disabled={saveMutation.isPending}
                      className="ml-auto px-4 py-2 bg-bavaria-blue text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
                    >
                      <Save className="h-4 w-4" />
                      <span>Speichern</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="bg-bavaria-blue bg-opacity-10 rounded-lg p-4 border-l-4 border-bavaria-blue">
        <div className="flex items-start space-x-3">
          <Clock className="h-5 w-5 text-bavaria-blue mt-0.5" />
          <div className="text-sm text-gray-700">
            <p className="font-semibold mb-1">Hinweis</p>
            <p>
              Öffnungszeiten werden pro Servicebereich und Wochentag konfiguriert. Änderungen
              werden sofort nach dem Speichern wirksam.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
