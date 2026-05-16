import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Users, Calendar, ClipboardList, Settings, CreditCard, LogOut, Menu, X, Bell, Search, Briefcase, MessageSquare, Clock } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

export function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (val: boolean) => void }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Employees', icon: Users, path: '/employees' },
    { name: 'Attendance', icon: Calendar, path: '/attendance' },
    { name: 'Leave Management', icon: ClipboardList, path: '/leaves' },
    { name: 'Payroll', icon: CreditCard, path: '/payroll' },
    { name: 'Recruitment', icon: Briefcase, path: '/recruitment' },
    { name: 'Internal Chat', icon: MessageSquare, path: '/chat' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 font-bold text-xl text-blue-600">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">WH</div>
              <span>WorkOps Hub</span>
            </Link>
            <button onClick={() => setIsOpen(false)} className="lg:hidden p-2 text-slate-500">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-blue-50 text-blue-600" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <item.icon size={18} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium">
                {user?.email[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{user?.email}</p>
                <p className="text-xs text-slate-500 capitalize">{user?.role.replace('_', ' ')}</p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
type RecentActivity = {
  type: string;
  title: string;
  description: string;
  created_at: string;
};
// export function Navbar({ setIsSidebarOpen }: { setIsSidebarOpen: (val: boolean) => void }) {
//   const { user } = useAuth();

//   return (
//     <header className="sticky top-0 z-30 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 lg:pl-64">
//       <div className="px-4 py-3 flex items-center justify-between">
//         <div className="flex items-center gap-4">
//           <button 
//             onClick={() => setIsSidebarOpen(true)}
//             className="p-2 text-slate-500 lg:hidden hover:bg-slate-100 rounded-lg"
//           >
//             <Menu size={20} />
//           </button>
          
//           <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-full text-slate-500">
//             <Search size={16} />
//             <input 
//               type="text" 
//               placeholder="Search..." 
//               className="bg-transparent border-none outline-none text-sm w-64"
//             />
//           </div>
//         </div>

//         <div className="flex items-center gap-3">
//           <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg relative">
//             <Bell size={20} />
//             <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
//           </button>
          
//           <div className="h-8 w-px bg-slate-200 mx-1"></div>
          
//           <div className="flex items-center gap-2">
//             <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-medium">
//               {user?.email[0].toUpperCase()}
//             </div>
//             <div className="hidden sm:block">
//               <p className="text-xs font-semibold text-slate-900">{user?.email}</p>
//               <p className="text-[10px] text-slate-500 uppercase tracking-wider">{user?.role}</p>
//             </div>
//           </div>
//         </div>
//       </div>
//     </header>
//   );
// }
export function Navbar({ setIsSidebarOpen }: { setIsSidebarOpen: (val: boolean) => void }) {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [activities, setActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    fetch('/api/dashboard/stats', { headers })
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data?.recentActivity)) {
          setActivities(data.data.recentActivity);
        }
      })
      .catch(() => {
        setActivities([]);
      });
  }, []);

  return (
    <header className="sticky top-0 z-30 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 lg:pl-64">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-slate-500 lg:hidden hover:bg-slate-100 rounded-lg"
          >
            <Menu size={20} />
          </button>
          
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-full text-slate-500">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search..." 
              className="bg-transparent border-none outline-none text-sm w-64"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(prev => !prev)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg relative"
            >
              <Bell size={20} />

              {activities.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-96 max-w-[calc(100vw-2rem)] bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                    <p className="text-xs text-slate-500">Recent HRMS activity</p>
                  </div>

                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    {activities.length}
                  </span>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {activities.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-500">
                      No recent activity found.
                    </div>
                  ) : (
                    activities.map((item, index) => (
                      <div
                        key={`${item.created_at}-${index}`}
                        className="px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 shrink-0"></div>

                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 leading-tight">
                              {item.title}
                            </p>

                            <p className="text-xs text-slate-500 mt-0.5">
                              {item.description}
                            </p>

                            <p className="text-[10px] text-slate-400 mt-1">
                              {new Date(item.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="px-4 py-3 bg-slate-50 text-center">
                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="h-8 w-px bg-slate-200 mx-1"></div>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-medium">
              {user?.email[0].toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-slate-900">{user?.email}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{user?.role}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
