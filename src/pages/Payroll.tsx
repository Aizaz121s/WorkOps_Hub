import React, { useState, useEffect } from 'react';
import { CreditCard, DollarSign, Calendar, Filter, Plus, Send, CheckCircle2, Download, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function Payroll() {
  const [payroll, setPayroll] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchPayroll();
  }, []);

  const fetchPayroll = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch('/api/payroll', { headers });
      const data = await res.json();
      if (data.success) setPayroll(data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const generatePayroll = async () => {
    setIsGenerating(true);
    const month = new Date().toLocaleString('default', { month: 'long' });
    const year = new Date().getFullYear();
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/payroll/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ month, year })
      });
      const data = await res.json();
      if (data.success) fetchPayroll();
    } catch (err) { console.error(err); }
    finally { setIsGenerating(false); }
  };

  const processPayment = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/payroll/${id}/pay`, { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) fetchPayroll();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payroll Management</h1>
          <p className="text-slate-500">Manage employee salaries, bonuses, and disbursements.</p>
        </div>
        <div className="flex gap-3">
          <button 
             onClick={generatePayroll}
             disabled={isGenerating}
             className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
            Generate Monthly Payroll
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Disbursements</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900">$42,500.00</h3>
            <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded-full">
              +4.2%
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Calculated for current month</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pending payments</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900">{payroll.filter(p => p.status === 'pending').length}</h3>
          </div>
          <p className="text-xs text-slate-500 mt-2">Employees awaiting transfer</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tax Deductions</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900">$3,240.00</h3>
          </div>
          <p className="text-xs text-slate-500 mt-2">Monthly statutory compliance</p>
        </div>
      </div>

      {/* Payroll List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <h3 className="font-bold text-slate-900">Salaries & Slip</h3>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-white transition-colors">
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Month/Year</th>
                <th className="px-6 py-4">Base Salary</th>
                <th className="px-6 py-4">Net Salary</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {payroll.map((p, i) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-slate-900">{p.first_name} {p.last_name}</p>
                    <p className="text-[10px] text-slate-400">ID: EMP{String(p.employee_id).padStart(3, '0')}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-600">{p.month} {p.year}</span>
                  </td>
                  <td className="px-6 py-4 font-mono text-sm">${p.base_salary.toLocaleString()}</td>
                  <td className="px-6 py-4 font-bold text-slate-900 font-mono text-sm">${p.net_salary.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      p.status === 'pending' ? "bg-orange-50 text-orange-600" : "bg-emerald-50 text-emerald-600"
                    )}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {p.status === 'pending' ? (
                      <button 
                        onClick={() => processPayment(p.id)}
                        className="flex items-center gap-1.5 ml-auto px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-600 hover:text-white transition-all"
                      >
                        <Send size={12} />
                        Disburse
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 justify-end text-emerald-600 text-xs font-bold mr-2">
                        <CheckCircle2 size={14} />
                        Paid
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {payroll.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                    No payroll records generated yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
