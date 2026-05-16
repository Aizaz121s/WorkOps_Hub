import React, { useState, useEffect } from 'react';
import { Briefcase, Users, UserPlus, Search, MapPin, Building2, Calendar, CheckCircle2, XCircle, MoreVertical, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Recruitment() {
  const [activeTab, setActiveTab] = useState<'jobs' | 'candidates'>('jobs');
  const [jobs, setJobs] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const endpoint = activeTab === 'jobs' ? '/api/jobs' : '/api/candidates';
      const res = await fetch(endpoint, { headers });
      const data = await res.json();
      if (data.success) {
        if (activeTab === 'jobs') setJobs(data.data);
        else setCandidates(data.data);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const updateCandidate = async (id: number, status: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/candidates/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recruitment Hub</h1>
          <p className="text-slate-500">Track job openings and manage candidate pipelines.</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm self-start sm:self-center">
          <button 
            onClick={() => setActiveTab('jobs')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
              activeTab === 'jobs' ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            Job Postings
          </button>
          <button 
            onClick={() => setActiveTab('candidates')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
              activeTab === 'candidates' ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            Candidates
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {activeTab === 'jobs' ? (
          <>
            <div className="md:col-span-1 space-y-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Search size={18} className="text-blue-600" />
                  Quick Stats
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Active Jobs</p>
                    <p className="text-2xl font-bold text-slate-900">{jobs.filter(j => j.status === 'open').length}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Total Applications</p>
                    <p className="text-2xl font-bold text-slate-900">{candidates.length || '—'}</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={async () => {
                  const title = prompt("Job Title:");
                  if (!title) return;
                  const dept = prompt("Department (e.g. Engineering):", "Engineering");
                  if (!dept) return;
                  const loc = prompt("Location (e.g. Remote):", "Remote");
                  if (!loc) return;
                  const type = prompt("Type (e.g. Full-time):", "Full-time");
                  if (!type) return;

                  try {
                    const token = localStorage.getItem('token');
                    const res = await fetch('/api/jobs', {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({ title, department: dept, location: loc, type })
                    });
                    const data = await res.json();
                    if (data.success) fetchData();
                  } catch (err) { console.error(err); }
                }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all active:scale-95"
              >
                <UserPlus size={18} />
                Post New Job
              </button>
            </div>

            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {jobs.map((job) => (
                <div key={job.id} className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm hover:shadow-md hover:border-blue-100 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-500">
                      <Briefcase size={24} />
                    </div>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase">
                      {job.status}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{job.title}</h3>
                  <div className="flex items-center gap-3 text-slate-500 text-xs font-medium mb-4">
                    <span className="flex items-center gap-1"><Building2 size={14} /> {job.department}</span>
                    <span className="flex items-center gap-1"><MapPin size={14} /> {job.location}</span>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <span className="text-xs font-bold text-slate-400">{job.type}</span>
                    <button className="text-blue-600 text-xs font-bold flex items-center gap-1 hover:gap-2 transition-all">
                      View details <MoreVertical size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="md:col-span-4 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-4">Candidate</th>
                      <th className="px-6 py-4">Job Applied</th>
                      <th className="px-6 py-4">Applied On</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {candidates.map((can) => (
                      <tr key={can.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-slate-900">{can.name}</p>
                          <p className="text-[10px] text-slate-400">{can.email}</p>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-600">{can.job_title}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-500">
                          {new Date(can.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                           <span className={cn(
                             "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                             can.status === 'applied' ? "bg-blue-50 text-blue-600" :
                             can.status === 'interviewed' ? "bg-purple-50 text-purple-600" :
                             can.status === 'hired' ? "bg-emerald-50 text-emerald-600" :
                             "bg-red-50 text-red-600"
                           )}>
                             {can.status}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                             <button 
                               onClick={() => updateCandidate(can.id, 'interviewed')}
                               className="p-1.5 border border-slate-100 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-purple-600 transition-colors"
                             >
                               <Calendar size={14} />
                             </button>
                             <button 
                               onClick={() => updateCandidate(can.id, 'hired')}
                               className="p-1.5 border border-slate-100 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-emerald-600 transition-colors"
                             >
                               <CheckCircle2 size={14} />
                             </button>
                             <button 
                               onClick={() => updateCandidate(can.id, 'rejected')}
                               className="p-1.5 border border-slate-100 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-red-600 transition-colors"
                             >
                               <XCircle size={14} />
                             </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
