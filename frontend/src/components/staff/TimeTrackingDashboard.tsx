import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, Users, Calendar, TrendingUp } from 'lucide-react';
import { api } from '../../services/api';
import { TimeTracking, Employee } from '../../types';
import { format, differenceInHours, differenceInMinutes, startOfDay, endOfDay } from 'date-fns';
import { de } from 'date-fns/locale';

interface TimeTrackingDashboardProps {
  onViewDetails?: (employeeId: string) => void;
}

export const TimeTrackingDashboard: React.FC<TimeTrackingDashboardProps> = ({ onViewDetails }) => {
  // Fetch current time trackings
  const { data: timeTrackings = [], isLoading: trackingsLoading } = useQuery<TimeTracking[]>({
    queryKey: ['timeTrackings'],
    queryFn: api.timeTracking.getAll,
  });

  // Fetch employees
  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: api.employees.getAll,
  });

  // Calculate statistics
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);

  // Currently clocked in employees
  const currentlyWorking = timeTrackings.filter(
    t => t.clock_in && !t.clock_out
  );

  // Today's time trackings
  const todayTrackings = timeTrackings.filter(
    t => new Date(t.clock_in) >= todayStart && new Date(t.clock_in) <= todayEnd
  );

  // Calculate total hours today
  const totalHoursToday = todayTrackings.reduce((sum, t) => {
    if (t.clock_in && t.clock_out) {
      const hours = differenceInHours(new Date(t.clock_out), new Date(t.clock_in));
      return sum + hours;
    }
    return sum;
  }, 0);

  // Calculate average hours per employee today
  const uniqueEmployeesToday = new Set(todayTrackings.map(t => t.employee));
  const avgHoursToday = uniqueEmployeesToday.size > 0
    ? (totalHoursToday / uniqueEmployeesToday.size).toFixed(1)
    : '0.0';

  // Get employee details
  const getEmployeeDetails = (employeeId: string) => {
    return employees.find(e => e.id === employeeId);
  };

  // Calculate work duration
  const calculateDuration = (clockIn: string, clockOut?: string) => {
    const start = new Date(clockIn);
    const end = clockOut ? new Date(clockOut) : new Date();
    const hours = differenceInHours(end, start);
    const minutes = differenceInMinutes(end, start) % 60;
    return `${hours}h ${minutes}m`;
  };

  if (trackingsLoading || employeesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bavaria-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Currently Working */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-bavaria-green">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Aktuell im Dienst</p>
              <p className="text-3xl font-bold text-gray-800">{currentlyWorking.length}</p>
            </div>
            <Users className="h-12 w-12 text-bavaria-green" />
          </div>
        </div>

        {/* Today's Shifts */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-bavaria-blue">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Schichten heute</p>
              <p className="text-3xl font-bold text-gray-800">{todayTrackings.length}</p>
            </div>
            <Calendar className="h-12 w-12 text-bavaria-blue" />
          </div>
        </div>

        {/* Total Hours Today */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-bavaria-yellow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Gesamtstunden heute</p>
              <p className="text-3xl font-bold text-gray-800">{totalHoursToday}h</p>
            </div>
            <Clock className="h-12 w-12 text-bavaria-yellow" />
          </div>
        </div>

        {/* Average Hours */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-bavaria-red">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ø Stunden/MA heute</p>
              <p className="text-3xl font-bold text-gray-800">{avgHoursToday}h</p>
            </div>
            <TrendingUp className="h-12 w-12 text-bavaria-red" />
          </div>
        </div>
      </div>

      {/* Currently Working Employees */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            Aktuell im Dienst ({currentlyWorking.length})
          </h3>
        </div>
        <div className="p-6">
          {currentlyWorking.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Derzeit sind keine Mitarbeiter eingestempelt
            </p>
          ) : (
            <div className="space-y-3">
              {currentlyWorking.map(tracking => {
                const employee = getEmployeeDetails(tracking.employee);
                return (
                  <div
                    key={tracking.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => onViewDetails?.(tracking.employee)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 rounded-full bg-bavaria-blue flex items-center justify-center text-white font-semibold">
                        {employee?.first_name?.[0]}{employee?.last_name?.[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">
                          {employee?.first_name} {employee?.last_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {employee?.employee_number} • {employee?.role === 'admin' ? 'Administrator' : employee?.role === 'manager' ? 'Manager' : 'Mitarbeiter'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Eingestempelt um</p>
                      <p className="font-semibold text-gray-800">
                        {format(new Date(tracking.clock_in), 'HH:mm', { locale: de })} Uhr
                      </p>
                      <p className="text-sm text-bavaria-green font-medium">
                        {calculateDuration(tracking.clock_in)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Today's Completed Shifts */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            Abgeschlossene Schichten heute ({todayTrackings.filter(t => t.clock_out).length})
          </h3>
        </div>
        <div className="p-6">
          {todayTrackings.filter(t => t.clock_out).length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Heute wurden noch keine Schichten abgeschlossen
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mitarbeiter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Von
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bis
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dauer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pause
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Arbeitszeit
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {todayTrackings
                    .filter(t => t.clock_out)
                    .sort((a, b) => new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime())
                    .map(tracking => {
                      const employee = getEmployeeDetails(tracking.employee);
                      return (
                        <tr
                          key={tracking.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => onViewDetails?.(tracking.employee)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-bavaria-blue flex items-center justify-center text-white text-sm font-semibold">
                                {employee?.first_name?.[0]}{employee?.last_name?.[0]}
                              </div>
                              <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900">
                                  {employee?.first_name} {employee?.last_name}
                                </p>
                                <p className="text-sm text-gray-500">{employee?.employee_number}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {format(new Date(tracking.clock_in), 'HH:mm', { locale: de })} Uhr
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {tracking.clock_out && format(new Date(tracking.clock_out), 'HH:mm', { locale: de })} Uhr
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {tracking.clock_out && calculateDuration(tracking.clock_in, tracking.clock_out)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {tracking.break_minutes || 0} Min
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-bavaria-green">
                            {tracking.total_hours?.toFixed(2) || '0.00'}h
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
