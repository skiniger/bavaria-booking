import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, Filter, Download, Calendar, Edit } from 'lucide-react';
import { employeesAPI, timeTrackingAPI } from '../../services/api';
import { TimeTracking, Employee } from '../../types';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { de } from 'date-fns/locale';

interface HoursOverviewProps {
  onEditTracking?: (trackingId: string) => void;
}

export const HoursOverview: React.FC<HoursOverviewProps> = ({ onEditTracking }) => {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>(
    format(startOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [dateTo, setDateTo] = useState<string>(
    format(endOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [filterPreset, setFilterPreset] = useState<string>('month');

  // Fetch employees
  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await employeesAPI.getAll();
      return response.data;
    },
  });

  // Fetch time trackings
  const { data: timeTrackings = [], isLoading: trackingsLoading } = useQuery<TimeTracking[]>({
    queryKey: ['timeTrackings'],
    queryFn: async () => {
      const response = await timeTrackingAPI.getAll();
      return response.data;
    },
  });

  // Apply preset filters
  const applyPreset = (preset: string) => {
    const today = new Date();
    setFilterPreset(preset);

    switch (preset) {
      case 'today':
        setDateFrom(format(today, 'yyyy-MM-dd'));
        setDateTo(format(today, 'yyyy-MM-dd'));
        break;
      case 'week':
        setDateFrom(format(startOfWeek(today, { locale: de }), 'yyyy-MM-dd'));
        setDateTo(format(endOfWeek(today, { locale: de }), 'yyyy-MM-dd'));
        break;
      case 'month':
        setDateFrom(format(startOfMonth(today), 'yyyy-MM-dd'));
        setDateTo(format(endOfMonth(today), 'yyyy-MM-dd'));
        break;
      case 'all':
        setDateFrom('');
        setDateTo('');
        break;
    }
  };

  // Filter and group trackings
  const filteredTrackings = useMemo(() => {
    let filtered = timeTrackings;

    // Filter by employee
    if (selectedEmployee) {
      filtered = filtered.filter(t => t.employee === selectedEmployee);
    }

    // Filter by date range
    if (dateFrom || dateTo) {
      filtered = filtered.filter(t => {
        const trackingDate = new Date(t.clock_in);
        const from = dateFrom ? new Date(dateFrom) : new Date('1970-01-01');
        const to = dateTo ? new Date(dateTo + 'T23:59:59') : new Date('2099-12-31');
        return isWithinInterval(trackingDate, { start: from, end: to });
      });
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) =>
      new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime()
    );
  }, [timeTrackings, selectedEmployee, dateFrom, dateTo]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalHours = filteredTrackings.reduce((sum, t) => sum + (t.total_hours || 0), 0);
    const totalBreakMinutes = filteredTrackings.reduce((sum, t) => sum + (t.break_minutes || 0), 0);
    const completedShifts = filteredTrackings.filter(t => t.clock_out).length;
    const activeShifts = filteredTrackings.filter(t => !t.clock_out).length;

    // Group by employee
    const byEmployee: Record<string, { hours: number; shifts: number }> = {};
    filteredTrackings.forEach(t => {
      if (!byEmployee[t.employee]) {
        byEmployee[t.employee] = { hours: 0, shifts: 0 };
      }
      byEmployee[t.employee].hours += t.total_hours || 0;
      byEmployee[t.employee].shifts += 1;
    });

    return {
      totalHours,
      totalBreakMinutes,
      completedShifts,
      activeShifts,
      byEmployee,
    };
  }, [filteredTrackings]);

  // Get employee details
  const getEmployeeDetails = (employeeId: string) => {
    return employees.find(e => e.id === employeeId);
  };

  // Export to CSV
  const handleExport = () => {
    const headers = ['Mitarbeiter', 'Personalnummer', 'Datum', 'Von', 'Bis', 'Pausenzeit (Min)', 'Arbeitszeit (Std)', 'Notizen'];
    const rows = filteredTrackings.map(t => {
      const emp = getEmployeeDetails(t.employee);
      return [
        `${emp?.first_name} ${emp?.last_name}`,
        emp?.employee_number || '',
        format(new Date(t.clock_in), 'dd.MM.yyyy', { locale: de }),
        format(new Date(t.clock_in), 'HH:mm', { locale: de }),
        t.clock_out ? format(new Date(t.clock_out), 'HH:mm', { locale: de }) : 'Aktiv',
        t.break_minutes || 0,
        t.total_hours?.toFixed(2) || '0.00',
        (t.notes || '').replace(/\n/g, ' '),
      ];
    });

    const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `arbeitsstunden_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
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
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Filter className="h-5 w-5 text-bavaria-blue" />
          <h3 className="text-lg font-semibold text-gray-800">Filter</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Employee Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mitarbeiter
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue focus:border-transparent"
            >
              <option value="">Alle Mitarbeiter</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Von
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setFilterPreset('custom');
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue focus:border-transparent"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bis
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setFilterPreset('custom');
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue focus:border-transparent"
            />
          </div>

          {/* Export Button */}
          <div className="flex items-end">
            <button
              onClick={handleExport}
              disabled={filteredTrackings.length === 0}
              className="w-full px-4 py-2 bg-bavaria-green text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Download className="h-5 w-5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Preset Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => applyPreset('today')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterPreset === 'today'
                ? 'bg-bavaria-blue text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Heute
          </button>
          <button
            onClick={() => applyPreset('week')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterPreset === 'week'
                ? 'bg-bavaria-blue text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Diese Woche
          </button>
          <button
            onClick={() => applyPreset('month')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterPreset === 'month'
                ? 'bg-bavaria-blue text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Dieser Monat
          </button>
          <button
            onClick={() => applyPreset('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterPreset === 'all'
                ? 'bg-bavaria-blue text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Alle
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-bavaria-blue">
          <p className="text-sm text-gray-600">Gesamtstunden</p>
          <p className="text-3xl font-bold text-gray-800">{statistics.totalHours.toFixed(2)}h</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-bavaria-green">
          <p className="text-sm text-gray-600">Abgeschlossene Schichten</p>
          <p className="text-3xl font-bold text-gray-800">{statistics.completedShifts}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-bavaria-yellow">
          <p className="text-sm text-gray-600">Aktive Schichten</p>
          <p className="text-3xl font-bold text-gray-800">{statistics.activeShifts}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-bavaria-red">
          <p className="text-sm text-gray-600">Gesamtpausenzeit</p>
          <p className="text-3xl font-bold text-gray-800">{Math.round(statistics.totalBreakMinutes / 60)}h</p>
        </div>
      </div>

      {/* Employee Summary (if no specific employee selected) */}
      {!selectedEmployee && Object.keys(statistics.byEmployee).length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Zusammenfassung nach Mitarbeiter</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(statistics.byEmployee).map(([employeeId, stats]) => {
                const emp = getEmployeeDetails(employeeId);
                return (
                  <div key={employeeId} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="h-10 w-10 rounded-full bg-bavaria-blue flex items-center justify-center text-white font-semibold">
                        {emp?.first_name?.[0]}{emp?.last_name?.[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">
                          {emp?.first_name} {emp?.last_name}
                        </p>
                        <p className="text-sm text-gray-600">{emp?.employee_number}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Schichten:</span>
                        <span className="font-semibold text-gray-800">{stats.shifts}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Stunden:</span>
                        <span className="font-semibold text-bavaria-green">{stats.hours.toFixed(2)}h</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Time Trackings Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            Zeiteinträge ({filteredTrackings.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          {filteredTrackings.length === 0 ? (
            <p className="text-gray-500 text-center py-12">
              Keine Zeiteinträge für den ausgewählten Zeitraum gefunden
            </p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mitarbeiter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Datum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Von
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bis
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pause
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Arbeitszeit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTrackings.map(tracking => {
                  const employee = getEmployeeDetails(tracking.employee);
                  const hasCorrection = tracking.notes?.includes('[KORREKTUR]');
                  return (
                    <tr key={tracking.id} className="hover:bg-gray-50">
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
                        {format(new Date(tracking.clock_in), 'dd.MM.yyyy', { locale: de })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(tracking.clock_in), 'HH:mm', { locale: de })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tracking.clock_out ? format(new Date(tracking.clock_out), 'HH:mm', { locale: de }) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tracking.break_minutes || 0} Min
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-bavaria-green">
                        {tracking.total_hours?.toFixed(2) || '0.00'}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          tracking.clock_out
                            ? 'bg-bavaria-green bg-opacity-10 text-bavaria-green'
                            : 'bg-bavaria-yellow bg-opacity-10 text-bavaria-yellow'
                        }`}>
                          {tracking.clock_out ? 'Abgeschlossen' : 'Aktiv'}
                        </span>
                        {hasCorrection && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-bavaria-yellow bg-opacity-10 text-bavaria-yellow">
                            Korrigiert
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => onEditTracking?.(tracking.id)}
                          className="text-bavaria-blue hover:text-blue-700 transition-colors"
                          title="Bearbeiten"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
