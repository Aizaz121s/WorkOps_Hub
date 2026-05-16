/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar, Sidebar } from './components/layout/Shell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import EmployeeProfile from './pages/EmployeeProfile';
import AddEmployee from './pages/AddEmployee';
import ChangePassword from './pages/ChangePassword';

import Attendance from './pages/Attendance';
import Leaves from './pages/Leaves';
import Payroll from './pages/Payroll';
import Recruitment from './pages/Recruitment';
import Settings from './pages/Settings';
import Chat from './pages/Chat';


export interface User {
  id: number;
  email: string;
  must_change_password?: number;
  role: 'super_admin' | 'company_admin' | 'hr_manager' | 'department_manager' | 'employee';
}

export interface Employee {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  department_name?: string;
  designation_name?: string;
  status: 'active' | 'inactive';
  joining_date: string;
  profile_image?: string | null;
  user_id?: number;
role?: string;
role_name?: string;
}

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  departmentsCount: number;
  monthlyHiringTrend?: Array<{
  name: string;
  count: number;
}>;

recentActivity?: Array<{
  type: string;
  title: string;
  description: string;
  created_at: string;
}>;
  pendingLeaves: number;
  attendanceToday: number;
}

function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <Navbar setIsSidebarOpen={setIsSidebarOpen} />
      <main className="lg:pl-64 min-h-[calc(100vh-64px)]">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="employees" element={<Employees />} />
            <Route path="employees/add" element={<AddEmployee />} />
            <Route path="employees/:id" element={<EmployeeProfile />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="leaves" element={<Leaves />} />
            <Route path="payroll" element={<Payroll />} />
            <Route path="recruitment" element={<Recruitment />} />
            <Route path="settings" element={<Settings />} />
            <Route path="chat" element={<Chat />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
