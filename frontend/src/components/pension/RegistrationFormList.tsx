import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { registrationFormsAPI } from '../../services/api';
import type { RegistrationForm } from '../../types';
import { FileText, Search, Filter, Eye, Download, LogIn, LogOut, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

interface RegistrationFormListProps {
  onViewDetails: (form: RegistrationForm) => void;
  onCheckIn: (form: RegistrationForm) => void;
  onCheckOut: (form: RegistrationForm) => void;
}

export default function RegistrationFormList({
  onViewDetails,
  onCheckIn,
  onCheckOut,
}: RegistrationFormListProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: forms = [], isLoading } = useQuery({
    queryKey: ['registration-forms', statusFilter, dateFrom, dateTo],
    queryFn: () => {
      const params: { status?: string; date_from?: string; date_to?: string } = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      return registrationFormsAPI.getAll(params).then((res) => res.data);
    },
  });

  const exportMutation = useMutation({
    mutationFn: (id: string) => registrationFormsAPI.exportToCity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registration-forms'] });
    },
  });

  const filteredForms = forms.filter((form) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      form.guest_name?.toLowerCase().includes(searchLower) ||
      form.room_number?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'draft':
        return { text: 'Entwurf', color: 'bg-gray-500' };
      case 'confirmed':
        return { text: 'Bestätigt', color: 'bg-bavaria-yellow' };
      case 'checked_in':
        return { text: 'Eingecheckt', color: 'bg-bavaria-green' };
      case 'checked_out':
        return { text: 'Ausgecheckt', color: 'bg-bavaria-blue' };
      case 'cancelled':
        return { text: 'Storniert', color: 'bg-red-500' };
      default:
        return { text: status, color: 'bg-gray-400' };
    }
  };

  const getPaymentStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { text: 'Ausstehend', color: 'text-red-600' };
      case 'paid':
        return { text: 'Bezahlt', color: 'text-green-600' };
      case 'partially_paid':
        return { text: 'Teilweise bezahlt', color: 'text-yellow-600' };
      default:
        return { text: status, color: 'text-gray-600' };
    }
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="text-center py-12 text-gray-500">Lade Meldescheine...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 flex items-center">
              <Search className="w-4 h-4 mr-1" />
              Suche
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input"
              placeholder="Name oder Zimmernummer..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 flex items-center">
              <Filter className="w-4 h-4 mr-1" />
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
            >
              <option value="all">Alle</option>
              <option value="draft">Entwurf</option>
              <option value="confirmed">Bestätigt</option>
              <option value="checked_in">Eingecheckt</option>
              <option value="checked_out">Ausgecheckt</option>
              <option value="cancelled">Storniert</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Von Datum</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Bis Datum</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          {filteredForms.length} Meldeschein{filteredForms.length !== 1 ? 'e' : ''}{' '}
          gefunden
        </p>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filteredForms.length === 0 && (
          <div className="card text-center py-12 text-gray-500">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Keine Meldescheine gefunden</p>
          </div>
        )}

        {filteredForms.map((form) => {
          const statusInfo = getStatusInfo(form.status);
          const paymentInfo = getPaymentStatusInfo(form.payment_status);
          const canCheckIn = form.status === 'confirmed';
          const canCheckOut = form.status === 'checked_in';
          const canExport = ['checked_in', 'checked_out'].includes(form.status) && !form.exported_to_city;

          return (
            <div
              key={form.id}
              className="card hover:shadow-lg transition-shadow border-l-4"
              style={{ borderLeftColor: statusInfo.color.replace('bg-', '#') }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-bold">{form.guest_name}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-white text-xs font-medium ${statusInfo.color}`}
                    >
                      {statusInfo.text}
                    </span>
                    {form.exported_to_city && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                        ✓ Exportiert
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <div className="font-medium text-gray-900">Zimmer</div>
                      <div>{form.room_number}</div>
                    </div>

                    <div>
                      <div className="font-medium text-gray-900">Aufenthalt</div>
                      <div>
                        {format(parseISO(form.arrival_date), 'dd.MM.yy', { locale: de })} -{' '}
                        {format(parseISO(form.departure_date), 'dd.MM.yy', { locale: de })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {form.nights} {form.nights === 1 ? 'Nacht' : 'Nächte'}
                      </div>
                    </div>

                    <div>
                      <div className="font-medium text-gray-900">Zahlung</div>
                      <div className={paymentInfo.color}>
                        {paymentInfo.text}
                      </div>
                      <div className="text-xs text-gray-500">
                        {form.total_amount.toFixed(2)} €
                      </div>
                    </div>

                    <div>
                      <div className="font-medium text-gray-900">Zweck</div>
                      <div>
                        {form.travel_purpose === 'private' ? 'Privat' : 'Geschäftlich'}
                      </div>
                    </div>
                  </div>

                  {form.tourist_tax_required && (
                    <div className="mt-2 text-xs text-gray-500">
                      Kurtaxe: {form.tourist_tax_amount.toFixed(2)} € pro Nacht
                    </div>
                  )}

                  {!form.tourist_tax_required && form.tourist_tax_exemption_reason && (
                    <div className="mt-2 flex items-start text-xs text-blue-600">
                      <AlertCircle className="w-3 h-3 mr-1 mt-0.5" />
                      <span>Kurtaxe befreit: {form.tourist_tax_exemption_reason}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col space-y-2 ml-4">
                  <button
                    onClick={() => onViewDetails(form)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Details anzeigen"
                  >
                    <Eye className="w-5 h-5 text-gray-600" />
                  </button>

                  {canCheckIn && (
                    <button
                      onClick={() => onCheckIn(form)}
                      className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                      title="Check-in"
                    >
                      <LogIn className="w-5 h-5 text-green-600" />
                    </button>
                  )}

                  {canCheckOut && (
                    <button
                      onClick={() => onCheckOut(form)}
                      className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Check-out"
                    >
                      <LogOut className="w-5 h-5 text-blue-600" />
                    </button>
                  )}

                  {canExport && (
                    <button
                      onClick={() => exportMutation.mutate(form.id)}
                      disabled={exportMutation.isPending}
                      className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
                      title="Zur Stadt exportieren"
                    >
                      <Download className="w-5 h-5 text-purple-600" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
