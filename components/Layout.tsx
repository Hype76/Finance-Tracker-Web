import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  TrendingUp, 
  TrendingDown, 
  CalendarDays, 
  Wallet, 
  LogOut,
  LineChart
} from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();

  if (!user) {
    return <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">{children}</div>;
  }

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Income', path: '/income', icon: TrendingUp },
    { label: 'Expenses', path: '/expenses', icon: TrendingDown },
    { label: 'Benefits', path: '/benefits', icon: Wallet },
    { label: 'Payday', path: '/payday', icon: CalendarDays },
    { label: 'Projections', path: '/projections', icon: LineChart },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b p-4 flex justify-between items-center sticky top-0 z-20">
        <h1 className="text-xl font-bold text-gray-800">AssetFlow</h1>
        <button onClick={signOut} className="text-gray-500 hover:text-red-600">
          <LogOut size={20} />
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r h-screen sticky top-0">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-primary-600 tracking-tight">AssetFlow</h1>
          <p className="text-xs text-gray-400 mt-1">Value Driven Finance</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-primary-50 text-primary-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
           <div className="flex items-center gap-3 px-4 py-3 text-sm text-gray-600">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
                {user.email?.[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-gray-900">{user.email}</p>
              </div>
           </div>
           <button 
            onClick={signOut}
            className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
           >
             <LogOut size={16} /> Sign Out
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-2 z-20 pb-safe">
        {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center p-2 text-xs font-medium rounded-lg transition-colors ${
                  isActive 
                    ? 'text-primary-600' 
                    : 'text-gray-500'
                }`}
              >
                <Icon size={20} className="mb-1" />
                {item.label}
              </Link>
            );
          })}
      </nav>
      {/* Spacer for mobile bottom nav */}
      <div className="h-16 md:hidden"></div>
    </div>
  );
};