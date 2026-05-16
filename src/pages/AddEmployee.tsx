import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, User, Mail, Phone, Calendar, Building2, Briefcase, CreditCard, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface MetaData {
  id: number;
  name?: string;
  title?: string;
}

export default function AddEmployee() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<MetaData[]>([]);
  const [departments, setDepartments] = useState<MetaData[]>([]);
  const [designations, setDesignations] = useState<MetaData[]>([]);
  const [shifts, setShifts] = useState<MetaData[]>([]);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    dob: '',
    gender: 'Male',
    joining_date: new Date().toISOString().split('T')[0],
    department_id: '',
    designation_id: '',
    role_id: '',
    salary: '',
    shift_id: ''
  });

  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMeta = async () => {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      const [r, d, des, s] = await Promise.all([
        fetch('/api/roles', { headers }).then(res => res.json()),
        fetch('/api/departments', { headers }).then(res => res.json()),
        fetch('/api/designations', { headers }).then(res => res.json()),
        fetch('/api/shifts', { headers }).then(res => res.json())
      ]);
      if (r.success) setRoles(r.data);
      if (d.success) setDepartments(d.data);
      if (des.success) setDesignations(des.data);
      if (s.success) setShifts(s.data);
      
      // Select default 'employee' role if available
      if (r.success) {
        const empRole = r.data.find((x: any) => x.name === 'employee');
        if (empRole) setFormData(prev => ({ ...prev, role_id: empRole.id.toString() }));
      }
    };
    fetchMeta();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          department_id: formData.department_id ? parseInt(formData.department_id) : null,
          designation_id: formData.designation_id ? parseInt(formData.designation_id) : null,
          shift_id: formData.shift_id ? parseInt(formData.shift_id) : null,
          role_id: parseInt(formData.role_id),
          salary: formData.salary ? parseFloat(formData.salary) : null
        })
      });

      const data = await res.json();
      if (data.success) {
        navigate('/employees');
      } else {
        setError(data.message || 'Failed to create employee');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/employees" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors mb-2 uppercase tracking-wider">
            <ArrowLeft size={14} /> Back to List
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Add New Employee</h1>
          <p className="text-slate-500">Create a new employee profile and system account.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Info Section */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <User className="text-blue-600" size={20} />
              Personal Information
            </h3>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">First Name *</label>
                <input required name="first_name" value={formData.first_name} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Last Name *</label>
                <input required name="last_name" value={formData.last_name} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Email Address *</label>
                <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Phone Number</label>
                <input name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Date of Birth</label>
                <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Gender</label>
                <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Job Info Section */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Building2 className="text-blue-600" size={20} />
              Employment Details
            </h3>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Role / Access Level *</label>
                <select required name="role_id" value={formData.role_id} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name?.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Joining Date *</label>
                <input required type="date" name="joining_date" value={formData.joining_date} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Department</label>
                <select name="department_id" value={formData.department_id} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                  <option value="">Select Department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Designation</label>
                <select name="designation_id" value={formData.designation_id} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                  <option value="">Select Designation</option>
                  {designations.map(des => <option key={des.id} value={des.id}>{des.title}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Basic Salary ($)</label>
                <input type="number" name="salary" value={formData.salary} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="5000" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Assigned Shift</label>
                <select name="shift_id" value={formData.shift_id} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                  <option value="">Select Shift</option>
                  {shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start_time}-{s.end_time})</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Link to="/employees" className="px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Create Employee
          </button>
        </div>
      </form>
    </div>
  );
}
