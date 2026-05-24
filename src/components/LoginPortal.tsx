import React, { useState } from 'react';
import { User, Role } from '../types';
import { 
  ShieldCheck, 
  KeyRound, 
  Smartphone, 
  Building2, 
  BadgeAlert, 
  UserCheck, 
  HelpCircle,
  Hash,
  Phone,
  Lock,
  ArrowRight
} from 'lucide-react';

interface LoginPortalProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
}

export default function LoginPortal({ users, onLoginSuccess }: LoginPortalProps) {
  // Login flow states
  const [authMode, setAuthMode] = useState<'office' | 'rider'>('office');
  const [credentialInput, setCredentialInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  // Helper validation for typed login
  const handleTypedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorFeedback(null);

    const trimmedInput = credentialInput.trim();
    if (!trimmedInput) {
      setErrorFeedback('Please enter an Employee ID, Phone Number, or Full Name.');
      return;
    }

    // Lookup user in current application state
    const matchedUser = users.find(u => {
      const matchId = u.employeeId?.toLowerCase() === trimmedInput.toLowerCase();
      const matchPhone = u.phoneNumber?.replace(/\s+/g, '') === trimmedInput.replace(/\s+/g, '') || u.phoneNumber?.includes(trimmedInput);
      const matchName = u.fullName.toLowerCase() === trimmedInput.toLowerCase();
      return matchId || matchPhone || matchName;
    });

    if (!matchedUser) {
      setErrorFeedback(`No authorized record found matching "${trimmedInput}". Tip: Check your Spelling or use Quick-Fills below.`);
      return;
    }

    // Role gate checks
    if (authMode === 'office' && matchedUser.role === 'rider') {
      setErrorFeedback(`Rider personnel "${matchedUser.fullName}" must use the Delivery Executive Mobile Terminal tab.`);
      return;
    }

    if (authMode === 'rider' && matchedUser.role !== 'rider') {
      setErrorFeedback(`Office personnel "${matchedUser.fullName}" must use the Corporate Office gate.`);
      return;
    }

    // Status checks
    if (matchedUser.status === 'suspended') {
      setErrorFeedback(`ACCESS SUSPENDED: Credentials for "${matchedUser.fullName}" have been suspended. Please contact Super Admin.`);
      return;
    }

    if (matchedUser.status === 'pending') {
      setErrorFeedback(`REGISTRATION PENDING: Roster registration is pending supervisor approval.`);
      return;
    }

    // Log in!
    onLoginSuccess(matchedUser);
  };

  // Quick Demo account selects
  const handleQuickLogin = (uid: string) => {
    setErrorFeedback(null);
    const matchedUser = users.find(u => u.uid === uid);
    if (matchedUser) {
      if (matchedUser.status === 'suspended') {
        setErrorFeedback(`ACCESS SUSPENDED: Demopoint "${matchedUser.fullName}" is currently marked suspended!`);
        return;
      }
      onLoginSuccess(matchedUser);
    }
  };

  // Segment user accounts for Quick Profile selection
  const erpAdmins = users.filter(u => u.role === 'super_admin' || u.role === 'supervisor');
  const activeRiders = users.filter(u => u.role === 'rider');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-blue-600 selection:text-white" id="ek_auth_gateway">
      
      {/* Decorative top ambient grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-8 z-10">
        
        {/* Left Side: Brand Concept & Quick Profile Fills (5 Cols) */}
        <div className="md:col-span-5 flex flex-col justify-between p-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-md">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-blue-600 text-white font-black px-2.5 py-0.5 rounded text-sm tracking-wider shadow-md">
                EK
              </span>
              <h1 className="text-lg font-black tracking-widest text-white font-display">
                LOGISTICS ERP
              </h1>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Unified workforce roster, live telemetry coordinate tracking, geofence audit trails, and automated key performance indicators.
            </p>
          </div>

          <div className="mt-8">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-blue-500 mb-3 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" />
              Quick Workspace Fills
            </h3>
            <p className="text-[10px] text-slate-500 mb-4">
              Select an account profile below to log in instantly and review tailored dashboards.
            </p>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              
              {/* Category label */}
              <div className="text-[9px] uppercase font-semibold text-slate-500 tracking-wider">Office Operators</div>
              {erpAdmins.map(acc => (
                <button
                  key={acc.uid}
                  onClick={() => handleQuickLogin(acc.uid)}
                  className={`w-full text-left p-2.5 bg-slate-950/40 hover:bg-slate-800/80 border ${acc.status === 'suspended' ? 'border-amber-500/30' : 'border-slate-800'} rounded-lg transition duration-250 flex items-center justify-between group`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-200 group-hover:text-blue-400 transition">{acc.fullName}</p>
                    <p className="text-[10px] text-slate-400 capitalize font-mono mt-0.5">
                      {acc.role.replace('_', ' ')} &middot; <span className="text-[9px] text-slate-500">{acc.hubId}</span>
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded group-hover:border-blue-600 group-hover:text-blue-500 shrink-0 transition">
                    Fill
                  </span>
                </button>
              ))}

              {/* Category label */}
              <div className="text-[9px] uppercase font-semibold text-slate-500 tracking-wider pt-2">Delivery Executives</div>
              {activeRiders.slice(0, 3).map(acc => (
                <button
                  key={acc.uid}
                  onClick={() => {
                    // Set to executive simulator mode
                    setAuthMode('rider');
                    handleQuickLogin(acc.uid);
                  }}
                  className="w-full text-left p-2.5 bg-slate-950/40 hover:bg-slate-800/80 border border-slate-800 rounded-lg transition duration-250 flex items-center justify-between group"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition">{acc.fullName}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Rider &middot; <span className="text-[9px] text-slate-500">{acc.employeeId}</span>
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded group-hover:border-emerald-600 group-hover:text-emerald-500 shrink-0 transition">
                    Simulator
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/60 hidden md:block">
            <span className="text-[10px] text-slate-500 font-mono">
              Secure ERP Gate: Version 2026.5
            </span>
          </div>
        </div>

        {/* Right Side: Form Gate & Terminal Inputs (7 Cols) */}
        <form onSubmit={handleTypedSubmit} className="md:col-span-7 flex flex-col justify-between p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl relative overflow-hidden">
          
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="text-center md:text-left mb-6">
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center justify-center md:justify-start gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-500" />
                Access Gateway
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your registered active credentials to securely sign into the fleet network.
              </p>
            </div>

            {/* Access Port Tab Switches */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('office');
                  setErrorFeedback(null);
                }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold tracking-wide transition ${
                  authMode === 'office'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Office Operator
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('rider');
                  setErrorFeedback(null);
                }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold tracking-wide transition ${
                  authMode === 'rider'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                Executive Terminal
              </button>
            </div>

            {/* Error alerts */}
            {errorFeedback && (
              <div className="mb-5 bg-red-950/40 border border-red-500/40 rounded-xl p-3 flex gap-2.5 items-start">
                <BadgeAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-red-300 leading-relaxed">
                  {errorFeedback}
                </p>
              </div>
            )}

            {/* Standard inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  {authMode === 'office' ? <Hash className="w-3 h-3 text-blue-500" /> : <Phone className="w-3 h-3 text-emerald-500" />}
                  {authMode === 'office' ? 'Employee Roster ID' : 'Mobile Roster ID / Phone'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={authMode === 'office' ? 'e.g. EK-HQ-ADM-0001 (or Name)' : 'e.g. EK-GHY01-DL-0432 (or Phone)'}
                  value={credentialInput}
                  onChange={(e) => setCredentialInput(e.target.value)}
                  className={`w-full bg-slate-950 border ${
                    authMode === 'office' ? 'focus:border-blue-500 focus:ring-blue-500/20' : 'focus:border-emerald-500 focus:ring-emerald-500/20'
                  } border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 transition duration-200`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-500" />
                  Roster Passcode / PIN
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;"
                  className={`w-full bg-slate-950 border ${
                    authMode === 'office' ? 'focus:border-blue-500 focus:ring-blue-500/20' : 'focus:border-emerald-500 focus:ring-emerald-500/20'
                  } border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-400 placeholder-slate-700 focus:outline-none focus:ring-2 transition duration-200`}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800/60">
            <button
              type="submit"
              className={`w-full font-bold text-xs tracking-wider uppercase py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition duration-200 text-white ${
                authMode === 'office'
                  ? 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/15'
                  : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-500/15'
              }`}
            >
              Authorize Credentials
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </button>

            <span className="text-[10px] text-slate-500 text-center w-full block mt-3 flex items-center justify-center gap-1 font-medium">
              <HelpCircle className="w-3 h-3" />
              Tip: Standard test passcode can be empty or any string. Authentication is validated against the active roster list.
            </span>
          </div>

        </form>
        
      </div>
    </div>
  );
}
