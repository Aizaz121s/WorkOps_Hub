import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Building, Bell, Shield, Save, Loader2, Globe, Mail, Phone, Info, Clock, Plus, Trash2, Users, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function Settings() {
  const { user } = useAuth();
const isSuperAdmin = user?.role === 'super_admin';
const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>({
    company_name: '',
  company_email: '',
  company_phone: '',
  timezone: 'UTC +5:30',
  currency: 'USD',
  tax_number: '',
  leave_limit: '15',
  allow_hr_employee_management: 'false',
  allow_hr_leave_management: "false",
  allow_hr_attendance_management: "false",
  });

  const [shifts, setShifts] = useState<any[]>([]);

  useEffect(() => {
    fetchSettings();
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    const token = localStorage.getItem('token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch('/api/shifts', { headers });
    const data = await res.json();
    if (data.success) setShifts(data.data);
  };

  const addShift = async () => {
    const name = prompt("Enter Shift Name (e.g., Morning):");
    if (!name) return;
    const start = prompt("Enter Start Time (e.g., 09:00 AM):", "09:00 AM");
    if (!start) return;
    const end = prompt("Enter End Time (e.g., 06:00 PM):", "06:00 PM");
    if (!end) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, start_time: start, end_time: end })
      });
      const data = await res.json();
      if (data.success) fetchShifts();
    } catch (err) { console.error(err); }
  };

  const deleteShift = async (id: number) => {
    if (!confirm("Are you sure you want to delete this shift?")) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/shifts/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) fetchShifts();
    } catch (err) { console.error(err); }
  };

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch('/api/settings', { headers });
      const data = await res.json();
      if (data.success) setSettings((prev: any) => ({ ...prev, ...data.data }));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
  alert('Only Super Admin can save settings.');
  return;
}
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) alert('Settings saved successfully!');
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const sections = [
    { id: 'general', label: 'General Information', icon: Building },
    { id: 'shifts', label: 'Shift Management', icon: Clock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Privacy & Security', icon: Shield },
   // {id:'ChangePassword',label:'Change Password',icon:Lock},
  ];

  const [activeSec, setActiveSec] = useState('general');

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
        <p className="text-slate-500">Configure your organization details and system preferences.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-64 space-y-1">
  {sections.map(sec => (
    <button
      key={sec.id}
      onClick={() => setActiveSec(sec.id)}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
        activeSec === sec.id
          ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
          : "text-slate-600 hover:bg-slate-100"
      )}
    >
      <sec.icon size={18} />
      {sec.label}
    </button>
  ))}

  <button
    type="button"
    onClick={() => navigate('/change-password')}
    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all"
  >
    <Lock size={18} />
    Change Password
  </button>
