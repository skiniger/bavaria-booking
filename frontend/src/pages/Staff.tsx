import { useState } from 'react';
import { Clock, Users, TrendingUp } from 'lucide-react';
import { TimeTrackingDashboard } from '../components/staff/TimeTrackingDashboard';
import { TimeTrackingForm } from '../components/staff/TimeTrackingForm';
import { TimeCorrectionForm } from '../components/staff/TimeCorrectionForm';
import { HoursOverview } from '../components/staff/HoursOverview';
import { EmployeeList } from '../components/staff/EmployeeList';

type ViewMode = 'dashboard' | 'hours' | 'employees';

export default function Staff() {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [showTimeTrackingForm, setShowTimeTrackingForm] = useState(false);
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [selectedTrackingId, setSelectedTrackingId] = useState<string | undefined>();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>();

  const handleViewEmployeeDetails = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setViewMode('hours');
  };

  const handleEditTracking = (trackingId: string) => {
    setSelectedTrackingId(trackingId);
    setShowCorrectionForm(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Personalverwaltung</h1>
        <button
          onClick={() => setShowTimeTrackingForm(true)}
          className="px-4 py-2 bg-bavaria-blue text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
        >
          <Clock className="h-5 w-5" />
          <span>Ein-/Ausstempeln</span>
        </button>
      </div>

      {/* View Mode Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setViewMode('dashboard')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
                viewMode === 'dashboard'
                  ? 'border-bavaria-blue text-bavaria-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Clock className="h-5 w-5" />
              <span>Zeiterfassung</span>
            </button>
            <button
              onClick={() => setViewMode('hours')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
                viewMode === 'hours'
                  ? 'border-bavaria-blue text-bavaria-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <TrendingUp className="h-5 w-5" />
              <span>Stundenübersicht</span>
            </button>
            <button
              onClick={() => setViewMode('employees')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
                viewMode === 'employees'
                  ? 'border-bavaria-blue text-bavaria-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="h-5 w-5" />
              <span>Mitarbeiter</span>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Dashboard View */}
          {viewMode === 'dashboard' && (
            <TimeTrackingDashboard onViewDetails={handleViewEmployeeDetails} />
          )}

          {/* Hours Overview */}
          {viewMode === 'hours' && (
            <HoursOverview onEditTracking={handleEditTracking} />
          )}

          {/* Employees List */}
          {viewMode === 'employees' && (
            <EmployeeList
              onViewDetails={handleViewEmployeeDetails}
              onEditEmployee={(id) => {
                // TODO: Implement employee edit form
                console.log('Edit employee:', id);
              }}
              onAddEmployee={() => {
                // TODO: Implement employee add form
                console.log('Add employee');
              }}
            />
          )}
        </div>
      </div>

      {/* Time Tracking Form Modal */}
      {showTimeTrackingForm && (
        <TimeTrackingForm
          onClose={() => setShowTimeTrackingForm(false)}
          employeeId={selectedEmployeeId}
        />
      )}

      {/* Time Correction Form Modal */}
      {showCorrectionForm && (
        <TimeCorrectionForm
          onClose={() => {
            setShowCorrectionForm(false);
            setSelectedTrackingId(undefined);
          }}
          trackingId={selectedTrackingId}
        />
      )}
    </div>
  );
}
