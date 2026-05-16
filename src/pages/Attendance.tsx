import React, { useState, useEffect } from "react";
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  CheckCircle2,
  Users,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

type AttendanceStatus = {
  id?: number;
  date?: string;
  check_in?: string;
  check_out?: string;
  total_hours?: number;
  status?: string;
  shift_name?: string;
  shift_start?: string;
  shift_end?: string;
};

type MonthlySummary = {
  present: number;
  absent: number;
  totalHours: number;
};

type MyHistoryRow = {
  id: number;
  date: string;
  check_in?: string;
  check_out?: string;
  total_hours?: number;
  status?: string;
  shift_name?: string;
};

type AttendanceReportRow = {
  id: number;
  date: string;
  check_in?: string;
  check_out?: string;
  total_hours?: number;
  status?: string;
  employee_db_id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  department_name?: string;
  designation_name?: string;
  shift_name?: string;
};

export default function Attendance() {
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [summary, setSummary] = useState<MonthlySummary>({
    present: 0,
    absent: 0,
    totalHours: 0,
  });
  const [myHistory, setMyHistory] = useState<MyHistoryRow[]>([]);
  const [report, setReport] = useState<AttendanceReportRow[]>([]);
  const [canManageAttendance, setCanManageAttendance] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchPageData();

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => clearInterval(timer);
  }, []);

  const getHeaders = (): HeadersInit => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchPageData = async () => {
    setActionError("");
    setLoading(true);

    try {
      const headers = getHeaders();

      const [statusRes, summaryRes, historyRes, permissionsRes] =
        await Promise.all([
          fetch("/api/attendance/status", { headers }),
          fetch("/api/attendance/monthly-summary", { headers }),
          fetch("/api/attendance/my-history?days=30", { headers }),
          fetch("/api/permissions", { headers }),
        ]);

      const statusData = await statusRes.json();
      const summaryData = await summaryRes.json();
      const historyData = await historyRes.json();
      const permissionsData = await permissionsRes.json();

      if (statusData.success) {
        setStatus(statusData.data);
      }

      if (summaryData.success) {
        setSummary(summaryData.data);
      }

      if (historyData.success) {
        setMyHistory(historyData.data);
      }

      if (permissionsData.success) {
        const allowed = Boolean(permissionsData.data.canManageAttendance);
        setCanManageAttendance(allowed);

        if (allowed) {
          fetchAttendanceReport();
        }
      }
    } catch {
      setActionError("Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceReport = async () => {
    setReportLoading(true);

    try {
      const yesterday = getYesterdayDate();

      const res = await fetch(
        `/api/attendance/report?from=${yesterday}&to=${yesterday}`,
        {
          headers: getHeaders(),
        },
      );

      const data = await res.json();

      if (data.success) {
        setReport(data.data);
      }
    } catch {
      setActionError("Failed to load attendance report");
    } finally {
      setReportLoading(false);
    }
  };

  const handleAction = async (action: "check-in" | "check-out") => {
    setLoading(true);
    setActionError("");

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`/api/attendance/${action}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await res.json();

      if (data.success) {
        await fetchPageData();
      } else {
        setActionError(data.message || `Failed to ${action}`);
      }
    } catch {
      setActionError("Connection error while updating attendance");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString();
  };

  const formatHours = (hours?: number) => {
    if (!hours) return "—";
    return `${Number(hours).toFixed(2)} hrs`;
  };

  const visibleMyHistory = myHistory.slice(0, 5);

  const getYesterdayDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().slice(0, 10);
  };

  const downloadCsv = (filename: string, rows: Record<string, any>[]) => {
    if (!rows.length) {
      setActionError("No data available to export");
      return;
    }

    const headers = Object.keys(rows[0]);

    const csvRows = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => {
            const value = row[header] ?? "";
            return `"${String(value).replace(/"/g, '""')}"`;
          })
          .join(","),
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  };

  const exportMyHistory = () => {
    const rows = myHistory.map((row) => ({
      Date: formatDate(row.date),
      Shift: row.shift_name || "",
      "Check In": row.check_in || "",
      "Check Out": row.check_out || "",
      "Total Hours": row.total_hours || 0,
      Status: row.status || "",
    }));

    downloadCsv("my-attendance-last-30-days.csv", rows);
  };

  const exportAttendanceReport = () => {
    const rows = report.map((row) => ({
      Employee: `${row.first_name} ${row.last_name}`,
      Email: row.email,
      Department: row.department_name || "",
      Designation: row.designation_name || "",
      Date: formatDate(row.date),
      Shift: row.shift_name || "",
      "Check In": row.check_in || "",
      "Check Out": row.check_out || "",
      "Total Hours": row.total_hours || 0,
      Status: row.status || "",
    }));

    downloadCsv(`all-attendance-report-${getYesterdayDate()}.csv`, rows);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
          <p className="text-slate-500">
            Track your daily work hours and check-in status.
          </p>
        </div>

        {canManageAttendance && (
          <button
            type="button"
            onClick={() => setShowReport((prev) => !prev)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 border border-slate-200 bg-white text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all active:scale-95"
          >
            <BarChart3 size={18} />
            {showReport ? "Hide Report" : "All Attendance Report"}
          </button>
        )}
      </div>

      {actionError && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2">
          <AlertCircle size={18} />
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Check-in Card */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-8 flex flex-col items-center justify-center text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-4xl font-bold text-slate-900 tabular-nums">
              {currentTime.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              })}
            </h2>

            <p className="text-slate-500 font-medium">
              {currentTime.toLocaleDateString([], {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <div className="flex gap-4 w-full max-w-sm">
            {!status?.check_in ? (
              <button
                onClick={() => handleAction("check-in")}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-50"
              >
                <LogIn size={24} />
                Check In
              </button>
            ) : !status?.check_out ? (
              <button
                onClick={() => handleAction("check-out")}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-orange-200 active:scale-95 disabled:opacity-50"
              >
                <LogOut size={24} />
                Check Out
              </button>
            ) : (
              <div className="flex-1 bg-slate-100 text-slate-500 font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
                <CheckCircle2 size={24} className="text-emerald-500" />
                Work Completed Today
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 w-full pt-6 border-t border-slate-100">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">
                Check In
              </p>
              <p className="text-lg font-bold text-slate-900">
                {status?.check_in || "--:--"}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">
                Check Out
              </p>
              <p className="text-lg font-bold text-slate-900">
                {status?.check_out || "--:--"}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">
                Total Hours
              </p>
              <p className="text-lg font-bold text-slate-900">
                {formatHours(status?.total_hours)}
              </p>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="space-y-6">
          <div className="bg-blue-600 text-white rounded-2xl p-6 shadow-xl shadow-blue-200">
            <h3 className="font-bold flex items-center gap-2 mb-4">
              <Clock size={20} />
              Shift Overview
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="opacity-80">Shift Name</span>
                <span className="font-bold">
                  {status?.shift_name || "Loading..."}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="opacity-80">Check-in Time</span>
                <span className="font-bold">
                  {status?.shift_start || "--:--"}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="opacity-80">Check-out Time</span>
                <span className="font-bold">
                  {status?.shift_end || "--:--"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Calendar size={20} className="text-purple-600" />
              This Month
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-emerald-50 rounded-xl">
                <p className="text-xs text-emerald-600 font-bold uppercase">
                  Present
                </p>
                <p className="text-xl font-bold text-emerald-700">
                  {summary.present}
                </p>
              </div>

              <div className="p-3 bg-red-50 rounded-xl">
                <p className="text-xs text-red-600 font-bold uppercase">
                  Absent
                </p>
                <p className="text-xl font-bold text-red-700">
                  {summary.absent}
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500 font-bold uppercase">
                Total Hours
              </p>
              <p className="text-xl font-bold text-slate-900">
                {Number(summary.totalHours || 0).toFixed(2)} hrs
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* My 30 Days History */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div>
            <h3 className="font-bold text-slate-900">History</h3>
            <p className="text-xs text-slate-500">
              Showing latest 5 days. Export downloads your full last 30 days
              history.
            </p>
          </div>

          <button
            type="button"
            onClick={exportMyHistory}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Export Excel
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Shift</th>
                <th className="px-6 py-4">Check In</th>
                <th className="px-6 py-4">Check Out</th>
                <th className="px-6 py-4">Total Hours</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    Loading history...
                  </td>
                </tr>
              ) : visibleMyHistory.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    No attendance history found.
                  </td>
                </tr>
              ) : (
                visibleMyHistory.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {formatDate(row.date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {row.shift_name || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {row.check_in || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {row.check_out || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-700">
                      {formatHours(row.total_hours)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          row.status === "present"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-red-50 text-red-600",
                        )}
                      >
                        {row.status || "—"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin/HR Report */}
      {canManageAttendance && showReport && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <div>
              <h3 className="font-bold text-slate-900">
                Yesterday Attendance Report
              </h3>
              <p className="text-xs text-slate-500">
                Visible only to Super Admin and HR with attendance permission.
              </p>
            </div>

            <button
              type="button"
              onClick={exportAttendanceReport}
              className="flex items-center gap-2 px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Export Excel
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Shift</th>
                  <th className="px-6 py-4">Check In</th>
                  <th className="px-6 py-4">Check Out</th>
                  <th className="px-6 py-4">Total Hours</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {reportLoading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-10 text-center text-slate-500"
                    >
                      Loading report...
                    </td>
                  </tr>
                ) : report.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-10 text-center text-slate-500"
                    >
                      No attendance report found.
                    </td>
                  </tr>
                ) : (
                  report.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-slate-900">
                          {row.first_name} {row.last_name}
                        </p>
                        <p className="text-xs text-slate-400">{row.email}</p>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {row.department_name || "—"}
                      </td>

                      <td className="px-6 py-4 text-sm font-medium text-slate-700">
                        {formatDate(row.date)}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {row.shift_name || "—"}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {row.check_in || "—"}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {row.check_out || "—"}
                      </td>

                      <td className="px-6 py-4 text-sm font-bold text-slate-700">
                        {formatHours(row.total_hours)}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            row.status === "present"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-red-50 text-red-600",
                          )}
                        >
                          {row.status || "—"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
// import React, { useState, useEffect } from 'react';
// import { Clock, LogIn, LogOut, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
// import { motion } from 'motion/react';
// import { cn } from '../lib/utils';

// export default function Attendance() {
//   const [status, setStatus] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [currentTime, setCurrentTime] = useState(new Date());

//   useEffect(() => {
//     fetchStatus();
//     const timer = setInterval(() => setCurrentTime(new Date()), 1000);
//     return () => clearInterval(timer);
//   }, []);

//   const fetchStatus = async () => {
//     try {
//       const token = localStorage.getItem('token');
//       const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
//       const res = await fetch('/api/attendance/status', { headers });
//       const data = await res.json();
//       if (data.success) setStatus(data.data);
//     } catch (err) { console.error(err); }
//     finally { setLoading(false); }
//   };

//   const handleAction = async (action: 'check-in' | 'check-out') => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem('token');
//       const res = await fetch(`/api/attendance/${action}`, {
//         method: 'POST',
//         headers: { 'Authorization': `Bearer ${token}` }
//       });
//       const data = await res.json();
//       if (data.success) await fetchStatus();
//     } catch (err) { console.error(err); }
//     finally { setLoading(false); }
//   };

//   return (
//     <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
//       <div>
//         <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
//         <p className="text-slate-500">Track your daily work hours and check-in status.</p>
//       </div>

//       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
//         {/* Check-in Card */}
//         <div className="md:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-8 flex flex-col items-center justify-center text-center space-y-6">
//           <div className="space-y-2">
//             <h2 className="text-4xl font-bold text-slate-900 tabular-nums">
//               {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
//             </h2>
//             <p className="text-slate-500 font-medium">
//               {currentTime.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
//             </p>
//           </div>

//           <div className="flex gap-4 w-full max-w-sm">
//             {!status?.check_in ? (
//               <button
//                 onClick={() => handleAction('check-in')}
//                 disabled={loading}
//                 className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-50"
//               >
//                 <LogIn size={24} />
//                 Check In
//               </button>
//             ) : !status?.check_out ? (
//               <button
//                 onClick={() => handleAction('check-out')}
//                 disabled={loading}
//                 className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-orange-200 active:scale-95 disabled:opacity-50"
//               >
//                 <LogOut size={24} />
//                 Check Out
//               </button>
//             ) : (
//               <div className="flex-1 bg-slate-100 text-slate-500 font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
//                 <CheckCircle2 size={24} className="text-emerald-500" />
//                 Work Completed Today
//               </div>
//             )}
//           </div>

//           <div className="grid grid-cols-2 gap-4 w-full pt-6 border-t border-slate-100">
//             <div>
//               <p className="text-xs font-bold text-slate-400 uppercase">Check In</p>
//               <p className="text-lg font-bold text-slate-900">{status?.check_in || '--:--'}</p>
//             </div>
//             <div>
//               <p className="text-xs font-bold text-slate-400 uppercase">Check Out</p>
//               <p className="text-lg font-bold text-slate-900">{status?.check_out || '--:--'}</p>
//             </div>
//           </div>
//         </div>

//         {/* Info Card */}
//         <div className="space-y-6">
//           <div className="bg-blue-600 text-white rounded-2xl p-6 shadow-xl shadow-blue-200">
//             <h3 className="font-bold flex items-center gap-2 mb-4">
//               <Clock size={20} />
//               Shift Overview
//             </h3>
//             <div className="space-y-4">
//               <div className="flex justify-between items-center text-sm">
//                 <span className="opacity-80">Shift Name</span>
//                 <span className="font-bold">{status?.shift_name || 'Loading...'}</span>
//               </div>
//               <div className="flex justify-between items-center text-sm">
//                 <span className="opacity-80">Check-in Time</span>
//                 <span className="font-bold">{status?.shift_start || '--:--'}</span>
//               </div>
//               <div className="flex justify-between items-center text-sm">
//                 <span className="opacity-80">Check-out Time</span>
//                 <span className="font-bold">{status?.shift_end || '--:--'}</span>
//               </div>
//             </div>
//           </div>

//           <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
//             <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
//               <Calendar size={20} className="text-purple-600" />
//               This Month
//             </h3>
//             <div className="grid grid-cols-2 gap-4">
//               <div className="p-3 bg-emerald-50 rounded-xl">
//                 <p className="text-xs text-emerald-600 font-bold uppercase">Present</p>
//                 <p className="text-xl font-bold text-emerald-700">18</p>
//               </div>
//               <div className="p-3 bg-red-50 rounded-xl">
//                 <p className="text-xs text-red-600 font-bold uppercase">Absent</p>
//                 <p className="text-xl font-bold text-red-700">2</p>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