</div>

        <div className="flex-1 space-y-6">
          <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
               <h3 className="font-bold text-slate-900 flex items-center gap-2">
                 <Info size={18} className="text-blue-600" />
                 {sections.find(s => s.id === activeSec)?.label}
               </h3>
               <button 
                 type="submit" 
                 disabled={saving}
                 className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
               >
                 {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                 Save changes
               </button>
            </div>

            <div className="p-8 space-y-8">
              {activeSec === 'general' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Company Name</label>
                    <div className="relative">
                       <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                       <input 
                         value={settings.company_name} 
                         onChange={e => setSettings({...settings, company_name: e.target.value})}
                         className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                       />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Company Email</label>
                    <div className="relative">
                       <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                       <input 
                         value={settings.company_email} 
                         onChange={e => setSettings({...settings, company_email: e.target.value})}
                         className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                       />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Company Phone</label>
                    <div className="relative">
                       <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                       <input 
                         value={settings.company_phone} 
                         onChange={e => setSettings({...settings, company_phone: e.target.value})}
                         className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                       />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Timezone</label>
                    <div className="relative">
                       <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                       <select 
                         value={settings.timezone} 
                         onChange={e => setSettings({...settings, timezone: e.target.value})}
                         className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                       >
                         <option>UTC +5:30 (India)</option>
                         <option>UTC +0:00 (GMT)</option>
                         <option>UTC -5:00 (EST)</option>
                       </select>
                    </div>
                  </div>
               </div>
              )}

              {activeSec === 'shifts' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {shifts.map(shift => (
                      <div key={shift.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl relative group">
                        <h4 className="font-bold text-slate-900">{shift.name}</h4>
                        <p className="text-xs text-slate-500 mt-1">{shift.start_time} - {shift.end_time}</p>
                        <button 
                          onClick={() => deleteShift(shift.id)}
                          className="absolute top-2 right-2 p-1.5 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={addShift}
                      className="p-4 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-blue-200 hover:text-blue-600 transition-all"
                    >
                      <Plus size={24} />
                      <span className="text-xs font-bold uppercase">Add Shift</span>
                    </button>
                  </div>
                </div>
              )}

              {activeSec === 'security' ? (
                <>
  <div className="space-y-4">
    <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex gap-4">
        <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
          <Users size={22} />
        </div>

        <div>
          <h4 className="font-bold text-slate-900">
            Allow HR to add and delete employees
          </h4>

          <p className="text-sm text-slate-500 mt-1">
            Super Admin always has access. Enable this only when HR Managers should also create and delete employee records.
          </p>
        </div>
      </div>

      <label className="inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          disabled={!isSuperAdmin}
          checked={settings.allow_hr_employee_management === 'true'}
          onChange={(e) =>
            setSettings({
              ...settings,
              allow_hr_employee_management: e.target.checked ? 'true' : 'false',
            })
          }
        />

        <div className="relative w-12 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-60"></div>
      </label>
    </div>

    {!isSuperAdmin && (
      <div className="p-4 bg-amber-50 border border-amber-100 text-amber-700 rounded-xl text-sm font-medium">
        Only Super Admin can change HR employee-management access.
      </div>
    )}
  </div>
  <div className="space-y-4">
    <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex gap-4">
        <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
          <Users size={22} />
        </div>

        <div>
          <h4 className="font-bold text-slate-900">
           Allow HR to manage leave requests and reports
          </h4>

          <p className="text-sm text-slate-500 mt-1">
            Super Admin always has access. Enable this only when HR Managers should approve/reject leaves and view all employee leave reports.
          </p>
        </div>
      </div>

      <label className="inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          disabled={!isSuperAdmin}
          checked={settings.allow_hr_leave_management === 'true'}
          onChange={(e) =>
            setSettings({
              ...settings,
              allow_hr_leave_management: e.target.checked ? 'true' : 'false',
            })
          }
        />

        <div className="relative w-12 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-60"></div>
      </label>
    </div>

    {!isSuperAdmin && (
      <div className="p-4 bg-amber-50 border border-amber-100 text-amber-700 rounded-xl text-sm font-medium">
        Only Super Admin can change HR employee-management access.
      </div>
    )}
  </div>
  <div className="space-y-4">
    <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex gap-4">
        <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
          <Users size={22} />
        </div>

        <div>
          <h4 className="font-bold text-slate-900">
           Allow HR to View Attendance Sheets
          </h4>

          <p className="text-sm text-slate-500 mt-1">
            Super Admin always has access. Enable this only when HR Managers view all employee Attendence reports.
          </p>
        </div>
      </div>

      <label className="inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          disabled={!isSuperAdmin}
          checked={settings.allow_hr_attendance_management === 'true'}
          onChange={(e) =>
            setSettings({
              ...settings,
              allow_hr_attendance_management: e.target.checked ? 'true' : 'false',
            })
          }
        />

        <div className="relative w-12 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-60"></div>
      </label>
    </div>

    {!isSuperAdmin && (
      <div className="p-4 bg-amber-50 border border-amber-100 text-amber-700 rounded-xl text-sm font-medium">
        Only Super Admin can change HR employee-management access.
      </div>
    )}
  </div>
  </>
) : activeSec !== 'general' && activeSec !== 'shifts' && (
  <div className="py-12 text-center">
    <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
      <SettingsIcon size={32} />
    </div>
    <h4 className="font-bold text-slate-900">Advance Controls</h4>
    <p className="text-slate-500 text-sm mt-1">
      These settings are managed at the organization root level.
    </p>
  </div>
)}
            </div>
          </form>

          <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl">
             <div className="flex gap-4">
               <div className="p-3 bg-white text-blue-600 rounded-2xl h-fit">
                 <Shield size={24} />
               </div>
               <div>
                  <h4 className="font-bold text-blue-900">System Security Note</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Changes to critical system parameters and organizational data are logged for compliance auditing. 
                    Only users with 'super_admin' privileges can modify these settings.
                  </p>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
