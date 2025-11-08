import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reservationsAPI } from '../../services/api';
import type { Reservation } from '../../types';
import { X, User, Calendar, Clock, Users, CreditCard, MapPin, CheckCircle, XCircle, LogIn, LogOut, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import ExportButton from '../ui/ExportButton';

interface ReservationDetailsProps {
  reservation: Reservation | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReservationDetails({
  reservation,
  isOpen,
  onClose,
}: ReservationDetailsProps) {
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'confirm' | 'cancel' }) => {
      if (action === 'confirm') {
        return reservationsAPI.confirm(id);
      } else {
        return reservationsAPI.cancel(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      onClose();
    },
  });

  const checkInMutation = useMutation({
    mutationFn: (id: string) =>
      reservationsAPI.update(id, {
        status: 'checked_in',
        check_in_time: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: (id: string) =>
      reservationsAPI.update(id, {
        status: 'checked_out',
        check_out_time: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  if (!isOpen || !reservation) return null;

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending_confirmation':
        return { text: 'Bestätigung ausstehend', color: 'bg-bavaria-yellow', icon: Clock };
      case 'confirmed':
        return { text: 'Bestätigt', color: 'bg-bavaria-green', icon: CheckCircle };
      case 'checked_in':
        return { text: 'Eingecheckt', color: 'bg-bavaria-blue', icon: LogIn };
      case 'checked_out':
        return { text: 'Ausgecheckt', color: 'bg-gray-500', icon: LogOut };
      case 'cancelled_by_guest':
        return { text: 'Storniert (Gast)', color: 'bg-red-500', icon: XCircle };
      case 'cancelled_by_restaurant':
        return { text: 'Storniert (Restaurant)', color: 'bg-red-500', icon: XCircle };
      case 'completed':
        return { text: 'Abgeschlossen', color: 'bg-gray-600', icon: CheckCircle };
      case 'no_show':
        return { text: 'Nicht erschienen', color: 'bg-red-600', icon: AlertCircle };
      default:
        return { text: status, color: 'bg-gray-400', icon: Clock };
    }
  };

  const statusInfo = getStatusInfo(reservation.status);
  const StatusIcon = statusInfo.icon;

  const canCheckIn = ['confirmed'].includes(reservation.status);
  const canCheckOut = ['checked_in'].includes(reservation.status);
  const canConfirm = reservation.status === 'pending_confirmation';
  const canCancel = ['pending_confirmation', 'confirmed'].includes(reservation.status);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h2 className="text-2xl font-bold">Reservierungsdetails</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center justify-center">
            <div className={`inline-flex items-center px-6 py-3 rounded-full text-white ${statusInfo.color}`}>
              <StatusIcon className="w-5 h-5 mr-2" />
              <span className="font-bold">{statusInfo.text}</span>
            </div>
          </div>

          {/* Guest Information */}
          <div className="card bg-gray-50">
            <h3 className="font-bold text-lg mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Gast
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">{reservation.guest_name}</span>
              </div>
              {reservation.guest_detail && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Telefon:</span>
                    <span className="font-medium">{reservation.guest_detail.phone_number}</span>
                  </div>
                  {reservation.guest_detail.email && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">E-Mail:</span>
                      <span className="font-medium">{reservation.guest_detail.email}</span>
                    </div>
                  )}
                  {reservation.guest_detail.allergies && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg">
                      <div className="flex items-start">
                        <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                        <div>
                          <div className="font-medium text-red-600">Allergien</div>
                          <div className="text-sm text-red-700">{reservation.guest_detail.allergies}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  {reservation.guest_detail.special_requests && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <div className="font-medium text-blue-600 mb-1">Besondere Wünsche</div>
                      <div className="text-sm text-blue-700">{reservation.guest_detail.special_requests}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Reservation Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card bg-gray-50">
              <div className="flex items-center text-gray-600 mb-2">
                <Calendar className="w-4 h-4 mr-2" />
                <span className="text-sm">Datum</span>
              </div>
              <div className="font-bold text-lg">
                {format(parseISO(reservation.reservation_time), 'dd. MMMM yyyy', { locale: de })}
              </div>
            </div>

            <div className="card bg-gray-50">
              <div className="flex items-center text-gray-600 mb-2">
                <Clock className="w-4 h-4 mr-2" />
                <span className="text-sm">Uhrzeit</span>
              </div>
              <div className="font-bold text-lg">
                {format(parseISO(reservation.reservation_time), 'HH:mm')} Uhr
              </div>
            </div>

            <div className="card bg-gray-50">
              <div className="flex items-center text-gray-600 mb-2">
                <Users className="w-4 h-4 mr-2" />
                <span className="text-sm">Personen</span>
              </div>
              <div className="font-bold text-lg">{reservation.number_of_guests}</div>
            </div>

            <div className="card bg-gray-50">
              <div className="flex items-center text-gray-600 mb-2">
                <Clock className="w-4 h-4 mr-2" />
                <span className="text-sm">Dauer</span>
              </div>
              <div className="font-bold text-lg">{reservation.duration_minutes} Min</div>
            </div>
          </div>

          {/* Table Information */}
          {reservation.table_number && (
            <div className="card bg-bavaria-blue bg-opacity-10">
              <div className="flex items-center text-bavaria-blue mb-2">
                <MapPin className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">Tisch</span>
              </div>
              <div className="font-bold text-2xl text-bavaria-blue">
                {reservation.area_name} - Tisch {reservation.table_number}
              </div>
            </div>
          )}

          {/* Payment Information */}
          {reservation.payment_method && (
            <div className="card bg-gray-50">
              <div className="flex items-center text-gray-600 mb-2">
                <CreditCard className="w-4 h-4 mr-2" />
                <span className="text-sm">Zahlungsart</span>
              </div>
              <div className="font-medium">
                {reservation.payment_method === 'cash' && 'Bar'}
                {reservation.payment_method === 'ec' && 'EC-Karte'}
                {reservation.payment_method === 'credit_card' && 'Kreditkarte'}
                {reservation.payment_method === 'invoice' && 'Rechnung'}
              </div>
            </div>
          )}

          {/* Notes */}
          {reservation.notes && (
            <div className="card bg-gray-50">
              <div className="font-medium mb-2">Notizen</div>
              <div className="text-gray-700">{reservation.notes}</div>
            </div>
          )}

          {/* Check-in/Check-out Times */}
          {(reservation.check_in_time || reservation.check_out_time) && (
            <div className="grid grid-cols-2 gap-4">
              {reservation.check_in_time && (
                <div className="card bg-green-50">
                  <div className="flex items-center text-green-600 mb-2">
                    <LogIn className="w-4 h-4 mr-2" />
                    <span className="text-sm font-medium">Check-in</span>
                  </div>
                  <div className="font-medium">
                    {format(parseISO(reservation.check_in_time), 'dd.MM.yyyy HH:mm')}
                  </div>
                </div>
              )}
              {reservation.check_out_time && (
                <div className="card bg-gray-50">
                  <div className="flex items-center text-gray-600 mb-2">
                    <LogOut className="w-4 h-4 mr-2" />
                    <span className="text-sm font-medium">Check-out</span>
                  </div>
                  <div className="font-medium">
                    {format(parseISO(reservation.check_out_time), 'dd.MM.yyyy HH:mm')}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            {canCheckIn && (
              <button
                onClick={() => checkInMutation.mutate(reservation.id)}
                disabled={checkInMutation.isPending}
                className="btn-success flex items-center"
              >
                <LogIn className="w-4 h-4 mr-2" />
                {checkInMutation.isPending ? 'Wird eingecheckt...' : 'Check-in'}
              </button>
            )}

            {canCheckOut && (
              <button
                onClick={() => checkOutMutation.mutate(reservation.id)}
                disabled={checkOutMutation.isPending}
                className="btn-secondary flex items-center"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {checkOutMutation.isPending ? 'Wird ausgecheckt...' : 'Check-out'}
              </button>
            )}

            {canConfirm && (
              <button
                onClick={() =>
                  updateStatusMutation.mutate({ id: reservation.id, action: 'confirm' })
                }
                disabled={updateStatusMutation.isPending}
                className="btn-success flex items-center"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {updateStatusMutation.isPending ? 'Wird bestätigt...' : 'Bestätigen'}
              </button>
            )}

            {canCancel && (
              <button
                onClick={() =>
                  updateStatusMutation.mutate({ id: reservation.id, action: 'cancel' })
                }
                disabled={updateStatusMutation.isPending}
                className="btn-danger flex items-center"
              >
                <XCircle className="w-4 h-4 mr-2" />
                {updateStatusMutation.isPending ? 'Wird storniert...' : 'Stornieren'}
              </button>
            )}

            {/* Export Button */}
            <div className="ml-auto">
              <ExportButton
                onExportPDF={() => reservationsAPI.exportSinglePDF(reservation.id)}
                label="Als PDF exportieren"
                size="md"
                variant="secondary"
              />
            </div>
          </div>

          {/* Metadata */}
          <div className="text-xs text-gray-500 pt-4 border-t">
            <div>Erstellt: {format(parseISO(reservation.created_at), 'dd.MM.yyyy HH:mm')}</div>
            <div>Reservierungs-ID: {reservation.id}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
