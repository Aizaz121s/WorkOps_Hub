import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, Mail, Phone, MapPin, Calendar, Briefcase, 
  User, Building2, CreditCard, ShieldCheck, Clock,
  FileText, Edit3, Contact
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

interface DetailedEmployee {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  dob: string | null;
  gender: string | null;
  shift_id: number | null;
  shift_name?: string | null;
  joining_date: string;
  department_name: string | null;
  designation_name: string | null;
  salary: number | null;
  user_id: number;
role_name?: string | null;
role?: string | null;
  status: 'active' | 'inactive';
  profile_image: string | null;
  job_history?: Array<{
    id: number;
    job_title: string;
    department: string;
    start_date: string;
    end_date: string | null;
  }>;
}

export default function EmployeeProfile() {
  const { user: currentUser } = useAuth();
  const { id } = useParams();
  const [employee, setEmployee] = useState<DetailedEmployee | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [shifts, setShifts] = useState<any[]>([]);
  const [canManageEmployees, setCanManageEmployees] = useState(false);

  // useEffect(() => {
  //   const token = localStorage.getItem('token');
  //   const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

  //   fetch(`/api/employees/${id}`, { headers })
  //     .then(res => res.json())
  //     .then(data => {
  //       if (data.success) setEmployee(data.data);
  //       setLoading(false);
  //     });
    
  //   fetch('/api/shifts', { headers })
  //     .then(res => res.json())
  //     .then(data => {
  //       if (data.success) setShifts(data.data);
  //     });
  // }, [id]);
  useEffect(() => {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

  fetch(`/api/employees/${id}`, { headers })
    .then(res => res.json())
    .then(data => {
      if (data.success) setEmployee(data.data);
      setLoading(false);
    });

  fetch('/api/shifts', { headers })
    .then(res => res.json())
    .then(data => {
      if (data.success) setShifts(data.data);
    });

  fetch('/api/permissions', { headers })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setCanManageEmployees(Boolean(data.data.canManageEmployees));
      }
    });
}, [id]);

  const assignShift = async (shiftId: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/employees/${employee?.id}/shift`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ shift_id: shiftId })
      });
      const data = await res.json();
      if (data.success) {
        setEmployee(prev => prev ? { ...prev, shift_id: shiftId, shift_name: shifts.find(s => s.id === shiftId)?.name } : null);
      }
    } catch (err) { console.error(err); }
  };

  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'hr_manager';
  const isOwnProfile = employee?.user_id === currentUser?.id;

const isSuperAdminProfile =
  employee?.role_name === 'super_admin' || employee?.role === 'super_admin';

const canEditThisEmployee = () => {
  if (!employee || !currentUser) return false;

  if (currentUser.role === 'super_admin') {
    return true;
  }

  if (currentUser.role === 'hr_manager' && canManageEmployees) {
    if (isOwnProfile) return false;
    if (isSuperAdminProfile) return false;

    return true;
  }

  return false;
};

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/employees/${id}/image`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ image: base64 })
        });
        const data = await res.json();
        if (data.success) {
          setEmployee(prev => prev ? { ...prev, profile_image: base64 } : null);
        }
      } catch (err) { console.error(err); }
      finally { setUploading(false); }
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-20">
        <div className="text-slate-400 mb-4 flex justify-center"><User size={48} /></div>
        <h2 className="text-xl font-bold text-slate-900">Employee Not Found</h2>
        <p className="text-slate-500 mt-2">The employee you're looking for doesn't exist or has been removed.</p>
        <Link to="/employees" className="mt-6 inline-flex items-center gap-2 text-blue-600 font-medium hover:underline">
          <ArrowLeft size={16} /> Back to Employees
        </Link>
      </div>
    );
  }

  const sections = [
    {
      title: 'Personal Information',
      icon: User,
      fields: [
        { label: 'Full Name', value: `${employee.first_name} ${employee.last_name}`, icon: User },
        { label: 'Date of Birth', value: employee.dob ? new Date(employee.dob).toLocaleDateString() : 'Not Set', icon: Calendar },
        { label: 'Gender', value: employee.gender || 'Not Specified', icon: User },
      ]
    },
    {
      title: 'Contact Details',
      icon: Contact,
      fields: [
        { label: 'Work Email', value: employee.email, icon: Mail },
        { label: 'Phone Number', value: employee.phone || 'Not Provided', icon: Phone },
        { label: 'Office Location', value: 'Headquarters, NY', icon: MapPin },
      ]
    },
    {
      title: 'Employment Information',
      icon: Building2,
      fields: [
        { label: 'Employee ID', value: employee.employee_id, icon: ShieldCheck },
        { label: 'Department', value: employee.department_name || 'Unassigned', icon: Building2 },
        { label: 'Designation', value: employee.designation_name || 'General Staff', icon: Briefcase },
        { label: 'Current Shift', value: employee.shift_name || 'Unassigned', icon: Clock },
        { label: 'Joining Date', value: new Date(employee.joining_date).toLocaleDateString(), icon: Clock },
      ]
    },
    {
      title: 'Financial Information',
      icon: CreditCard,
      fields: [
        { label: 'Monthly Salary', value: employee.salary ? `$${employee.salary.toLocaleString()}` : 'Confidential', icon: CreditCard },
        { label: 'Payment Method', value: 'Bank Transfer', icon: CreditCard },
        { label: 'Tax ID', value: 'TX-8829-11', icon: FileText },
      ]
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="flex items-start gap-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-3xl font-bold shadow-lg shadow-blue-200 overflow-hidden">
              {employee.profile_image ? (
                <img src={employee.profile_image} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <>{employee.first_name[0]}{employee.last_name[0]}</>
              )}
            </div>
            <label className="absolute -bottom-2 -right-2 p-2 bg-white rounded-xl shadow-md border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              {uploading ? (
                <Clock className="animate-spin text-blue-600" size={16} />
              ) : (
                <Edit3 className="text-blue-600" size={16} />
              )}
            </label>
          </div>
          <div className="pt-2">
            <Link to="/employees" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors mb-2 uppercase tracking-wider">
              <ArrowLeft size={14} /> Back to Directory
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 leading-tight">
              {employee.first_name} {employee.last_name}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-slate-600 font-medium">{employee.designation_name || 'Employee'}</p>
              <div className="w-1 h-1 rounded-full bg-slate-300"></div>
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                employee.status === 'active' ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              )}>
                {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
              </span>
            </div>
          </div>
        </div>
        {canEditThisEmployee() && (
  <div className="flex items-center gap-3">
    <Link
      to={`/employees/${employee.id}?edit=true`}
      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
    >
      <Edit3 size={18} />
      Edit Profile
    </Link>
  </div>
)}
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-8">
          {sections.map((section, idx) => (
            <motion.div 
              key={section.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
                <section.icon size={18} className="text-blue-600" />
                <h3 className="font-bold text-slate-900">{section.title}</h3>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                {section.fields.map((field) => (
                  <div key={field.label} className="space-y-1">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{field.label}</p>
                    <div className="flex items-center gap-2.5">
                      <field.icon size={16} className="text-slate-300" />
                      <p className="text-sm font-medium text-slate-700">{field.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}

          {/* Job History Section */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sections.length * 0.1 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
              <Clock size={18} className="text-blue-600" />
              <h3 className="font-bold text-slate-900">Job History</h3>
            </div>
            <div className="p-6">
              <div className="relative border-l-2 border-slate-100 ml-3 space-y-8 pb-4">
                {employee.job_history && employee.job_history.length > 0 ? (
                  employee.job_history.map((job, idx) => (
                    <div key={job.id} className="relative pl-8">
                      <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-blue-500 shadow-sm"></div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-slate-900">{job.job_title}</h4>
                          <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <Building2 size={14} />
                            {job.department}
                          </p>
                        </div>
                        <div className="text-sm font-medium text-slate-500 bg-slate-50 px-3 py-1 rounded-full flex items-center gap-2">
                          <Calendar size={14} />
                          {new Date(job.start_date).toLocaleDateString()} - {job.end_date ? new Date(job.end_date).toLocaleDateString() : 'Present'}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="pl-8 text-slate-500 italic py-4">No job history records found.</div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-8">
          {/* Quick Actions */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl shadow-slate-200">
            <h3 className="font-bold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm">
                <span>Request Report</span>
                <ArrowLeft size={16} className="rotate-180 opacity-50" />
              </button>
              <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm">
                <span>View Attendance</span>
                <ArrowLeft size={16} className="rotate-180 opacity-50" />
              </button>
              <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm">
                <span>Manage Leaves</span>
                <ArrowLeft size={16} className="rotate-180 opacity-50" />
              </button>
            </div>
          </div>

          {isAdmin && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Clock size={18} className="text-blue-600" />
                Assign Shift
              </h3>
              <div className="space-y-2">
                {shifts.map(shift => (
                  <button 
                    key={shift.id}
                    onClick={() => assignShift(shift.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all",
                      employee.shift_id === shift.id 
                        ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100" 
                        : "border-slate-100 hover:border-blue-200 text-slate-600"
                    )}
                  >
                    {shift.name}
                    <p className={cn(
                      "text-[10px] mt-0.5",
                      employee.shift_id === shift.id ? "text-blue-100" : "text-slate-400"
                    )}>{shift.start_time} - {shift.end_time}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent Milestones */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Recent Milestones</h3>
            <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
              {[
                { date: '1 Year Ago', label: 'Joined the company' },
                { date: '6 Months Ago', label: 'Passed Probation' },
                { date: '2 Months Ago', label: 'Promotion to ' + (employee.designation_name || 'Staff') },
              ].map((item, idx) => (
                <div key={idx} className="relative pl-8">
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-blue-50 border-4 border-white shadow-sm flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">{item.date}</p>
                    <p className="text-sm text-slate-600 mt-0.5">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
