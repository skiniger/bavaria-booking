import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reservationsAPI } from '../../services/api';
import type { Reservation } from '../../types';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  startOfYear,
  addYears,
  subYears,
} from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface ReservationCalendarProps {
  onDateSelect: (date: Date) => void;
  onReservationClick: (reservation: Reservation) => void;
}

export default function ReservationCalendar({
  onDateSelect,
  onReservationClick,
}: ReservationCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'year'>('month');

  // Fetch reservations for current month
  const { data: reservations = [] } = useQuery({
    queryKey: ['reservations', format(currentDate, 'yyyy-MM')],
    queryFn: () =>
      reservationsAPI
        .getAll({
          date: format(startOfMonth(currentDate), 'yyyy-MM-dd'),
        })
        .then((res) => res.data),
  });

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { locale: de });
    const endDate = endOfWeek(monthEnd, { locale: de });

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const formattedDate = format(day, 'd');
        const cloneDay = day;

        // Count reservations for this day
        const dayReservations = reservations.filter((res) =>
          isSameDay(parseISO(res.reservation_time), cloneDay)
        );

        days.push(
          <div
            key={day.toString()}
            className={`min-h-24 p-2 border border-gray-200 cursor-pointer transition-colors ${
              !isSameMonth(day, monthStart)
                ? 'bg-gray-50 text-gray-400'
                : isToday(day)
                ? 'bg-bavaria-blue bg-opacity-10'
                : 'bg-white hover:bg-gray-50'
            }`}
            onClick={() => onDateSelect(cloneDay)}
          >
            <div
              className={`text-sm font-medium mb-1 ${
                isToday(day) ? 'text-bavaria-blue font-bold' : ''
              }`}
            >
              {formattedDate}
            </div>
            {dayReservations.length > 0 && (
              <div className="space-y-1">
                {dayReservations.slice(0, 2).map((reservation) => (
                  <div
                    key={reservation.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onReservationClick(reservation);
                    }}
                    className={`text-xs p-1 rounded truncate ${
                      reservation.status === 'confirmed'
                        ? 'bg-bavaria-green text-white'
                        : reservation.status === 'pending_confirmation'
                        ? 'bg-bavaria-yellow text-white'
                        : 'bg-gray-300 text-gray-700'
                    }`}
                  >
                    {format(parseISO(reservation.reservation_time), 'HH:mm')}{' '}
                    {reservation.guest_name}
                  </div>
                ))}
                {dayReservations.length > 2 && (
                  <div className="text-xs text-gray-500">
                    +{dayReservations.length - 2} weitere
                  </div>
                )}
              </div>
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7">
          {days}
        </div>
      );
      days = [];
    }

    return <div>{rows}</div>;
  };

  const renderYearView = () => {
    const yearStart = startOfYear(currentDate);
    const months = [];

    for (let i = 0; i < 12; i++) {
      const month = addMonths(yearStart, i);
      months.push(
        <button
          key={i}
          onClick={() => {
            setCurrentDate(month);
            setView('month');
          }}
          className="p-4 border rounded-lg hover:bg-bavaria-blue hover:text-white transition-colors"
        >
          <div className="font-bold">{format(month, 'MMMM', { locale: de })}</div>
        </button>
      );
    }

    return (
      <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
        {months}
      </div>
    );
  };

  const nextPeriod = () => {
    if (view === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addYears(currentDate, 1));
    }
  };

  const prevPeriod = () => {
    if (view === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subYears(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setView('month');
  };

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={prevPeriod}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setView(view === 'month' ? 'year' : 'month')}
            className="text-2xl font-bold hover:text-bavaria-blue transition-colors"
          >
            {view === 'month'
              ? format(currentDate, 'MMMM yyyy', { locale: de })
              : format(currentDate, 'yyyy', { locale: de })}
          </button>
          <button
            onClick={nextPeriod}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={goToToday} className="btn-secondary flex items-center">
            <CalendarIcon className="w-4 h-4 mr-2" />
            Heute
          </button>
        </div>
      </div>

      {/* Weekday Headers (nur bei Monatsansicht) */}
      {view === 'month' && (
        <div className="grid grid-cols-7 mb-2">
          {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
            <div key={day} className="text-center font-bold text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>
      )}

      {/* Calendar Content */}
      {view === 'month' ? renderMonthView() : renderYearView()}

      {/* Legend */}
      <div className="mt-6 pt-4 border-t flex flex-wrap gap-4 text-sm">
        <div className="flex items-center">
          <div className="w-4 h-4 rounded bg-bavaria-green mr-2"></div>
          <span>Bestätigt</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 rounded bg-bavaria-yellow mr-2"></div>
          <span>Ausstehend</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 rounded bg-gray-300 mr-2"></div>
          <span>Storniert</span>
        </div>
      </div>
    </div>
  );
}
