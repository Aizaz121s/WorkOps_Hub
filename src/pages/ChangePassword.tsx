import React, { useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';

export default function ChangePassword() {
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (formData.new_password !== formData.confirm_password) {
      setError('New password and confirm password do not match');
      return;
    }

    if (formData.new_password.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');

      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        setMessage('Password changed successfully');
        setFormData({
          current_password: '',
          new_password: '',
          confirm_password: '',
        });

        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 800);
      } else {
        setError(data.message || 'Failed to change password');
      }
    } catch {
      setError('Connection error while changing password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Change Password</h1>
        <p className="text-slate-500">Update your account password securely.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
          <Lock size={26} />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-sm">
            {message}
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-slate-400 uppercase">Current Password</label>
          <input
            type="password"
            value={formData.current_password}
            onChange={e => setFormData({ ...formData, current_password: e.target.value })}
            className="mt-1 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 uppercase">New Password</label>
          <input
            type="password"
            value={formData.new_password}
            onChange={e => setFormData({ ...formData, new_password: e.target.value })}
            className="mt-1 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 uppercase">Confirm Password</label>
          <input
            type="password"
            value={formData.confirm_password}
            onChange={e => setFormData({ ...formData, confirm_password: e.target.value })}
            className="mt-1 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50"
        >
          {loading && <Loader2 className="animate-spin" size={18} />}
          Change Password
        </button>
      </form>
    </div>
  );
}