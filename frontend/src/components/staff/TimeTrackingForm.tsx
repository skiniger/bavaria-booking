import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, LogIn, LogOut, X, Coffee } from 'lucide-react';
import { timeTrackingAPI, employeesAPI } from '../../services/api';
import { Employee, TimeTracking } from '../../types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface TimeTrackingFormProps {
  onClose: () => void;
  employeeId?: string;
}

export const TimeTrackingForm: React.FC<TimeTrackingFormProps> = ({ onClose, employeeId }) => {
  const queryClient = useQueryClient();
  const [selectedEmployee, setSelectedEmployee] = useState<string>(employeeId || '');
  const [breakMinutes, setBreakMinutes] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  // Fetch employees
  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await employeesAPI.getAll();
      return response.data;
    },
  });

  // Fetch current time trackings
  const { data: timeTrackings = [] } = useQuery<TimeTracking[]>({
    queryKey: ['timeTrackings'],
    queryFn: async () => {
      const response = await timeTrackingAPI.getAll();
      return response.data;
    },
  });

  // Check if employee is currently clocked in
  const currentTracking = timeTrackings.find(
    t => t.employee === selectedEmployee && t.clock_in && !t.clock_out
  );

  // Clock in mutation
  const clockInMutation = useMutation({
    mutationFn: (data: Partial<TimeTracking>) => timeTrackingAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeTrackings'] });
      setNotes('');
      onClose();
    },
  });

  // Clock out mutation
  const clockOutMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TimeTracking> }) =>
      timeTrackingAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeTrackings'] });
      setBreakMinutes(0);
      setNotes('');
      onClose();
    },
  });

  const handleClockIn = () => {
    if (!selectedEmployee) {
      alert('Bitte wählen Sie einen Mitarbeiter aus');
      return;
    }

    clockInMutation.mutate({
      employee: selectedEmployee,
      clock_in: new Date().toISOString(),
      notes: notes || undefined,
    });
  };

  const handleClockOut = () => {
    if (!currentTracking) return;

    clockOutMutation.mutate({
      id: currentTracking.id,
      data: {
        clock_out: new Date().toISOString(),
        break_minutes: breakMinutes || 0,
        notes: notes || currentTracking.notes,
      },
    });
  };

  const selectedEmployeeData = employees.find(e => e.id === selectedEmployee);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Clock className="h-6 w-6 text-bavaria-blue" />
            <h2 className="text-xl font-semibold text-gray-800">
              {currentTracking ? 'Ausstempeln' : 'Einstempeln'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Employee Selection */}
          {!employeeId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mitarbeiter
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue focus:border-transparent"
                disabled={employeesLoading || !!currentTracking}
              >
                <option value="">Mitarbeiter auswählen...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_number})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Current Employee Info */}
          {selectedEmployeeData && (
            <div className="bg-bavaria-blue bg-opacity-10 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 rounded-full bg-bavaria-blue flex items-center justify-center text-white font-semibold text-lg">
                  {selectedEmployeeData.first_name[0]}{selectedEmployeeData.last_name[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">
                    {selectedEmployeeData.first_name} {selectedEmployeeData.last_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedEmployeeData.employee_number} • {
                      selectedEmployeeData.role === 'admin' ? 'Administrator' :
                      selectedEmployeeData.role === 'manager' ? 'Manager' : 'Mitarbeiter'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Current Tracking Info */}
          {currentTracking && (
            <div className="bg-bavaria-green bg-opacity-10 rounded-lg p-4 border-l-4 border-bavaria-green">
              <div className="flex items-center space-x-2 mb-2">
                <LogIn className="h-5 w-5 text-bavaria-green" />
                <p className="font-semibold text-gray-800">Eingestempelt seit</p>
              </div>
              <p className="text-2xl font-bold text-bavaria-green">
                {format(new Date(currentTracking.clock_in), 'HH:mm', { locale: de })} Uhr
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {format(new Date(currentTracking.clock_in), 'EEEE, dd. MMMM yyyy', { locale: de })}
              </p>
            </div>
          )}

          {/* Break Minutes (only for clock out) */}
          {currentTracking && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center space-x-2">
                  <Coffee className="h-4 w-4" />
                  <span>Pausenzeit (Minuten)</span>
                </div>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue focus:border-transparent"
                placeholder="z.B. 30"
              />
              <p className="text-xs text-gray-500 mt-1">
                Geben Sie die gesamte Pausenzeit in Minuten an
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notizen (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue focus:border-transparent resize-none"
              placeholder="z.B. Überstunden, besondere Vorkommnisse..."
            />
          </div>

          {/* Current Time Display */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Aktuelle Zeit</p>
            <p className="text-3xl font-bold text-gray-800">
              {format(new Date(), 'HH:mm:ss', { locale: de })}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {format(new Date(), 'EEEE, dd. MMMM yyyy', { locale: de })}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Abbrechen
          </button>
          {currentTracking ? (
            <button
              onClick={handleClockOut}
              disabled={clockOutMutation.isPending}
              className="px-6 py-2 bg-bavaria-red text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <LogOut className="h-5 w-5" />
              <span>
                {clockOutMutation.isPending ? 'Wird ausgestempelt...' : 'Ausstempeln'}
              </span>
            </button>
          ) : (
            <button
              onClick={handleClockIn}
              disabled={clockInMutation.isPending || !selectedEmployee}
              className="px-6 py-2 bg-bavaria-green text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <LogIn className="h-5 w-5" />
              <span>
                {clockInMutation.isPending ? 'Wird eingestempelt...' : 'Einstempeln'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
