import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Bell,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  ShieldCheck,
  Globe,
  User as UserIcon,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openAuthModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  openAuthModal,
}) => {
  const {
    user,
    dailyStatus,
    notifications,
    unreadCount,
    logout,
    markNotificationAsRead,
  } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  const isFinancial = user?.role === 'FINANCIAL_DEPARTMENT';
  const userInitials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <header className="sticky top-0 z-40 w-full bg-gradient-to-r from-[#061b49] via-[#0b429f] to-[#1765e8] border-b border-blue-400/30 text-white shadow-lg shadow-blue-950/15">
      <div className="mx-auto flex min-h-[92px] max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6 lg:px-9">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className="flex items-center gap-4 text-left focus:outline-none"
          >
            <div className="flex h-[60px] w-[60px] items-center justify-center rounded-2xl border border-white/30 bg-white text-[#1559d6] text-xl font-black tracking-tight shadow-xl shadow-blue-950/30 ring-4 ring-white/10">RP</div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-black tracking-[.14em] text-white">RATEPILOT</span>
              </div>
              <span className="text-xs sm:text-sm font-medium text-blue-100 block mt-0.5 tracking-wide">
                SEQUENTIAL TASKS • CLEAR PROGRESS
              </span>
            </div>
          </button>

          {/* Daily Status Indicator */}
          <div className="hidden sm:flex items-center gap-2 border-l border-white/20 pl-6 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                dailyStatus === 'OPEN' ? 'bg-sky-300' : 'bg-red-400'
              }`}
            />
            <span className="text-blue-100 font-medium">Daily Tasks:</span>
            <span
              className={`font-semibold ${
                dailyStatus === 'OPEN' ? 'text-sky-200' : 'text-red-400'
              }`}
            >
              {dailyStatus === 'OPEN' ? 'Open for Submissions' : 'Closed for Today'}
            </span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Landing / About Link */}
          <button
            onClick={() => setCurrentTab('landing')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              currentTab === 'landing'
                ? 'bg-white/20 text-white'
                : 'text-blue-50 hover:bg-white/15 hover:text-white'
            }`}
          >
            <Globe className="h-4 w-4 text-slate-400" />
            <span className="hidden md:inline">About Platform</span>
          </button>

          {/* Notifications Dropdown */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative rounded-md p-2 text-blue-50 transition hover:bg-white/15 hover:text-white"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-slate-950">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-88 origin-top-right rounded-lg border border-gray-200 bg-white p-3 shadow-lg z-50 text-gray-900">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-xs font-bold text-gray-900">Notifications</span>
                    <span className="text-[11px] text-gray-500">{notifications.length} alerts</span>
                  </div>
                  <div className="mt-2 max-h-72 space-y-1.5 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-gray-500">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markNotificationAsRead(n.id)}
                          className={`cursor-pointer rounded-md p-2.5 transition text-left ${
                            n.isRead
                              ? 'bg-gray-50 text-gray-600'
                              : 'bg-emerald-50/60 border border-emerald-100 text-gray-900'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-900">{n.title}</span>
                            <span className="text-[10px] text-gray-400">
                              {new Date(n.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-gray-600">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Profile & Sign Out */}
          {user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-white/20">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-bold text-blue-800 border border-white/60">
                  {userInitials}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-white leading-tight">
                    {user.username ? `@${user.username}` : user.full_name}
                  </div>
                  <div className="text-[10px] text-blue-100 font-medium">
                    {isFinancial ? 'Operations Team' : 'Rating Worker'}
                  </div>
                </div>
              </div>

              <button
                onClick={logout}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-blue-50 hover:bg-white/15 hover:text-white transition"
                title="Log out of current session"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={openAuthModal}
              className="rounded-md bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 shadow-sm"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
