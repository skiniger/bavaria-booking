import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, Users, Calendar, DollarSign, AlertCircle, Lightbulb, RefreshCw, Loader2 } from 'lucide-react';
import { analyticsSnapshotsAPI, analyticsAPI } from '../../services/api';
import { format, subDays } from 'date-fns';
import { de } from 'date-fns/locale';
import type { OccupancyTrend } from '../../types';

const COLORS = ['#0066B2', '#10B981', '#F59E0B', '#EF4444'];

export const AnalyticsDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 30>(7);

  // Fetch today's snapshot
  const { data: todaySnapshot } = useQuery({
    queryKey: ['analyticsSnapshot', 'today'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const response = await analyticsSnapshotsAPI.getAll({
        from_date: today,
        to_date: today,
      });
      return response.data[0] || null;
    },
  });

  // Fetch occupancy trends
  const { data: occupancyTrends = [], isLoading: trendsLoading } = useQuery({
    queryKey: ['occupancyTrends', selectedPeriod],
    queryFn: async () => {
      const response = await analyticsAPI.getOccupancyTrends(selectedPeriod);
      return response.data;
    },
  });

  // Fetch recent snapshots
  const { data: recentSnapshots = [] } = useQuery({
    queryKey: ['analyticsSnapshots', selectedPeriod],
    queryFn: async () => {
      const toDate = format(new Date(), 'yyyy-MM-dd');
      const fromDate = format(subDays(new Date(), selectedPeriod), 'yyyy-MM-dd');
      const response = await analyticsSnapshotsAPI.getAll({ from_date: fromDate, to_date: toDate });
      return response.data;
    },
  });

  // Generate today's snapshot
  const generateSnapshotMutation = useMutation({
    mutationFn: async () => {
      return await analyticsSnapshotsAPI.generateToday();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyticsSnapshot'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSnapshots'] });
    },
  });

  // Stats cards
  const stats = [
    {
      label: 'Reservierungen (Heute)',
      value: todaySnapshot?.total_reservations || 0,
      icon: Calendar,
      color: 'text-bavaria-blue',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Durchschn. Auslastung',
      value: `${todaySnapshot?.average_occupancy_rate || 0}%`,
      icon: TrendingUp,
      color: 'text-bavaria-green',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Bediente Gäste',
      value: todaySnapshot?.total_guests_served || 0,
      icon: Users,
      color: 'text-bavaria-yellow',
      bgColor: 'bg-yellow-50',
    },
    {
      label: 'Umsatz (Heute)',
      value: `${todaySnapshot?.total_revenue || 0} €`,
      icon: DollarSign,
      color: 'text-bavaria-green',
      bgColor: 'bg-green-50',
    },
  ];

  // Prepare chart data
  const trendChartData = occupancyTrends.map((trend: OccupancyTrend) => ({
    date: format(new Date(trend.date), 'dd.MM', { locale: de }),
    auslastung: Number(trend.occupancy_rate),
    reservierungen: trend.total_reservations,
    gäste: trend.total_guests,
  }));

  // Reservation status pie data
  const reservationStatusData = [
    { name: 'Bestätigt', value: todaySnapshot?.confirmed_reservations || 0 },
    { name: 'Storniert', value: todaySnapshot?.cancelled_reservations || 0 },
    { name: 'No-Show', value: todaySnapshot?.no_show_count || 0 },
  ];

  // Calculate comparison metrics
  const getComparisonMetrics = () => {
    if (recentSnapshots.length < 2) return null;

    const today = recentSnapshots[0];
    const yesterday = recentSnapshots[1];

    return {
      reservations: {
        current: today.total_reservations,
        previous: yesterday.total_reservations,
        change: ((today.total_reservations - yesterday.total_reservations) / yesterday.total_reservations * 100).toFixed(1),
      },
      occupancy: {
        current: Number(today.average_occupancy_rate),
        previous: Number(yesterday.average_occupancy_rate),
        change: (Number(today.average_occupancy_rate) - Number(yesterday.average_occupancy_rate)).toFixed(1),
      },
    };
  };

  const comparison = getComparisonMetrics();

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-500 mt-1">KI-gestützte Auslastungsanalyse und Insights</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(Number(e.target.value) as 7 | 30)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bavaria-blue"
          >
            <option value={7}>Letzte 7 Tage</option>
            <option value={30}>Letzte 30 Tage</option>
          </select>
          <button
            onClick={() => generateSnapshotMutation.mutate()}
            disabled={generateSnapshotMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-bavaria-blue text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {generateSnapshotMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <RefreshCw className="h-5 w-5" />
            )}
            Heute aktualisieren
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  {comparison && index < 2 && (
                    <p className={`text-sm mt-2 ${
                      Number(index === 0 ? comparison.reservations.change : comparison.occupancy.change) >= 0
                        ? 'text-bavaria-green'
                        : 'text-bavaria-red'
                    }`}>
                      {Number(index === 0 ? comparison.reservations.change : comparison.occupancy.change) >= 0 ? '+' : ''}
                      {index === 0 ? comparison.reservations.change : comparison.occupancy.change}% vs. gestern
                    </p>
                  )}
                </div>
                <div className={`${stat.bgColor} p-3 rounded-full`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Occupancy Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Auslastungstrend</h2>
          {trendsLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-bavaria-blue" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="auslastung"
                  stroke="#0066B2"
                  strokeWidth={2}
                  name="Auslastung (%)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="reservierungen"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="Reservierungen"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Reservation Status Pie */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Reservierungsstatus</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reservationStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: { name?: string; percent?: number }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {reservationStatusData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Guests Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Gästeentwicklung</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={trendChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="gäste" fill="#0066B2" name="Anzahl Gäste" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* KI Insights */}
      {todaySnapshot?.ai_insights && todaySnapshot.ai_insights.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow p-6 border border-blue-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Lightbulb className="h-6 w-6 text-bavaria-blue" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">KI-Insights & Empfehlungen</h2>
              <ul className="space-y-2">
                {todaySnapshot.ai_insights.map((insight: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-bavaria-blue flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
