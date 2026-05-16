import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Filter,
  CheckCircle2,
  XCircle,
  FileText,
  Users,
  AlertCircle,
  BarChart3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

type Leave = {
  id: number;
  employee_id: number;
  type: string;
  start_date: string;
  end_date: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  first_name: string;
  last_name: string;
  employee_id_code?: string;

  department_name?: string;
};

type LeaveSummary = {
  annualLimit: number;
  annualUsed: number;
  annualRemaining: number;
  sickLimit: number;
  sickUsed: number;
  sickRemaining: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  totalApprovedDays: number;
};

type LeaveReportRow = {
  employee_id_db: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  department_name?: string;
  annual_used: number;
  annual_limit: number;
  annual_remaining: number;
  sick_used: number;
  sick_limit: number;
  sick_remaining: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  total_approved_days: number;
};

const emptySummary: LeaveSummary = {
  annualLimit: 15,
  annualUsed: 0,
  annualRemaining: 15,
  sickLimit: 7,
  sickUsed: 0,
  sickRemaining: 7,
  pendingRequests: 0,
  approvedRequests: 0,
  rejectedRequests: 0,
  totalApprovedDays: 0,
};

export default function Leaves() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [summary, setSummary] = useState<LeaveSummary>(emptySummary);
  const [report, setReport] = useState<LeaveReportRow[]>([]);
  const [canManageLeaves, setCanManageLeaves] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [actionError, setActionError] = useState('');

  const [formData, setFormData] = useState({
    type: 'Annual Leave',
    start_date: '',
    end_date: '',
    reason: '',
  });

  useEffect(() => {
    fetchPageData();
  }, []);

  const getHeaders = (json = false): HeadersInit => {
    const token = localStorage.getItem('token');

    return {
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchPageData = async () => {
    setActionError('');
    setLoading(true);

    try {
      const [permissionsRes, leavesRes, summaryRes] = await Promise.all([
        fetch('/api/permissions', { headers: getHeaders() }),
        fetch('/api/leaves', { headers: getHeaders() }),
        fetch('/api/leaves/summary', { headers: getHeaders() }),
      ]);

      const permissionsData = await permissionsRes.json();
      const leavesData = await leavesRes.json();
      const summaryData = await summaryRes.json();

      const allowed = Boolean(permissionsData?.data?.canManageLeaves);
      setCanManageLeaves(allowed);

      if (leavesData.success) {
        setLeaves(leavesData.data);
      }

      if (summaryData.success) {
        setSummary(summaryData.data);
      }

      if (allowed) {
        fetchLeaveReport();
      }
    } catch {
      setActionError('Failed to load leave data');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveReport = async () => {
    setReportLoading(true);

    try {
      const res = await fetch('/api/leaves/report', {
        headers: getHeaders(),
      });

      const data = await res.json();

      if (data.success) {
        setReport(data.data);
      }
    } catch {
      setActionError('Failed to load employee leave report');
    } finally {
      setReportLoading(false);
    }
  };

  const getLeaveDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 0;
    }

    const diff = end.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');

    if (!formData.type || !formData.start_date || !formData.end_date || !formData.reason) {
      setActionError('Please fill all leave request fields');
      return;
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      setActionError('End date cannot be before start date');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        setShowModal(false);
        setFormData({
          type: 'Annual Leave',
          start_date: '',
          end_date: '',
          reason: '',
        });
        fetchPageData();
      } else {
        setActionError(data.message || 'Failed to submit leave request');
      }
    } catch {
      setActionError('Connection error while submitting leave request');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number, status: 'approved' | 'rejected') => {
    if (!canManageLeaves) {
      setActionError('Only Super Admin or allowed HR can approve/reject leave requests.');
      return;
    }

    setActionError('');

    try {
      const res = await fetch(`/api/leaves/${id}/status`, {
        method: 'PUT',
        headers: getHeaders(true),
        body: JSON.stringify({ status }),
      });

      const data = await res.json();

      if (data.success) {
        fetchPageData();
      } else {
        setActionError(data.message || `Failed to mark leave as ${status}`);
      }
    } catch {
      setActionError('Connection error while updating leave request');
    }
  };

  const stats = [
    {
      label: 'Annual Leave',
      val: `${summary.annualUsed}/${summary.annualLimit}`,
      sub: `${summary.annualRemaining} remaining`,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Sick Leave',
      val: `${summary.sickUsed}/${summary.sickLimit}`,
      sub: `${summary.sickRemaining} remaining`,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      label: 'Pending Requests',
      val: summary.pendingRequests,
      sub: 'awaiting approval',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Total Approved',
      val: `${summary.totalApprovedDays} Days`,
      sub: `${summary.approvedRequests} approved requests`,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leave Management</h1>
          <p className="text-slate-500">
            {canManageLeaves
              ? 'Manage leave requests and review employee leave balances.'
              : 'View your leave balance and submit time-off requests.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {canManageLeaves && (
            <button
              type="button"
              onClick={() => setShowReport(prev => !prev)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 border border-slate-200 bg-white text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all active:scale-95"
            >
              <BarChart3 size={18} />
              {showReport ? 'Hide Report' : 'All Employee Report'}
            </button>
          )}

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
          >
            <Plus size={20} />
            Request Leave
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2">
          <AlertCircle size={18} />
          {actionError}
        </div>
      )}

      {!canManageLeaves && (
        <div className="p-4 bg-blue-50 border border-blue-100 text-blue-700 rounded-xl text-sm font-medium">
          You are viewing your own leave balance and requests only.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
            <div className={cn('p-3 rounded-xl', stat.bg, stat.color)}>
              <FileText size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">{stat.label}</p>
              <p className="text-lg font-bold text-slate-900">{stat.val}</p>
              <p className="text-[11px] text-slate-400">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Admin/HR Leave Report */}
      {canManageLeaves && showReport && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <div>
              <h3 className="font-bold text-slate-900">All Employee Leave Report</h3>
              <p className="text-xs text-slate-500">
                Annual, sick, pending, approved, rejected, and remaining leave per employee.
              </p>
            </div>
            <Users size={18} className="text-slate-400" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Annual</th>
                  <th className="px-6 py-4">Sick</th>
                  <th className="px-6 py-4">Pending</th>
                  <th className="px-6 py-4">Approved</th>
                  <th className="px-6 py-4">Rejected</th>
                  <th className="px-6 py-4">Approved Days</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {reportLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-slate-500">
                      Loading report...
                    </td>
                  </tr>
                ) : report.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-slate-500">
                      No employee leave report found.
                    </td>
                  </tr>
                ) : (
                  report.map(row => (
                    <tr key={row.employee_id_db} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-slate-900">
                          {row.first_name} {row.last_name}
                        </p>
                        <p className="text-xs text-slate-400">{row.email}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {row.department_name || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">
                        {row.annual_used}/{row.annual_limit}
                        <p className="text-[10px] text-slate-400">
                          {row.annual_remaining} remaining
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">
                        {row.sick_used}/{row.sick_limit}
                        <p className="text-[10px] text-slate-400">
                          {row.sick_remaining} remaining
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-purple-600 font-bold">
                        {row.pending_requests}
                      </td>
                      <td className="px-6 py-4 text-sm text-emerald-600 font-bold">
                        {row.approved_requests}
                      </td>
                      <td className="px-6 py-4 text-sm text-red-600 font-bold">
                        {row.rejected_requests}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">
                        {row.total_approved_days}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leave List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <h3 className="font-bold text-slate-900">
            {canManageLeaves ? 'Leave Requests' : 'My Leave Requests'}
          </h3>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-white transition-colors">
              <Filter size={14} />
              Filter
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Leave Type</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Days</th>
                <th className="px-6 py-4">Status</th>
                {canManageLeaves && <th className="px-6 py-4 text-right">Actions</th>}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={canManageLeaves ? 6 : 5} className="px-6 py-12 text-center text-slate-500">
                    Loading leave requests...
                  </td>
                </tr>
              ) : leaves.length === 0 ? (
                <tr>
                  <td colSpan={canManageLeaves ? 6 : 5} className="px-6 py-12 text-center text-slate-500">
                    No leave requests found.
                  </td>
                </tr>
              ) : (
                leaves.map(leave => (
                  <tr key={leave.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600">
                          {leave.first_name?.[0] || '?'}
                          {leave.last_name?.[0] || ''}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {leave.first_name} {leave.last_name}
                          </p>
                          {leave.department_name && (
                            <p className="text-[10px] text-slate-400">
                              {leave.department_name}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-700">{leave.type}</span>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[220px]">
                        {leave.reason || 'No reason provided'}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar size={14} className="text-slate-400" />
                        <span>
                          {new Date(leave.start_date).toLocaleDateString()} -{' '}
                          {new Date(leave.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm font-bold text-slate-700">
                      {getLeaveDays(leave.start_date, leave.end_date)}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                          leave.status === 'pending'
                            ? 'bg-orange-50 text-orange-600'
                            : leave.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-red-50 text-red-600'
                        )}
                      >
                        {leave.status}
                      </span>
                    </td>

                    {canManageLeaves && (
                      <td className="px-6 py-4 text-right">
                        {leave.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => updateStatus(leave.id, 'approved')}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-100"
                              title="Approve"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            <button
                              onClick={() => updateStatus(leave.id, 'rejected')}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
                              title="Reject"
                            >
                              <XCircle size={16} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No action</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xl font-bold text-slate-900">Request Leave</h3>
                <p className="text-sm text-slate-500">
                  Fill in the details for your time off request.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Leave Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                    >
                      <option>Annual Leave</option>
                      <option>Sick Leave</option>
                      <option>Casual Leave</option>
                      <option>Maternity Leave</option>
                      <option>Paternity Leave</option>
                      <option>Unpaid Leave</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Start Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      End Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.end_date}
                      onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Reason
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={formData.reason}
                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium resize-none"
                    placeholder="Brief description of the reason for leave..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// import React, { useState, useEffect } from 'react';
// import { Plane, Calendar, Clock, Plus, Filter, CheckCircle2, XCircle, AlertCircle, FileText } from 'lucide-react';
// import { motion, AnimatePresence } from 'motion/react';
// import { cn } from '../lib/utils';
// import { useAuth } from '../context/AuthContext';

// export default function Leaves() {
//   const { user } = useAuth();
//   const [leaves, setLeaves] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [showModal, setShowModal] = useState(false);
//   const [formData, setFormData] = useState({
//     type: 'Annual Leave',
//     start_date: '',
//     end_date: '',
//     reason: ''
//   });

//   useEffect(() => {
//     fetchLeaves();
//   }, []);

//   const fetchLeaves = async () => {
//     try {
//       const token = localStorage.getItem('token');
//       const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
//       const res = await fetch('/api/leaves', { headers });
//       const data = await res.json();
//       if (data.success) setLeaves(data.data);
//     } catch (err) { console.error(err); }
//     finally { setLoading(false); }
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLoading(true);
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch('/api/leaves', {
//         method: 'POST',
//         headers: { 
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${token}`
//         },
//         body: JSON.stringify(formData)
//       });
//       const data = await res.json();
//       if (data.success) {
//         setShowModal(false);
//         fetchLeaves();
//       }
//     } catch (err) { console.error(err); }
//     finally { setLoading(false); }
//   };

//   const updateStatus = async (id: number, status: string) => {
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch(`/api/leaves/${id}/status`, {
//         method: 'PUT',
//         headers: { 
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${token}`
//         },
//         body: JSON.stringify({ status })
//       });
//       const data = await res.json();
//       if (data.success) fetchLeaves();
//     } catch (err) { console.error(err); }
//   };

//   const isAdmin = user?.role === 'super_admin' || user?.role === 'hr_manager';

//   return (
//     <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
//       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//         <div>
//           <h1 className="text-2xl font-bold text-slate-900">Leave Management</h1>
//           <p className="text-slate-500">Manage time off, sick leaves, and vacation requests.</p>
//         </div>
//         <button 
//           onClick={() => setShowModal(true)}
//           className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
//         >
//           <Plus size={20} />
//           Request Leave
//         </button>
//       </div>

//       {/* Stats */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//         {[
//           { label: 'Annual Leave', val: `${leaves.filter(l => l.type === 'Annual Leave' && l.status === 'approved').length}/15`, color: 'text-blue-600', bg: 'bg-blue-50' },
//           { label: 'Sick Leave', val: `${leaves.filter(l => l.type === 'Sick Leave' && l.status === 'approved').length}/7`, color: 'text-orange-600', bg: 'bg-orange-50' },
//           { label: 'Pending Requests', val: leaves.filter(l => l.status === 'pending').length, color: 'text-purple-600', bg: 'bg-purple-50' },
//           { label: 'Total Approved', val: leaves.filter(l => l.status === 'approved').length + ' Days', color: 'text-emerald-600', bg: 'bg-emerald-50' },
//         ].map((stat, i) => (
//           <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
//             <div className={cn("p-3 rounded-xl", stat.bg, stat.color)}>
//               <FileText size={20} />
//             </div>
//             <div>
//               <p className="text-xs font-bold text-slate-400 uppercase">{stat.label}</p>
//               <p className="text-lg font-bold text-slate-900">{stat.val}</p>
//             </div>
//           </div>
//         ))}
//       </div>

//       {/* Leave List */}
//       <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
//         <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
//           <h3 className="font-bold text-slate-900">Leave Requests</h3>
//           <div className="flex gap-2">
//             <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-white transition-colors">
//               <Filter size={14} />
//               Filter
//             </button>
//           </div>
//         </div>
//         <div className="overflow-x-auto">
//           <table className="w-full text-left">
//             <thead>
//               <tr className="border-b border-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
//                 <th className="px-6 py-4">Employee</th>
//                 <th className="px-6 py-4">Leave Type</th>
//                 <th className="px-6 py-4">Duration</th>
//                 <th className="px-6 py-4">Status</th>
//                 {isAdmin && <th className="px-6 py-4 text-right">Actions</th>}
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-50">
//               {leaves.map((leave, i) => (
//                 <tr key={leave.id} className="hover:bg-slate-50/50 transition-colors">
//                   <td className="px-6 py-4">
//                     <div className="flex items-center gap-3">
//                       <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600">
//                         {leave.first_name[0]}{leave.last_name[0]}
//                       </div>
//                       <p className="text-sm font-semibold text-slate-900">{leave.first_name} {leave.last_name}</p>
//                     </div>
//                   </td>
//                   <td className="px-6 py-4">
//                     <span className="text-sm font-medium text-slate-700">{leave.type}</span>
//                     <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[200px]">{leave.reason}</p>
//                   </td>
//                   <td className="px-6 py-4">
//                     <div className="flex items-center gap-2 text-sm text-slate-600">
//                       <Calendar size={14} className="text-slate-400" />
//                       <span>{new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}</span>
//                     </div>
//                   </td>
//                   <td className="px-6 py-4">
//                     <span className={cn(
//                       "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
//                       leave.status === 'pending' ? "bg-orange-50 text-orange-600" :
//                       leave.status === 'approved' ? "bg-emerald-50 text-emerald-600" :
//                       "bg-red-50 text-red-600"
//                     )}>
//                       {leave.status}
//                     </span>
//                   </td>
//                   {isAdmin && (
//                     <td className="px-6 py-4 text-right">
//                       {leave.status === 'pending' && (
//                         <div className="flex items-center justify-end gap-2">
//                           <button 
//                             onClick={() => updateStatus(leave.id, 'approved')}
//                             className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-100"
//                           >
//                             <CheckCircle2 size={16} />
//                           </button>
//                           <button 
//                             onClick={() => updateStatus(leave.id, 'rejected')}
//                             className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
//                           >
//                             <XCircle size={16} />
//                           </button>
//                         </div>
//                       )}
//                     </td>
//                   )}
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Modal */}
//       <AnimatePresence>
//         {showModal && (
//           <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
//             <motion.div 
//               initial={{ opacity: 0 }} 
//               animate={{ opacity: 1 }} 
//               exit={{ opacity: 0 }} 
//               onClick={() => setShowModal(false)}
//               className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
//             />
//             <motion.div 
//               initial={{ opacity: 0, scale: 0.95, y: 20 }}
//               animate={{ opacity: 1, scale: 1, y: 0 }}
//               exit={{ opacity: 0, scale: 0.95, y: 20 }}
//               className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
//             >
//               <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
//                 <h3 className="text-xl font-bold text-slate-900">Request Leave</h3>
//                 <p className="text-sm text-slate-500">Fill in the details for your time off request.</p>
//               </div>
//               <form onSubmit={handleSubmit} className="p-8 space-y-6">
//                 <div className="grid grid-cols-2 gap-4">
//                   <div className="col-span-2 space-y-1.5">
//                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Leave Type</label>
//                     <select 
//                       value={formData.type} 
//                       onChange={e => setFormData({ ...formData, type: e.target.value })}
//                       className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
//                     >
//                       <option>Annual Leave</option>
//                       <option>Sick Leave</option>
//                       <option>Casual Leave</option>
//                       <option>Maternity Leave</option>
//                       <option>Paternity Leave</option>
//                       <option>Unpaid Leave</option>
//                     </select>
//                   </div>
//                   <div className="space-y-1.5">
//                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Start Date</label>
//                     <input 
//                       type="date" required 
//                       value={formData.start_date}
//                       onChange={e => setFormData({ ...formData, start_date: e.target.value })}
//                       className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
//                     />
//                   </div>
//                   <div className="space-y-1.5">
//                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">End Date</label>
//                     <input 
//                       type="date" required 
//                       value={formData.end_date}
//                       onChange={e => setFormData({ ...formData, end_date: e.target.value })}
//                       className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
//                     />
//                   </div>
//                 </div>
//                 <div className="space-y-1.5">
//                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reason</label>
//                    <textarea 
//                      rows={3} required
//                      value={formData.reason}
//                      onChange={e => setFormData({ ...formData, reason: e.target.value })}
//                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium resize-none"
//                      placeholder="Brief description of the reason for leave..."
//                    />
//                 </div>
//                 <div className="flex gap-3 pt-2">
//                   <button 
//                     type="button" 
//                     onClick={() => setShowModal(false)}
//                     className="flex-1 px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
//                   >
//                     Cancel
//                   </button>
//                   <button 
//                     type="submit" 
//                     disabled={loading}
//                     className="flex-1 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50"
//                   >
//                     Submit Request
//                   </button>
//                 </div>
//               </form>
//             </motion.div>
//           </div>
//         )}
//       </AnimatePresence>
//     </div>
//   );
// }
