import React, { useEffect, useState } from 'react';
import {
  Users,
  UserCheck,
  FileText,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ChevronRight,
  Lock,
  User,
  ClipboardList,
  CheckCircle2,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DashboardStats } from '../App';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type MonthlySummary = {
  present: number;
  absent: number;
  totalHours: number;
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

const emptyLeaveSummary: LeaveSummary = {
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

export default function Dashboard() {
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendStatus, setAttendStatus] = useState<any>(null);
  const [permissions, setPermissions] = useState<any>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary>({
    present: 0,
    absent: 0,
    totalHours: 0,
  });
  const [leaveSummary, setLeaveSummary] = useState<LeaveSummary>(emptyLeaveSummary);
  const [myEmployee, setMyEmployee] = useState<any>(null);

  const getHeaders = (): HeadersInit => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const headers = getHeaders();

    const fetchData = async () => {
      try {
        const [
          statsRes,
          attendRes,
          permissionsRes,
          monthlyRes,
          leaveSummaryRes,
          employeesRes,
        ] = await Promise.all([
          fetch('/api/dashboard/stats', { headers }),
          fetch('/api/attendance/status', { headers }),
          fetch('/api/permissions', { headers }),
          fetch('/api/attendance/monthly-summary', { headers }),
          fetch('/api/leaves/summary', { headers }),
          fetch('/api/employees', { headers }),
        ]);

        const statsData = await statsRes.json();
        const attendData = await attendRes.json();
        const permissionsData = await permissionsRes.json();
        const monthlyData = await monthlyRes.json();
        const leaveData = await leaveSummaryRes.json();
        const employeesData = await employeesRes.json();

        if (statsData.success) setStats(statsData.data);
        if (attendData.success) setAttendStatus(attendData.data);
        if (permissionsData.success) setPermissions(permissionsData.data);
        if (monthlyData.success) setMonthlySummary(monthlyData.data);
        if (leaveData.success) setLeaveSummary(leaveData.data);

        if (employeesData.success && Array.isArray(employeesData.data)) {
          const own = employeesData.data.find((e: any) => e.user_id === user?.id);
          setMyEmployee(own || employeesData.data[0] || null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const hasAnyHrPermission =
    Boolean(permissions?.canManageEmployees) ||
    Boolean(permissions?.canManageLeaves) ||
    Boolean(permissions?.canManageAttendance);

  const showAdminDashboard = user?.role === 'super_admin' || (user?.role === 'hr_manager' && hasAnyHrPermission);

  if (!showAdminDashboard) {
    return (
      <EmployeeDashboard
        user={user}
        attendStatus={attendStatus}
        monthlySummary={monthlySummary}
        leaveSummary={leaveSummary}
        myEmployee={myEmployee}
      />
    );
  }

  return (
    <AdminDashboard
      stats={stats}
      attendStatus={attendStatus}
      permissions={permissions}
      role={user?.role}
    />
  );
}

function AdminDashboard({
  stats,
  attendStatus,
  permissions,
  role,
}: {
  stats: DashboardStats | null;
  attendStatus: any;
  permissions: any;
  role?: string;
}) {
  const safeStats = stats || {
    totalEmployees: 0,
    attendanceToday: 0,
    departmentsCount: 0,
    pendingLeaves: 0,
  };

  const cards = [
    {
      title: 'Total Employees',
      value: safeStats.totalEmployees,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      trend: 'Live',
      up: true,
    },
    {
      title: 'Attendance Today',
      value: safeStats.attendanceToday,
      icon: UserCheck,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      trend: 'Live',
      up: true,
    },
    {
      title: 'Departments',
      value: safeStats.departmentsCount,
      icon: FileText,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      trend: 'Active',
      up: null,
    },
    {
      title: 'Pending Leaves',
      value: safeStats.pendingLeaves,
      icon: Calendar,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      trend: 'Needs Action',
      up: false,
    },
  ];

  const quickLinks = [
    {
      label: 'Manage Employees',
      to: '/employees',
      enabled: role === 'super_admin' || permissions?.canManageEmployees,
      icon: Users,
    },
    {
      label: 'Attendance Report',
      to: '/attendance',
      enabled: role === 'super_admin' || permissions?.canManageAttendance,
      icon: Clock,
    },
    {
      label: 'Leave Requests',
      to: '/leaves',
      enabled: role === 'super_admin' || permissions?.canManageLeaves,
      icon: ClipboardList,
    },
    {
      label: 'Settings',
      to: '/settings',
      enabled: role === 'super_admin',
      icon: Lock,
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
          <p className="text-slate-500">
            Welcome back! Here's what's happening with your workforce.
          </p>
        </div>

        <Link
          to="/attendance"
          className="bg-white border border-slate-100 p-2 pl-4 rounded-2xl shadow-sm flex items-center gap-4 group hover:border-blue-200 transition-all"
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                attendStatus?.check_in && !attendStatus?.check_out
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-slate-300'
              }`}
            ></div>
            <p className="text-sm font-semibold text-slate-700">
              {attendStatus?.check_in && !attendStatus?.check_out
                ? 'On the Clock'
                : attendStatus?.check_out
                  ? 'Work Completed'
                  : 'Shift Not Started'}
            </p>
          </div>

          <div className="p-2 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
            <Clock size={18} />
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm shadow-slate-100/50"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-xl ${card.bg} ${card.color}`}>
                <card.icon size={22} />
              </div>

              {card.up !== null && (
                <div
                  className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    card.up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                  }`}
                >
                  {card.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {card.trend}
                </div>
              )}
            </div>

            <p className="text-sm font-medium text-slate-500">{card.title}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{card.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="text-blue-500" size={20} />
              Monthly Hiring Trend
            </h3>
            <select className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 outline-none">
              <option>Last 6 Months</option>
            </select>
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.monthlyHiringTrend || []}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    border: '1px solid #f1f5f9',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-6">Quick Actions</h3>

          <div className="space-y-3">
            {quickLinks.map(item => (
              item.enabled && (
                <Link
                  key={item.label}
                  to={item.to}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <item.icon size={18} />
                    </div>
                    <span className="text-sm font-bold text-slate-700">{item.label}</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-400" />
                </Link>
              )
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmployeeDashboard({
  user,
  attendStatus,
  monthlySummary,
  leaveSummary,
  myEmployee,
}: {
  user: any;
  attendStatus: any;
  monthlySummary: MonthlySummary;
  leaveSummary: LeaveSummary;
  myEmployee: any;
}) {
  const isCheckedIn = attendStatus?.check_in && !attendStatus?.check_out;
  const isCompleted = Boolean(attendStatus?.check_out);

  const cards = [
    {
      title: 'Present This Month',
      value: monthlySummary.present,
      sub: `${Number(monthlySummary.totalHours || 0).toFixed(1)} total hours`,
      icon: UserCheck,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Annual Leave',
      value: `${leaveSummary.annualRemaining}`,
      sub: `${leaveSummary.annualUsed}/${leaveSummary.annualLimit} used`,
      icon: Calendar,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Sick Leave',
      value: `${leaveSummary.sickRemaining}`,
      sub: `${leaveSummary.sickUsed}/${leaveSummary.sickLimit} used`,
      icon: FileText,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      title: 'Pending Requests',
      value: leaveSummary.pendingRequests,
      sub: 'awaiting approval',
      icon: ClipboardList,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome, {myEmployee?.first_name || user?.email}
        </h1>
        <p className="text-slate-500">
          Here is your personal work summary for today.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-3xl p-8 shadow-xl shadow-blue-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-blue-100 text-sm font-semibold">Today’s Status</p>
              <h2 className="text-3xl font-bold mt-2">
                {isCompleted ? 'Work Completed' : isCheckedIn ? 'You are on the clock' : 'Ready to start your shift'}
              </h2>
              <p className="text-blue-100 mt-2">
                Shift: {attendStatus?.shift_name || 'Not Assigned'} · {attendStatus?.shift_start || '--:--'} - {attendStatus?.shift_end || '--:--'}
              </p>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center">
              {isCompleted ? <CheckCircle2 size={28} /> : <Clock size={28} />}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="bg-white/10 rounded-2xl p-4">
              <p className="text-xs uppercase text-blue-100 font-bold">Check In</p>
              <p className="text-xl font-bold mt-1">{attendStatus?.check_in || '--:--'}</p>
            </div>

            <div className="bg-white/10 rounded-2xl p-4">
              <p className="text-xs uppercase text-blue-100 font-bold">Check Out</p>
              <p className="text-xl font-bold mt-1">{attendStatus?.check_out || '--:--'}</p>
            </div>
          </div>

          <Link
            to="/attendance"
            className="inline-flex items-center gap-2 mt-8 px-5 py-3 bg-white text-blue-700 rounded-xl font-bold hover:bg-blue-50 transition-colors"
          >
            Open Attendance
            <ChevronRight size={18} />
          </Link>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-lg mb-4">
            {myEmployee?.first_name?.[0] || user?.email?.[0] || 'U'}
            {myEmployee?.last_name?.[0] || ''}
          </div>

          <h3 className="text-xl font-bold text-slate-900">
            {myEmployee ? `${myEmployee.first_name} ${myEmployee.last_name}` : user?.email}
          </h3>

          <p className="text-sm text-slate-500 mt-1">{myEmployee?.employee_id || 'Employee'}</p>

          <div className="space-y-3 mt-6 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Department</span>
              <span className="font-semibold text-slate-800">{myEmployee?.department_name || '—'}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Designation</span>
              <span className="font-semibold text-slate-800">{myEmployee?.designation_name || '—'}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Status</span>
              <span className="font-semibold text-emerald-600">{myEmployee?.status || 'active'}</span>
            </div>
          </div>

          {myEmployee?.id && (
            <Link
              to={`/employees/${myEmployee.id}`}
              className="mt-6 flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <User size={18} />
              View My Profile
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {cards.map((card, idx) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"
          >
            <div className={`w-11 h-11 rounded-xl ${card.bg} ${card.color} flex items-center justify-center mb-4`}>
              <card.icon size={22} />
            </div>

            <p className="text-sm font-medium text-slate-500">{card.title}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{card.value}</h3>
            <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link to="/attendance" className="bg-white border border-slate-100 p-5 rounded-2xl hover:border-blue-200 hover:bg-blue-50/40 transition-all">
          <Clock className="text-blue-600 mb-3" size={22} />
          <p className="font-bold text-slate-900">Attendance</p>
          <p className="text-xs text-slate-500 mt-1">Check in, check out, and view history.</p>
        </Link>

        <Link to="/leaves" className="bg-white border border-slate-100 p-5 rounded-2xl hover:border-blue-200 hover:bg-blue-50/40 transition-all">
          <Calendar className="text-orange-600 mb-3" size={22} />
          <p className="font-bold text-slate-900">Request Leave</p>
          <p className="text-xs text-slate-500 mt-1">Submit and track your leave requests.</p>
        </Link>

        <Link to="/change-password" className="bg-white border border-slate-100 p-5 rounded-2xl hover:border-blue-200 hover:bg-blue-50/40 transition-all">
          <Lock className="text-purple-600 mb-3" size={22} />
          <p className="font-bold text-slate-900">Change Password</p>
          <p className="text-xs text-slate-500 mt-1">Update your login password.</p>
        </Link>

        <Link to="/chat" className="bg-white border border-slate-100 p-5 rounded-2xl hover:border-blue-200 hover:bg-blue-50/40 transition-all">
          <Users className="text-emerald-600 mb-3" size={22} />
          <p className="font-bold text-slate-900">Internal Chat</p>
          <p className="text-xs text-slate-500 mt-1">Message your team internally.</p>
        </Link>
      </div>
    </div>
  );
}
