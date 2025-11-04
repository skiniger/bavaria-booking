import { useMutation, useQueryClient } from '@tanstack/react-query';
import { registrationFormsAPI } from '../../services/api';
import type { RegistrationForm } from '../../types';
import { X, User, Calendar, Hotel, Euro, CreditCard, FileCheck, Download, LogIn, LogOut, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

interface RegistrationFormDetailsProps {
  form: RegistrationForm | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function RegistrationFormDetails({
  form,
  isOpen,
  onClose,
}: RegistrationFormDetailsProps) {
  const queryClient = useQueryClient();

  const checkInMutation = useMutation({
    mutationFn: (id: string) => registrationFormsAPI.checkIn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registration-forms'] });
      onClose();
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: (id: string) => registrationFormsAPI.checkOut(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registration-forms'] });
      onClose();
    },
  });

  const exportMutation = useMutation({
    mutationFn: (id: string) => registrationFormsAPI.exportToCity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registration-forms'] });
    },
  });

  if (!isOpen || !form) return null;

  const canCheckIn = form.status === 'confirmed';
  const canCheckOut = form.status === 'checked_in';
  const canExport = ['checked_in', 'checked_out'].includes(form.status) && !form.exported_to_city;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-500';
      case 'confirmed':
        return 'bg-bavaria-yellow';
      case 'checked_in':
        return 'bg-bavaria-green';
      case 'checked_out':
        return 'bg-bavaria-blue';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const statusColor = getStatusColor(form.status);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold">Meldeschein-Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center justify-center space-x-4">
            <span className={`px-6 py-3 rounded-full text-white text-lg font-bold ${statusColor}`}>
              {form.status === 'draft' && 'Entwurf'}
              {form.status === 'confirmed' && 'Bestätigt'}
              {form.status === 'checked_in' && 'Eingecheckt'}
              {form.status === 'checked_out' && 'Ausgecheckt'}
              {form.status === 'cancelled' && 'Storniert'}
            </span>
            {form.exported_to_city && (
              <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full font-medium">
                ✓ An Stadt exportiert
              </span>
            )}
          </div>

          {/* Guest Information */}
          {form.guest_detail && (
            <div className="card bg-gray-50">
              <h3 className="font-bold text-lg mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Gast
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Name:</div>
                  <div className="font-medium text-lg">
                    {form.guest_detail.first_name} {form.guest_detail.last_name}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Geburtsdatum:</div>
                  <div className="font-medium">
                    {format(parseISO(form.guest_detail.birth_date), 'dd.MM.yyyy')}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Staatsangehörigkeit:</div>
                  <div className="font-medium">{form.guest_detail.nationality}</div>
                </div>
                <div>
                  <div className="text-gray-600">Dokument:</div>
                  <div className="font-medium">
                    {form.guest_detail.document_type === 'id_card' && 'Personalausweis'}
                    {form.guest_detail.document_type === 'passport' && 'Reisepass'}
                    {form.guest_detail.document_type === 'driving_license' && 'Führerschein'}
                    : {form.guest_detail.document_number}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-gray-600">Adresse:</div>
                  <div className="font-medium">
                    {form.guest_detail.street} {form.guest_detail.house_number},{' '}
                    {form.guest_detail.postal_code} {form.guest_detail.city},{' '}
                    {form.guest_detail.country}
                  </div>
                </div>
                {(form.guest_detail.email || form.guest_detail.phone) && (
                  <>
                    {form.guest_detail.phone && (
                      <div>
                        <div className="text-gray-600">Telefon:</div>
                        <div className="font-medium">{form.guest_detail.phone}</div>
                      </div>
                    )}
                    {form.guest_detail.email && (
                      <div>
                        <div className="text-gray-600">E-Mail:</div>
                        <div className="font-medium">{form.guest_detail.email}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stay Information */}
            <div className="card bg-gray-50">
              <h3 className="font-bold text-lg mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Aufenthalt
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Anreise:</span>
                  <span className="font-medium">
                    {format(parseISO(form.arrival_date), 'dd. MMMM yyyy', { locale: de })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Abreise:</span>
                  <span className="font-medium">
                    {format(parseISO(form.departure_date), 'dd. MMMM yyyy', { locale: de })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Nächte:</span>
                  <span className="font-medium">{form.nights}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Zimmernummer:</span>
                  <span className="font-medium text-lg">{form.room_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Reisezweck:</span>
                  <span className="font-medium">
                    {form.travel_purpose === 'private' ? 'Privat' : 'Geschäftlich'}
                  </span>
                </div>
                {form.company_name && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Firma:</span>
                      <span className="font-medium">{form.company_name}</span>
                    </div>
                    {form.company_address && (
                      <div>
                        <span className="text-gray-600">Firmenadresse:</span>
                        <div className="font-medium text-xs mt-1">{form.company_address}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Services */}
            <div className="card bg-gray-50">
              <h3 className="font-bold text-lg mb-4 flex items-center">
                <Hotel className="w-5 h-5 mr-2" />
                Leistungen
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Frühstück:</span>
                  <span className="font-medium">
                    {form.breakfast_included ? `Ja (${form.breakfast_price.toFixed(2)} € / Tag)` : 'Nein'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Kurtaxe:</span>
                  <span className="font-medium">
                    {form.tourist_tax_required
                      ? `${form.tourist_tax_amount.toFixed(2)} € / Nacht`
                      : 'Befreit'}
                  </span>
                </div>
                {!form.tourist_tax_required && form.tourist_tax_exemption_reason && (
                  <div className="p-2 bg-blue-50 rounded text-xs text-blue-700">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    Befreiungsgrund: {form.tourist_tax_exemption_reason}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="card bg-bavaria-blue bg-opacity-10">
            <h3 className="font-bold text-lg mb-4 flex items-center text-bavaria-blue">
              <Euro className="w-5 h-5 mr-2" />
              Preisberechnung
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Übernachtung ({form.nights} × {form.room_price_per_night.toFixed(2)} €):</span>
                <span className="font-medium">
                  {(form.nights || 0) * (form.room_price_per_night || 0).toFixed(2)} €
                </span>
              </div>
              {form.breakfast_included && (
                <div className="flex justify-between">
                  <span>Frühstück ({form.nights} × {form.breakfast_price.toFixed(2)} €):</span>
                  <span className="font-medium">
                    {((form.nights || 0) * form.breakfast_price).toFixed(2)} €
                  </span>
                </div>
              )}
              {form.tourist_tax_required && (
                <div className="flex justify-between">
                  <span>Kurtaxe ({form.nights} × {form.tourist_tax_amount.toFixed(2)} €):</span>
                  <span className="font-medium">
                    {((form.nights || 0) * form.tourist_tax_amount).toFixed(2)} €
                  </span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-bavaria-blue">
                <span className="text-bavaria-blue">Gesamtsumme:</span>
                <span className="text-bavaria-blue">{form.total_amount.toFixed(2)} €</span>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="card bg-gray-50">
            <h3 className="font-bold text-lg mb-4 flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Zahlung
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Zahlungsart:</div>
                <div className="font-medium">
                  {form.payment_method === 'cash' && 'Bar'}
                  {form.payment_method === 'ec' && 'EC-Karte'}
                  {form.payment_method === 'credit_card' && 'Kreditkarte'}
                  {form.payment_method === 'invoice' && 'Rechnung'}
                </div>
              </div>
              <div>
                <div className="text-gray-600">Status:</div>
                <div className={`font-medium ${
                  form.payment_status === 'paid' ? 'text-green-600' :
                  form.payment_status === 'partially_paid' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {form.payment_status === 'paid' && 'Bezahlt'}
                  {form.payment_status === 'partially_paid' && 'Teilweise bezahlt'}
                  {form.payment_status === 'pending' && 'Ausstehend'}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {form.notes && (
            <div className="card bg-gray-50">
              <h3 className="font-bold mb-2">Notizen</h3>
              <p className="text-sm text-gray-700">{form.notes}</p>
            </div>
          )}

          {/* Export Info */}
          {form.exported_to_city && form.export_date && (
            <div className="card bg-green-50">
              <div className="flex items-center text-green-700">
                <FileCheck className="w-5 h-5 mr-2" />
                <div>
                  <div className="font-medium">An Stadt exportiert</div>
                  <div className="text-sm">
                    {format(parseISO(form.export_date), 'dd.MM.yyyy HH:mm')} Uhr
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            {canCheckIn && (
              <button
                onClick={() => checkInMutation.mutate(form.id)}
                disabled={checkInMutation.isPending}
                className="btn-success flex items-center"
              >
                <LogIn className="w-4 h-4 mr-2" />
                {checkInMutation.isPending ? 'Wird eingecheckt...' : 'Check-in'}
              </button>
            )}

            {canCheckOut && (
              <button
                onClick={() => checkOutMutation.mutate(form.id)}
                disabled={checkOutMutation.isPending}
                className="btn-primary flex items-center"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {checkOutMutation.isPending ? 'Wird ausgecheckt...' : 'Check-out'}
              </button>
            )}

            {canExport && (
              <button
                onClick={() => exportMutation.mutate(form.id)}
                disabled={exportMutation.isPending}
                className="btn-secondary flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                {exportMutation.isPending ? 'Wird exportiert...' : 'Zur Stadt exportieren'}
              </button>
            )}
          </div>

          {/* Metadata */}
          <div className="text-xs text-gray-500 pt-4 border-t">
            <div>Erstellt: {format(parseISO(form.created_at), 'dd.MM.yyyy HH:mm')}</div>
            <div>ID: {form.id}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
