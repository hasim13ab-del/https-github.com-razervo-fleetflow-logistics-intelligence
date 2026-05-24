import React, { useState } from 'react';
import { 
  User, 
  Shield, 
  MapPin, 
  Mail, 
  Phone, 
  Clock, 
  Award, 
  CheckCircle2, 
  Lock, 
  Layers,
  ChevronRight,
  UserCheck,
  Building
} from 'lucide-react';
import { Role } from '../types';

interface ProfileViewProps {
  currentUser: {
    uid: string;
    fullName: string;
    role: Role;
    email: string;
    hubId: string;
    employeeId: string;
  };
  hubs: Array<{ hubId: string; name: string; address: string }>;
}

export default function ProfileView({ currentUser, hubs }: ProfileViewProps) {
  const [selectedHierarchyLevel, setSelectedHierarchyLevel] = useState<Role | 'all'>('all');
  const userHub = hubs.find(h => h.hubId === currentUser.hubId);

  const getRoleDescription = (role: Role) => {
    switch (role) {
      case 'super_admin':
        return 'HQ Global Admin: Unrestricted permissions across all operational zones and logistics hubs. Can onboard hubs, adjust KPI calculations, and manage directories.';
      case 'admin':
        return 'HQ Operations Coordinator: Oversees multiple hub territories, compiles aggregate reports, and manages workforce assignments.';
      case 'supervisor':
        return 'Hub Manager / Supervisor: Authorized for localized monitoring, manual performance metric registration, and shift attendance management.';
      case 'rider':
        return 'Field Logistics Rider: Continuous geo-location updates, shift attendance lock via local mobile device APK simulator.';
    }
  };

  const hierarchyLevels = [
    {
      id: 'super_admin' as Role,
      title: 'Level 1: Super Administrator',
      alias: 'HQ Commander',
      clearance: 'Unrestricted Security Cleared',
      badgeColor: 'bg-rose-900/40 text-rose-300 border-rose-800',
      activeUsers: 'Hasim Abdul',
      permissions: [
        'Multi-hub geofence parameter onboarding & edits',
        'Global rules engine scoring weights configurator',
        'Authorized global staff termination & suspensions',
        'Raw database telemetry access & stream monitors'
      ]
    },
    {
      id: 'admin' as Role,
      title: 'Level 2: Administrator',
      alias: 'Area Coordinator',
      clearance: 'HQ Operations Cleared',
      badgeColor: 'bg-purple-900/40 text-purple-300 border-purple-800',
      activeUsers: 'Remote HQ Staff',
      permissions: [
        'Directory roster viewing & report generation',
        'Area assignments & coordinate evaluations',
        'Rider geofence alarm resolution overrides'
      ]
    },
    {
      id: 'supervisor' as Role,
      title: 'Level 3: Supervisor',
      alias: 'Logistics Hub Manager',
      clearance: 'Local Hub Cleared',
      badgeColor: 'bg-amber-900/40 text-amber-300 border-amber-800',
      activeUsers: 'Rupam Kalita, Shreya Sharma',
      permissions: [
        'Manual rider KPI scoreboard entries',
        'Local hub attendance roster logs and reviews',
        'Active rider geofence breach tracking'
      ]
    },
    {
      id: 'rider' as Role,
      title: 'Level 4: Logistics Rider',
      alias: 'Field Delivery Associate',
      clearance: 'External Dispatch Cleared',
      badgeColor: 'bg-blue-900/40 text-blue-300 border-blue-800',
      activeUsers: 'Field Fleet Operators',
      permissions: [
        'Dynamic APK Mobile Client Simulator login',
        'Local hub QR station scan with location validation',
        'Continuous active shift GPS routing telemetry'
      ]
    }
  ];

  return (
    <div className="space-y-6" id="operator_profile_module">
      
      {/* Title */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <h2 className="text-lg font-bold text-slate-800 font-display">Command & Profile Hierarchy</h2>
        <p className="text-xs text-slate-400">
          Verify active operator profile credentials, permission clearances, and logistics command hierarchy.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Active Operator Profile Card (5/12) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-100 shadow-xs p-5 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Shield className="w-5 h-5 text-blue-600" />
              <h4 className="font-bold text-slate-800 text-sm font-display">Operator Security Identity</h4>
            </div>

            {/* Profile Detail Card */}
            <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-850 relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-5 -mr-4 -mt-4">
                <Shield className="w-40 h-40" />
              </div>

              <div className="flex items-center gap-3.5 pb-4 border-b border-slate-800">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center font-bold font-display uppercase border-2 border-slate-800 shadow text-base">
                  {currentUser.fullName.slice(0, 2)}
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide text-white">{currentUser.fullName}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-mono text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                      Session Verified
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3 font-mono text-[10.5px]">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">REGISTERED IDENTITY NAME:</span>
                  <span className="text-blue-400 font-bold">{currentUser.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">SECURITY CLEARANCE:</span>
                  <span className="text-rose-400 font-bold uppercase tracking-wide">{currentUser.role.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">ASSIGNED OPERATION HUB:</span>
                  <span className="text-slate-250 font-semibold">{currentUser.hubId} ({userHub?.name?.split(' ')[0] || 'Guwahati'})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">REGISTERED DISPATCH EMAIL:</span>
                  <span className="text-slate-300 truncate max-w-[180px]" title={currentUser.email}>{currentUser.email}</span>
                </div>
              </div>
            </div>

            {/* Hub base details physical address Card */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Building className="w-4 h-4 text-slate-500" />
                <span>Base Logistics HQ details</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed font-mono">
                Hub Base ID: <span className="font-bold text-slate-700">{currentUser.hubId}</span><br />
                Hub Site: <span className="text-slate-700 font-bold">{userHub?.name || 'Guwahati Town Hub (Assam)'}</span><br />
                Location Address: <span className="text-slate-600">{userHub?.address || 'Adabari, Guwahati, Assam'}</span>
              </p>
            </div>
          </div>

          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl text-[11px] leading-relaxed text-slate-600 font-mono mt-4">
            <span className="font-bold text-slate-800 block mb-1">Active Clearances Notes:</span>
            Your system account role determines your visibility and action permissions in this interface under the role-based hierarchy matrix.
          </div>
        </div>

        {/* Right Side: Command Hierarchy Tree & Perm Matrix (7/12) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-100 shadow-xs p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <h4 className="font-bold text-slate-800 text-sm font-display">System Permission Hierarchy</h4>
              </div>
              <span className="text-[10px] bg-slate-150 text-slate-500 px-2.5 py-0.5 rounded-full font-bold uppercase font-mono">
                Reporting Structure
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Explore the workforce hierarchy levels. Click on any classification layer to highlight authorized clearances and access rights details.
            </p>

            {/* Interactive Hierarchy Flow Cards */}
            <div className="space-y-2.5">
              {hierarchyLevels.map((lvl) => {
                const isActiveUserRole = currentUser.role === lvl.id;
                const isSelected = selectedHierarchyLevel === lvl.id || selectedHierarchyLevel === 'all';
                
                return (
                  <button
                    type="button"
                    key={lvl.id}
                    onClick={() => setSelectedHierarchyLevel(selectedHierarchyLevel === lvl.id ? 'all' : lvl.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      isSelected 
                        ? 'bg-slate-50 border-indigo-400 shadow-xs' 
                        : 'bg-white border-slate-100 opacity-60 hover:opacity-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        isActiveUserRole 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-slate-100 text-slate-500'
                      } text-xs font-bold font-mono`}>
                        {lvl.id === 'super_admin' ? 'H1' : lvl.id === 'admin' ? 'H2' : lvl.id === 'supervisor' ? 'H3' : 'H4'}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-slate-800">{lvl.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({lvl.alias})</span>
                          {isActiveUserRole && (
                            <span className="bg-emerald-100 text-emerald-800 font-mono text-[8px] font-black uppercase rounded px-1.5 py-0.2">
                              Your clearance role
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{lvl.clearance} · Active default demo id: <span className="text-slate-600 font-bold">{lvl.activeUsers}</span></p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-mono font-black border px-2 py-0.5 rounded-full uppercase ${lvl.badgeColor}`}>
                        {lvl.id}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Detail panel of selected clearance */}
            <div className="bg-slate-900 text-slate-300 rounded-xl p-4 border border-slate-850 space-y-3.5">
              <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <Lock className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-slate-250 text-xs font-display">
                  {selectedHierarchyLevel === 'all' 
                    ? 'Global Permission Matrix (All Hierarchy Layers)' 
                    : `Active Authorized Credentials Action Map: ${selectedHierarchyLevel.replace('_', ' ').toUpperCase()}`}
                </span>
              </div>

              <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                {selectedHierarchyLevel === 'all' ? (
                  <p className="text-[11px] leading-relaxed text-slate-400 italic">
                    Click any level card above to see detailed specific functional capabilities assigned to that specific operator hierarchy tier. By default, Super Admins can access everything, while Riders can only lock duty logs on their mobile client.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {hierarchyLevels.find(l => l.id === selectedHierarchyLevel)?.permissions.map((perm, pidx) => (
                      <li key={pidx} className="flex items-start gap-2 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                        <span className="text-slate-300">{perm}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 mt-4 leading-normal text-right">
            EK Air-gapped Logistics Security clearance systems. Automated session timeouts enabled.
          </p>
        </div>

      </div>
    </div>
  );
}
