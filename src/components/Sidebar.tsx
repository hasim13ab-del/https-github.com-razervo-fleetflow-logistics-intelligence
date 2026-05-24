import React from 'react';
import {
  LayoutDashboard,
  Map,
  CalendarDays,
  Award,
  Users,
  MapPin,
  Laptop,
  Smartphone,
  Columns,
  Bell,
  LogOut,
  Layers,
  PackageCheck
} from 'lucide-react';
import { Role } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: { fullName: string; role: Role; email: string };
  viewMode: 'split' | 'erp' | 'mobile';
  setViewMode: (mode: 'split' | 'erp' | 'mobile') => void;
  unresolvedAlertsCount: number;
  onSignOut?: () => void;
  orgName?: string;
  orgLogo?: string;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  currentUser,
  viewMode,
  setViewMode,
  unresolvedAlertsCount,
  onSignOut,
  orgName,
  orgLogo
}: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Operations Room', icon: LayoutDashboard, allowedRoles: ['super_admin', 'admin', 'supervisor'] },
    { id: 'monitoring', label: 'Rider Monitoring', icon: Map, allowedRoles: ['super_admin', 'admin', 'supervisor'] },
    { id: 'attendance', label: 'Attendance Registry', icon: CalendarDays, allowedRoles: ['super_admin', 'admin', 'supervisor'] },
    { id: 'ofdTracker', label: 'OFD Status Tracker', icon: PackageCheck, allowedRoles: ['super_admin', 'admin', 'supervisor'] },
    { id: 'kpi', label: 'KPI & Performance', icon: Award, allowedRoles: ['super_admin', 'admin', 'supervisor'] },
    { id: 'employees', label: 'Employee Roster', icon: Users, allowedRoles: ['super_admin', 'admin', 'supervisor'] },
    { id: 'hubs', label: 'Hub Onboarding & Geo', icon: MapPin, allowedRoles: ['super_admin'] },
    { id: 'profile', label: 'My Profile / Hierarchy', icon: Layers, allowedRoles: ['super_admin', 'admin', 'supervisor', 'rider'] }
  ];

  return (
    <aside className="w-68 bg-[#001529] text-slate-300 flex flex-col h-full shrink-0 border-r border-[#002140]" id="erp_sidebar">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          {orgLogo ? (
            <img src={orgLogo} alt="Org Logo" className="w-6 h-6 object-contain" />
          ) : (
            <span className="bg-blue-600 text-white font-black px-2 py-0.5 rounded text-xs tracking-wider">
              {orgName ? orgName.substring(0, 2).toUpperCase() : 'EK'}
            </span>
          )}
          <h1 className="text-sm font-bold tracking-wider font-display text-white truncate" title={orgName || 'LOGISTICS ERP'}>
            {orgName ? orgName.toUpperCase() : 'FLEET FLOW ERP'}
          </h1>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          WORKFORCE & KPI INTELLIGENCE
        </span>
      </div>

      {/* Screen Layout Controls */}
      <div className="p-4 border-b border-slate-800/60 bg-slate-900/40">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">
          WORKBENCH VIEWPORT
        </p>
        <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-center">
          <button
            onClick={() => setViewMode('split')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-md text-[10px] transition font-medium ${
              viewMode === 'split'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            title="Show ERP and Rider Mobile simulator side-by-side"
          >
            <Columns className="w-4 h-4 mb-0.5" />
            Dual
          </button>
          <button
            onClick={() => setViewMode('erp')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-md text-[10px] transition font-medium ${
              viewMode === 'erp'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            title="Focus entirely on Super Admin ERP"
          >
            <Laptop className="w-4 h-4 mb-0.5" />
            ERP only
          </button>
          <button
            onClick={() => setViewMode('mobile')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-md text-[10px] transition font-medium ${
              viewMode === 'mobile'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            title="Focus entirely on Rider Mobile APK simulator"
          >
            <Smartphone className="w-4 h-4 mb-0.5" />
            APK only
          </button>
        </div>
      </div>

      {/* Modules List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          if (!item.allowedRoles.includes(currentUser.role)) {
            return null;
          }
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium tracking-wide transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <IconComponent className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.id === 'monitoring' && unresolvedAlertsCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black font-mono px-1.5 py-0.5 rounded-full pulse-alert">
                  {unresolvedAlertsCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Current Operator Badge */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/80">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 text-xs font-bold uppercase font-display shrink-0">
            {currentUser.fullName.slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-200 truncate" title={currentUser.fullName}>
              {currentUser.fullName}
            </p>
            <p className="text-[10px] text-slate-500 capitalize">
              Role: <span className="text-slate-400 font-mono">{currentUser.role.replace('_', ' ')}</span>
            </p>
          </div>
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-slate-900 transition-colors"
              title="Sign Out of ERP session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
