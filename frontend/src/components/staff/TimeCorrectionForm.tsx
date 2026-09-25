import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, X, AlertTriangle, Save } from 'lucide-react';
import { employeesAPI, timeTrackingAPI } from '../../services/api';
import type { TimeTracking, Employee } from '../../types';
import { format, differenceInMinutes } from 'date-fns';
import { de } from 'date-fns/locale';

interface TimeCorrectionFormProps {
  onClose: () => void;
  trackingId?: string;
}

export const TimeCorrectionForm: React.FC<TimeCorrectionFormProps> = ({ onClose, trackingId }) => {
  const queryClient = useQueryClient();
  const [selectedTracking, setSelectedTracking] = useState<string>(trackingId || '');
  const [clockIn, setClockIn] = useState<string>('');
  const [clockOut, setClockOut] = useState<string>('');
  const [breakMinutes, setBreakMinutes] = useState<number>(0);
  const [correctionReason, setCorrectionReason] = useState<string>('');

  // Fetch employees
  const { data: employees = [] } = useQuery<Employee[]>({
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

  const tracking = timeTrackings.find(t => t.id === selectedTracking);
  const employee = tracking ? employees.find(e => e.id === tracking.employee) : null;

  // Initialize form when tracking is selected
  useEffect(() => {
    if (tracking) {
      setClockIn(tracking.check_in ? format(new Date(tracking.check_in), "yyyy-MM-dd'T'HH:mm") : '');
      setClockOut(tracking.check_out ? format(new Date(tracking.check_out), "yyyy-MM-dd'T'HH:mm") : '');
      setBreakMinutes(tracking.break_minutes || 0);
    }
  }, [tracking]);

  // Calculate new total hours
  const calculateNewHours = () => {
    if (!clockIn) return 0;
    const start = new Date(clockIn);
    const end = clockOut ? new Date(clockOut) : new Date();
    const totalMinutes = differenceInMinutes(end, start);
    const workMinutes = totalMinutes - (breakMinutes || 0);
    return (workMinutes / 60).toFixed(2);
  };

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<TimeTracking>) =>
      timeTrackingAPI.update(selectedTracking, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeTrackings'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTracking) {
      alert('Bitte wählen Sie einen Zeiteintrag aus');
      return;
    }

    if (!correctionReason.trim()) {
      alert('Bitte geben Sie einen Grund für die Korrektur an');
      return;
    }

    if (!clockIn) {
      alert('Einstempelzeit ist erforderlich');
      return;
    }

    // Validate that check_out is after check_in
    if (clockOut && new Date(clockOut) <= new Date(clockIn)) {
      alert('Ausstempelzeit muss nach der Einstempelzeit liegen');
      return;
    }

    updateMutation.mutate({
      check_in: new Date(clockIn).toISOString(),
      check_out: clockOut ? new Date(clockOut).toISOString() : undefined,
      break_minutes: breakMinutes || 0,
      correction_note: tracking?.correction_note
        ? `${tracking.correction_note}\n\n[KORREKTUR] ${correctionReason}`
        : `[KORREKTUR] ${correctionReason}`,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-bavaria-yellow bg-opacity-10">
          <div className="flex items-center space-x-3">
            <Edit className="h-6 w-6 text-bavaria-yellow" />
            <h2 className="text-xl font-semibold text-gray-800">
              Zeitkorrektur
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Warning Notice */}
          <div className="bg-yellow-50 border-l-4 border-bavaria-yellow p-4 mb-6">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-bavaria-yellow mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-1">
                  Wichtiger Hinweis
                </h3>
                <p className="text-sm text-gray-700">
                  Zeitkorrekturen werden protokolliert und sind nur für autorisierte Manager/Administratoren verfügbar.
                  Bitte geben Sie einen detaillierten Grund für die Korrektur an.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tracking Selection */}
            {!trackingId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zeiteintrag auswählen
                </label>
                <select
                  value={selectedTracking}
                  onChange={(e) => setSelectedTracking(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue focus:border-transparent"
                  disabled={trackingsLoading}
                >
                  <option value="">Zeiteintrag auswählen...</option>
                  {timeTrackings.map(t => {
                    const emp = employees.find(e => e.id === t.employee);
                    return (
                      <option key={t.id} value={t.id}>
                        {emp?.first_name} {emp?.last_name} - {format(new Date(t.check_in), 'dd.MM.yyyy HH:mm', { locale: de })}
                        {t.check_out && ` bis ${format(new Date(t.check_out), 'HH:mm', { locale: de })}`}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {tracking && employee && (
              <>
                {/* Employee Info */}
                <div className="bg-bavaria-blue bg-opacity-10 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full bg-bavaria-blue flex items-center justify-center text-white font-semibold text-lg">
                      {employee.first_name[0]}{employee.last_name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">
                        {employee.first_name} {employee.last_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {employee.employee_number}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Original Values */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold text-gray-800 mb-3">Ursprüngliche Werte</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Einstempelzeit</p>
                      <p className="font-medium text-gray-800">
                        {tracking.check_in && format(new Date(tracking.check_in), 'dd.MM.yyyy HH:mm', { locale: de })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Ausstempelzeit</p>
                      <p className="font-medium text-gray-800">
                        {tracking.check_out
                          ? format(new Date(tracking.check_out), 'dd.MM.yyyy HH:mm', { locale: de })
                          : 'Noch nicht ausgestempelt'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Pausenzeit</p>
                      <p className="font-medium text-gray-800">{tracking.break_minutes || 0} Minuten</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Arbeitszeit</p>
                      <p className="font-medium text-gray-800">{tracking.total_hours?.toFixed(2) || '0.00'}h</p>
                    </div>
                  </div>
                </div>

                {/* Corrected Values */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800">Korrigierte Werte</h3>

                  {/* Clock In */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Einstempelzeit *
                    </label>
                    <input
                      type="datetime-local"
                      value={clockIn}
                      onChange={(e) => setClockIn(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Clock Out */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ausstempelzeit
                    </label>
                    <input
                      type="datetime-local"
                      value={clockOut}
                      onChange={(e) => setClockOut(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leer lassen, wenn noch nicht ausgestempelt
                    </p>
                  </div>

                  {/* Break Minutes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pausenzeit (Minuten)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={breakMinutes}
                      onChange={(e) => setBreakMinutes(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue focus:border-transparent"
                    />
                  </div>

                  {/* New Total Hours */}
                  <div className="bg-bavaria-green bg-opacity-10 rounded-lg p-4 border-l-4 border-bavaria-green">
                    <p className="text-sm text-gray-600">Neue Arbeitszeit</p>
                    <p className="text-2xl font-bold text-bavaria-green">
                      {calculateNewHours()}h
                    </p>
                  </div>

                  {/* Correction Reason */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Grund für die Korrektur *
                    </label>
                    <textarea
                      value={correctionReason}
                      onChange={(e) => setCorrectionReason(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue focus:border-transparent resize-none"
                      placeholder="z.B. Vergessenes Ausstempeln, Systemfehler, nachträgliche Genehmigung..."
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Dieser Grund wird in den Notizen protokolliert
                    </p>
                  </div>
                </div>
              </>
            )}
          </form>
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={updateMutation.isPending || !selectedTracking || !correctionReason.trim()}
            className="px-6 py-2 bg-bavaria-yellow text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Save className="h-5 w-5" />
            <span>
              {updateMutation.isPending ? 'Wird gespeichert...' : 'Korrektur speichern'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
