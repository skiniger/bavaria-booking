import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Search, Plus, Edit, Trash2, UserCheck, UserX } from 'lucide-react';
import { employeesAPI } from '../../services/api';
import type { Employee } from '../../types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface EmployeeListProps {
  onAddEmployee?: () => void;
  onEditEmployee?: (employeeId: string) => void;
  onViewDetails?: (employeeId: string) => void;
}

export const EmployeeList: React.FC<EmployeeListProps> = ({
  onAddEmployee,
  onEditEmployee,
  onViewDetails,
}) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Fetch employees
  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await employeesAPI.getAll();
      return response.data;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await employeesAPI.delete(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      !searchTerm ||
      emp.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = !roleFilter || emp.role === roleFilter;
    const matchesStatus = !statusFilter || emp.is_active_employee.toString() === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-bavaria-red bg-opacity-10 text-bavaria-red';
      case 'manager':
        return 'bg-bavaria-blue bg-opacity-10 text-bavaria-blue';
      case 'staff':
        return 'bg-bavaria-green bg-opacity-10 text-bavaria-green';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Get role label
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'manager':
        return 'Manager';
      case 'staff':
        return 'Mitarbeiter';
      default:
        return role;
    }
  };

  const handleDelete = (employee: Employee) => {
    if (
      confirm(
        `Möchten Sie den Mitarbeiter ${employee.first_name} ${employee.last_name} wirklich löschen?`
      )
    ) {
      deleteMutation.mutate(employee.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bavaria-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6 text-bavaria-blue" />
            <h2 className="text-xl font-semibold text-gray-800">
              Mitarbeiter ({filteredEmployees.length})
            </h2>
          </div>
          <button
            onClick={onAddEmployee}
            className="px-4 py-2 bg-bavaria-green text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Neuer Mitarbeiter</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Suche nach Name, Personalnummer, E-Mail..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue focus:border-transparent"
            />
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue focus:border-transparent"
            >
              <option value="">Alle Rollen</option>
              <option value="admin">Administrator</option>
              <option value="manager">Manager</option>
              <option value="staff">Mitarbeiter</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bavaria-blue focus:border-transparent"
            >
              <option value="">Alle Status</option>
              <option value="true">Aktiv</option>
              <option value="false">Inaktiv</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employee Cards Grid */}
      {filteredEmployees.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">
            {searchTerm || roleFilter || statusFilter
              ? 'Keine Mitarbeiter gefunden'
              : 'Noch keine Mitarbeiter angelegt'}
          </p>
          {!searchTerm && !roleFilter && !statusFilter && (
            <button
              onClick={onAddEmployee}
              className="mt-4 px-6 py-2 bg-bavaria-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Ersten Mitarbeiter anlegen
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map(employee => (
            <div
              key={employee.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full bg-bavaria-blue flex items-center justify-center text-white font-semibold text-lg">
                      {employee.first_name[0]}{employee.last_name[0]}
                    </div>
                    <div>
                      <h3
                        className="font-semibold text-gray-800 cursor-pointer hover:text-bavaria-blue"
                        onClick={() => onViewDetails?.(employee.id)}
                      >
                        {employee.first_name} {employee.last_name}
                      </h3>
                      <p className="text-sm text-gray-600">{employee.employee_number}</p>
                    </div>
                  </div>
                  {employee.is_active_employee ? (
                    <span title="Aktiv"><UserCheck className="h-5 w-5 text-bavaria-green" /></span>
                  ) : (
                    <span title="Inaktiv"><UserX className="h-5 w-5 text-bavaria-red" /></span>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-3 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Rolle</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(employee.role)}`}>
                      {getRoleLabel(employee.role)}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">E-Mail</p>
                    <p className="text-sm text-gray-800 truncate">{employee.email}</p>
                  </div>

                  {employee.phone && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Telefon</p>
                      <p className="text-sm text-gray-800">{employee.phone}</p>
                    </div>
                  )}

                  {employee.date_joined && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Eintrittsdatum</p>
                      <p className="text-sm text-gray-800">
                        {format(new Date(employee.date_joined), 'dd.MM.yyyy', { locale: de })}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-gray-500 mb-1">Gleichzeitige Anmeldung</p>
                    <p className="text-sm text-gray-800">
                      {employee.can_simultaneous_login ? 'Erlaubt' : 'Nicht erlaubt'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => onViewDetails?.(employee.id)}
                    className="px-3 py-1.5 text-sm text-bavaria-blue hover:bg-bavaria-blue hover:bg-opacity-10 rounded transition-colors"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => onEditEmployee?.(employee.id)}
                    className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors flex items-center space-x-1"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Bearbeiten</span>
                  </button>
                  <button
                    onClick={() => handleDelete(employee)}
                    disabled={deleteMutation.isPending}
                    className="px-3 py-1.5 text-sm text-bavaria-red hover:bg-bavaria-red hover:bg-opacity-10 rounded transition-colors flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Löschen</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Statistics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-bavaria-blue">
          <p className="text-sm text-gray-600">Gesamt Mitarbeiter</p>
          <p className="text-3xl font-bold text-gray-800">{employees.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-bavaria-green">
          <p className="text-sm text-gray-600">Aktiv</p>
          <p className="text-3xl font-bold text-gray-800">
            {employees.filter(e => e.is_active_employee).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-bavaria-yellow">
          <p className="text-sm text-gray-600">Manager</p>
          <p className="text-3xl font-bold text-gray-800">
            {employees.filter(e => e.role === 'manager' || e.role === 'admin').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-bavaria-red">
          <p className="text-sm text-gray-600">Inaktiv</p>
          <p className="text-3xl font-bold text-gray-800">
            {employees.filter(e => !e.is_active_employee).length}
          </p>
        </div>
      </div>
    </div>
  );
};
