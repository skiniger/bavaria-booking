import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '../services/api';
import { Users, Calendar, CheckCircle, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardAPI.getStats().then((res) => res.data),
  });

  const { data: areaCapacities, isLoading: capacitiesLoading } = useQuery({
    queryKey: ['dashboard-capacity'],
    queryFn: () => dashboardAPI.getCapacityByArea().then((res) => res.data),
  });

  if (statsLoading || capacitiesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Lade Dashboard...</div>
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
        </div>
        <div className={`p-3 rounded-full ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
          <Icon className={`w-8 h-8 ${color}`} />
        </div>
      </div>
    </div>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-bavaria-green';
      case 'occupied':
        return 'bg-bavaria-red';
      case 'reserved':
        return 'bg-bavaria-yellow';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <button className="btn-primary">Neue Reservierung</button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Tische Gesamt"
          value={stats?.total_tables || 0}
          icon={Users}
          color="text-bavaria-blue"
        />
        <StatCard
          title="Verfügbar"
          value={stats?.available_tables || 0}
          icon={CheckCircle}
          color="text-bavaria-green"
        />
        <StatCard
          title="Reservierungen Heute"
          value={stats?.today_reservations || 0}
          icon={Calendar}
          color="text-bavaria-yellow"
        />
        <StatCard
          title="Auslastung"
          value={`${stats?.current_occupancy_rate || 0}%`}
          icon={TrendingUp}
          color="text-bavaria-red"
        />
      </div>

      {/* Bereichs-Tabs mit Kapazitätsanzeige */}
      <div className="card">
        <h2 className="text-2xl font-bold mb-6">Servicebereiche - Live-Kapazität</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {areaCapacities?.map((area) => (
            <div
              key={area.area_id}
              className="border-2 rounded-lg p-6"
              style={{ borderColor: area.color_code }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">{area.area_name}</h3>
                <span
                  className="px-3 py-1 rounded-full text-white text-sm font-medium"
                  style={{ backgroundColor: area.color_code }}
                >
                  {area.occupancy_rate}%
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Gesamtkapazität</span>
                  <span className="font-bold">{area.total_capacity} Plätze</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Tische</span>
                  <span className="font-bold">{area.total_tables}</span>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-bavaria-green mr-2"></div>
                      <span>Verfügbar</span>
                    </div>
                    <span className="font-medium">{area.available_tables}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-bavaria-red mr-2"></div>
                      <span>Besetzt</span>
                    </div>
                    <span className="font-medium">{area.occupied_tables}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-bavaria-yellow mr-2"></div>
                      <span>Reserviert</span>
                    </div>
                    <span className="font-medium">{area.reserved_tables}</span>
                  </div>
                </div>

                {/* Fortschrittsbalken */}
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="h-4 rounded-full transition-all duration-500"
                      style={{
                        width: `${area.occupancy_rate}%`,
                        backgroundColor: area.color_code,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legende */}
      <div className="card">
        <h3 className="text-lg font-bold mb-4">Farbstatus</h3>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-bavaria-green mr-2"></div>
            <span className="text-sm">Frei</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-bavaria-yellow mr-2"></div>
            <span className="text-sm">Reserviert</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-bavaria-red mr-2"></div>
            <span className="text-sm">Belegt</span>
          </div>
        </div>
      </div>
    </div>
  );
}
