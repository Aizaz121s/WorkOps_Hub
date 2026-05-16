import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Filter, Download, Edit2, Trash2, Eye } from 'lucide-react';
import { Employee } from '../App';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';

export default function Employees() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [canManageEmployees, setCanManageEmployees] = useState(false);
const [actionError, setActionError] = useState('');

  // useEffect(() => {
  //   const token = localStorage.getItem('token');
  //   const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

  //   fetch('/api/employees', { headers })
  //     .then(res => res.json())
  //     .then(data => {
  //       if (data.success) setEmployees(data.data);
  //       setLoading(false);
  //     });
  // }, []);
  useEffect(() => {
 const token = localStorage.getItem('token');
const headers: HeadersInit = token
  ? { Authorization: `Bearer ${token}` }
  : {};

  Promise.all([
    fetch('/api/employees', { headers }).then(res => res.json()),
    fetch('/api/permissions', { headers }).then(res => res.json()),
  ])
    .then(([employeesData, permissionsData]) => {
      if (employeesData.success) {
        setEmployees(employeesData.data);
      }

      if (permissionsData.success) {
        setCanManageEmployees(Boolean(permissionsData.data.canManageEmployees));
      }
    })
    .catch(() => {
      setActionError('Failed to load employees');
    })
    .finally(() => {
      setLoading(false);
    });
}, []);

const handleDeleteEmployee = async (employee: Employee) => {
  setActionError('');

  if (!canManageEmployees) {
    setActionError(
      'Only Super Admin can delete employees. HR can delete only after Super Admin grants access.'
    );
    return;
  }

  const fullName = `${employee.first_name} ${employee.last_name}`;

  const confirmed = confirm(
    `Are you sure you want to delete ${fullName}? This will mark the employee as inactive.`
  );

  if (!confirmed) return;

  try {
    const token = localStorage.getItem('token');

    const res = await fetch(`/api/employees/${employee.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (data.success) {
      setEmployees(prev => prev.filter(e => e.id !== employee.id));
    } else {
      setActionError(data.message || 'Failed to delete employee');
    }
  } catch {
    setActionError('Connection error while deleting employee');
  }
};

 const filteredEmployees = employees.filter(e =>
  `${e.first_name} ${e.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
  e.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
  e.email.toLowerCase().includes(searchTerm.toLowerCase())
);
const isOwnEmployee = (employee: Employee) => {
  return employee.user_id === user?.id;
};

const isSuperAdminEmployee = (employee: Employee) => {
  return employee.role_name === 'super_admin' || employee.role === 'super_admin';
};

const canViewThisEmployee = (employee: Employee) => {
  if (canManageEmployees) return true;

  return isOwnEmployee(employee);
};

const canEditThisEmployee = (employee: Employee) => {
  if (user?.role === 'super_admin') return true;

  if (user?.role === 'hr_manager' && canManageEmployees) {
    if (isOwnEmployee(employee)) return false;
    if (isSuperAdminEmployee(employee)) return false;

    return true;
  }

  return false;
};

const canDeleteThisEmployee = (employee: Employee) => {
  if (user?.role === 'super_admin') {
    return !isOwnEmployee(employee);
  }

  if (user?.role === 'hr_manager' && canManageEmployees) {
    if (isOwnEmployee(employee)) return false;
    if (isSuperAdminEmployee(employee)) return false;

    return true;
  }

  return false;
};

  return (
    
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employees</h1>
          <p className="text-slate-500">Manage your workforce, roles, and access.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors">
            <Download size={18} />
            Export
          </button>
         {canManageEmployees && (
  <Link to="/employees/add" className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all active:scale-[0.98]">
    <Plus size={18} />
    Add Employee
  </Link>
)}
        </div>
      </div>
      {actionError && (
  <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium">
    {actionError}
  </div>
)}

{!canManageEmployees && user?.role === 'hr_manager' && (
  <div className="p-4 bg-amber-50 border border-amber-100 text-amber-700 rounded-xl text-sm font-medium">
    HR Manager view is read-only. Super Admin can enable HR add/delete access from Settings.
  </div>
)}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm shadow-slate-100/50 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name, ID or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 bg-white hover:bg-slate-50">
              <Filter size={18} />
              Status
            </button>
            <button className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 bg-white hover:bg-slate-50">
              <Filter size={18} />
              Department
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Designation</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Joining Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      Loading employees...
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No employees found matching your search.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee, idx) => (
                  <motion.tr 
                    key={employee.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm overflow-hidden flex-shrink-0">
    {employee.profile_image ? (
      <img src={employee.profile_image} alt="" className="w-full h-full object-cover" />
    ) : (
      <>{employee.first_name[0]}{employee.last_name[0]}</>
    )}
  </div>

  <div className="min-w-0">
    <p className="text-sm font-semibold text-slate-900 leading-tight truncate">
      {employee.first_name} {employee.last_name}
    </p>
    <p className="text-xs text-slate-500 truncate">{employee.email}</p>
  </div>
</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600">
                      {employee.employee_id}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {employee.department_name || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {employee.designation_name || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        employee.status === 'active' 
                          ? "bg-emerald-50 text-emerald-700" 
                          : "bg-red-50 text-red-700"
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", employee.status === 'active' ? "bg-emerald-500" : "bg-red-500")}></span>
                        {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(employee.joining_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
  {canViewThisEmployee(employee) && (
    <Link
      to={`/employees/${employee.id}`}
      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
      title="View Profile"
    >
      <Eye size={16} />
    </Link>
  )}

  {canEditThisEmployee(employee) && (
    <Link
      to={`/employees/${employee.id}?edit=true`}
      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
      title="Edit"
    >
      <Edit2 size={16} />
    </Link>
  )}

  {canDeleteThisEmployee(employee) && (
    <button
      onClick={() => handleDeleteEmployee(employee)}
      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
      title="Delete"
    >
      <Trash2 size={16} />
    </button>
  )}
</div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing <span className="font-medium text-slate-900">{filteredEmployees.length}</span> of <span className="font-medium text-slate-900">{employees.length}</span> results
          </p>
          <div className="flex items-center gap-2">
            <button disabled className="px-3 py-1 border border-slate-200 rounded-md text-sm text-slate-400 cursor-not-allowed">Previous</button>
            <button className="px-3 py-1 border border-slate-200 rounded-md text-sm text-slate-600 hover:bg-slate-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  
  );

}
