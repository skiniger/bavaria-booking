import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@antml:parameter>
<parameter name="content">import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, TrendingUp, AlertTriangle, CheckCircle, Loader2, Sparkles } from 'lucide-react';
import { capacityRecommendationsAPI, areasAPI, analyticsAPI } from '../../services/api';
import { format, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import type { CapacityRecommendation, Area, PredictiveInsight } from '../../types';

export const CapacityManager: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  const queryClient = useQueryClient();

  // Fetch areas
  const { data: areas = [] } = useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      const response = await areasAPI.getAll();
      return response.data;
    },
  });

  // Auto-select first area
  if (!selectedAreaId && areas.length > 0) {
    setSelectedAreaId(areas[0].id);
  }

  // Fetch recommendations for selected date & area
  const { data: recommendations = [], isLoading: recommendationsLoading } = useQuery({
    queryKey: ['capacityRecommendations', selectedDate, selectedAreaId],
    queryFn: async () => {
      const response = await capacityRecommendationsAPI.getAll({
        date: selectedDate,
        area_id: selectedAreaId || undefined,
      });
      return response.data;
    },
    enabled: !!selectedAreaId,
  });

  // Fetch predictive insights
  const { data: insights = [] } = useQuery({
    queryKey: ['predictiveInsights'],
    queryFn: async () => {
      const response = await analyticsAPI.getPredictiveInsights(3);
      return response.data;
    },
  });

  // Generate recommendations
  const generateRecommendationsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAreaId) throw new Error('No area selected');
      return await capacityRecommendationsAPI.generate(selectedDate, selectedAreaId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capacityRecommendations'] });
    },
  });

  // Apply recommendation
  const applyRecommendationMutation = useMutation({
    mutationFn: async (id: string) => {
      return await capacityRecommendationsAPI.apply(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capacityRecommendations'] });
    },
  });

  // Recommendation type badge color
  const getRecommendationColor = (type: string) => {
    switch (type) {
      case 'increase_staff':
        return 'bg-bavaria-red text-white';
      case 'reduce_staff':
        return 'bg-bavaria-blue text-white';
      case 'optimize_tables':
        return 'bg-bavaria-yellow text-white';
      case 'accept_more_reservations':
        return 'bg-bavaria-green text-white';
      case 'limit_reservations':
        return 'bg-orange-500 text-white';
      case 'normal_operations':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-300 text-gray-800';
    }
  };

  // Occupancy level color
  const getOccupancyColor = (occupancy: number) => {
    if (occupancy >= 90) return 'text-bavaria-red';
    if (occupancy >= 75) return 'text-bavaria-yellow';
    if (occupancy >= 50) return 'text-bavaria-green';
    return 'text-gray-500';
  };

  // Quick date shortcuts
  const quickDates = [
    { label: 'Heute', date: format(new Date(), 'yyyy-MM-dd') },
    { label: 'Morgen', date: format(addDays(new Date(), 1), 'yyyy-MM-dd') },
    { label: 'In 2 Tagen', date: format(addDays(new Date(), 2), 'yyyy-MM-dd') },
    { label: 'In 3 Tagen', date: format(addDays(new Date(), 3), 'yyyy-MM-dd') },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kapazitätsmanager</h1>
        <p className="text-gray-500 mt-1">KI-gestützte Optimierung & Empfehlungen</p>
      </div>

      {/* Filters & Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Area Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Servicebereich
            </label>
            <select
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bavaria-blue"
            >
              {areas.map((area: Area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Datum
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bavaria-blue"
            />
          </div>

          {/* Generate Button */}
          <div className="flex items-end">
            <button
              onClick={() => generateRecommendationsMutation.mutate()}
              disabled={generateRecommendationsMutation.isPending || !selectedAreaId}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-bavaria-blue text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {generateRecommendationsMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Empfehlungen generieren
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Date Buttons */}
        <div className="flex gap-2 mt-4">
          {quickDates.map((quick) => (
            <button
              key={quick.date}
              onClick={() => setSelectedDate(quick.date)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                selectedDate === quick.date
                  ? 'bg-bavaria-blue text-white border-bavaria-blue'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {quick.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recommendations List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Empfehlungen für {format(new Date(selectedDate), 'dd. MMMM yyyy', { locale: de })}
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {recommendationsLoading ? (
            <div className="p-12 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-bavaria-blue" />
            </div>
          ) : recommendations.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Keine Empfehlungen vorhanden</p>
              <p className="text-sm text-gray-400 mt-2">
                Klicken Sie auf "Empfehlungen generieren", um KI-Vorschläge zu erhalten
              </p>
            </div>
          ) : (
            recommendations.map((rec: CapacityRecommendation) => (
              <div key={rec.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Time Slot & Occupancy */}
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {format(new Date(`2000-01-01T${rec.time_slot}`), 'HH:mm', { locale: de })} Uhr
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-gray-400" />
                        <span className={`font-semibold ${getOccupancyColor(Number(rec.predicted_occupancy))}`}>
                          {Number(rec.predicted_occupancy).toFixed(1)}% Auslastung
                        </span>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getRecommendationColor(
                          rec.recommendation_type
                        )}`}
                      >
                        {rec.recommendation_type_display || rec.recommendation_type}
                      </span>
                    </div>

                    {/* Recommendation Text */}
                    <p className="text-gray-700 mb-3">{rec.recommendation_text}</p>

                    {/* Confidence Score */}
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-bavaria-blue h-2 rounded-full"
                            style={{ width: `${rec.confidence_score}%` }}
                          />
                        </div>
                        <span>{Number(rec.confidence_score).toFixed(0)}% Konfidenz</span>
                      </div>
                    </div>
                  </div>

                  {/* Apply Button */}
                  <div>
                    {rec.is_applied ? (
                      <div className="flex items-center gap-2 text-bavaria-green">
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">Angewendet</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => applyRecommendationMutation.mutate(rec.id)}
                        disabled={applyRecommendationMutation.isPending}
                        className="px-4 py-2 bg-bavaria-green text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm font-medium"
                      >
                        {applyRecommendationMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Anwenden'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Predictive Insights Summary */}
      {insights.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow p-6 border border-purple-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-purple-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Vorausschauende Insights (nächste 3 Tage)</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {insights.slice(0, 3).map((insight: PredictiveInsight, index: number) => (
                  <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-500">
                        {format(new Date(insight.date), 'dd.MM', { locale: de })}
                      </span>
                      <span className={`text-lg font-bold ${getOccupancyColor(Number(insight.predicted_value))}`}>
                        {Number(insight.predicted_value).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">{insight.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
