import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  BadgeCheck,
  ShieldAlert,
  Phone,
  Briefcase,
  Activity,
  MapPin,
  ChevronDown,
  Filter,
  CheckCircle,
  XCircle,
  Mail,
  Lock,
  KeyRound,
  Loader2
} from 'lucide-react';
import { Hub, User, Role, UserStatus } from '../types';

interface EmployeeManagerProps {
  hubs: Hub[];
  users: User[];
  currentUser: User | null;
  onAddEmployee: (user: Omit<User, 'uid'>) => void;
  onUpdateStatus: (uid: string, status: UserStatus) => void;
  onFirebaseOnboarding?: (params: {
    fullName: string;
    email: string;
    role: Role;
    hubId: string;
    phoneNumber: string;
    employeeId: string;
  }) => Promise<{ success: boolean; message: string; password?: string }>;
  onReAuthSuperAdmin?: (password: string) => Promise<boolean>;
}

export default function EmployeeManager({
  hubs,
  users,
  currentUser,
  onAddEmployee,
  onUpdateStatus,
  onFirebaseOnboarding,
  onReAuthSuperAdmin
}: EmployeeManagerProps) {
  const [selectedHub, setSelectedHub] = useState<string>('ALL');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');

  // Registration form inputs
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<Role>('rider');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [hubId, setHubId] = useState<string>(hubs[0]?.hubId || '');
  const [superAdminPassword, setSuperAdminPassword] = useState<string>('');

  React.useEffect(() => {
    if (currentUser?.role === 'supervisor') setRole('rider');
    else if (currentUser?.role === 'hub_admin') setRole('rider');
    else setRole('supervisor');
  }, [currentUser]);

  // Feedback states
  const [formErr, setFormErr] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string>('');

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const canUseFirebaseOnboarding = isSuperAdmin && onFirebaseOnboarding && onReAuthSuperAdmin;

  const generatedEmployeeId = React.useMemo(() => {
    const cleanedName = fullName.replace(/\s+/g, '').toUpperCase();
    const first4 = (cleanedName.slice(0, 4) || 'USER').padEnd(4, 'X');
    const phoneDigits = phoneNumber.replace(/\D/g, '');
    const last4 = phoneDigits.slice(-4).padStart(4, '0');
    return `${first4}${last4}`;
  }, [fullName, phoneNumber]);

  // Handle Form Submit for local (legacy) onboarding
  const handleLocalOnboard = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr('');
    setSuccess('');

    if (!fullName) {
      setFormErr('Full name is required.');
      return;
    }
    if (!phoneNumber) {
      setFormErr('Phone number is required.');
      return;
    }

    const finalEmpId = generatedEmployeeId;

    onAddEmployee({
      fullName,
      email: email || '', // Use email if provided, empty string for local onboarding
      role,
      employeeId: finalEmpId,
      hubId,
      status: 'active',
      phoneNumber,
      liveData: role === 'rider' ? {
        battery: 100,
        isIdle: false,
        gpsStatus: 'on',
        lastActive: new Date().toISOString(),
        currentLocation: hubs.find((h) => h.hubId === hubId)?.location || { latitude: 0, longitude: 0 }
      } : undefined
    });

    setSuccess(`Employee ${fullName} successfully onboarded locally as ${role.toUpperCase()} with ID: ${finalEmpId}!`);
    clearForm();
  };

  // Handle Firebase onboarding (with Firebase Auth user creation)
  const handleFirebaseOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr('');
    setSuccess('');
    setGeneratedPassword('');

    // Validate
    if (!fullName) {
      setFormErr('Full name is required.');
      return;
    }
    if (!email) {
      setFormErr('Email address is required for Firebase auth.');
      return;
    }
    if (!phoneNumber) {
      setFormErr('Phone number is required.');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setFormErr('Please enter a valid email address.');
      return;
    }

    const finalEmpId = generatedEmployeeId;

    setLoading(true);

    try {
      // Step 1: Create Firebase Auth user
      const result = await onFirebaseOnboarding!({
        fullName,
        email,
        role,
        hubId,
        phoneNumber,
        employeeId: finalEmpId
      });

      if (result.success) {
        setGeneratedPassword(result.password || '');
        setSuccess(result.message);
        setShowPasswordPrompt(true);
        clearForm();
      } else {
        setFormErr(result.message);
      }
    } catch (err: any) {
      setFormErr(err.message || 'Firebase onboarding failed.');
    } finally {
      setLoading(false);
    }
  };

  // Re-authenticate Super Admin after onboarding switched their session
  const handleReAuth = async () => {
    if (!superAdminPassword) {
      setFormErr('Please enter your Super Admin password to restore your session.');
      return;
    }
    setLoading(true);
    setFormErr('');

    try {
      const success = await onReAuthSuperAdmin!(superAdminPassword);
      if (success) {
        setSuccess('Session restored! You are now logged in as Super Admin.');
        setShowPasswordPrompt(false);
        setSuperAdminPassword('');
      } else {
        setFormErr('Incorrect password. Please try again.');
      }
    } catch (err: any) {
      setFormErr(err.message || 'Re-authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setFullName('');
    setEmail('');
    setPhoneNumber('');
  };

  // Filter lists
  const filteredUsers = users.filter((u) => {
    const matchesHub = selectedHub === 'ALL' || u.hubId === selectedHub;
    const matchesRole = selectedRole === 'ALL' || u.role === selectedRole;
    return matchesHub && matchesRole;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="employee_manager_panel">
      {/* Col 1: Personnel Onboarding Form (4/12 wide) */}
      <div className="lg:col-span-4 bg-white rounded-xl border border-slate-100 shadow-xs p-5 flex flex-col justify-between h-[650px]">
        <form onSubmit={canUseFirebaseOnboarding ? handleFirebaseOnboard : handleLocalOnboard} className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserPlus className="w-5 h-5 text-blue-600" />
            <div>
              <h4 className="font-bold text-slate-800 text-sm font-display">Logistics Hub Onboarding</h4>
              <p className="text-[10px] text-slate-400">
                {canUseFirebaseOnboarding
                  ? 'Firebase-powered: Creates Auth user & sends verification email.'
                  : 'Add Riders, Supervisors, or Operators into the general roster.'}
              </p>
            </div>
          </div>

          {/* Super Admin badge */}
          {canUseFirebaseOnboarding && (
            <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg text-[10px] text-blue-700 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>Super Admin: Onboarding will create a Firebase Auth account + send verification email</span>
            </div>
          )}

          <div className="space-y-3.5">
            <div>
              <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-500 block mb-1">
                Full Legal Name
              </label>
              <input
                type="text"
                placeholder="Ranjan Goswami"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full text-xs border border-slate-200 bg-slate-50 rounded-lg p-2 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Email field - shown only for Firebase onboarding */}
            {canUseFirebaseOnboarding && (
              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-500 block mb-1">
                  Email Address (Gmail - Firebase Auth Login ID)
                </label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="email"
                    placeholder="user@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-slate-50 rounded-lg p-2 pl-8 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-500 block mb-1">
                  Job Role Hierarchy
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full text-xs border border-slate-200 bg-slate-50 rounded-lg p-2 focus:bg-white focus:outline-none"
                >
                  {currentUser?.role === 'supervisor' ? (
                    // Supervisor can ONLY onboard Riders
                    <option value="rider">Rider (Field Executive)</option>
                  ) : currentUser?.role === 'hub_admin' ? (
                    // Hub Admin can create all hub-level staff EXCEPT Super Admin
                    <>
                      <option value="rider">Rider (Field Executive)</option>
                      <option value="supervisor">Supervisor (Hub Mgr)</option>
                      <option value="hub_admin">Hub Admin</option>
                      <option value="admin">Admin Operations</option>
                    </>
                  ) : currentUser?.role === 'super_admin' ? (
                    // Super Admin: CANNOT create Riders (only admin/supervisor/hub)
                    <>
                      <option value="supervisor">Supervisor (Hub Mgr)</option>
                      <option value="hub_admin">Hub Admin</option>
                      <option value="admin">Admin Operations</option>
                      <option value="super_admin">Super Admin</option>
                    </>
                  ) : (
                    // Fallback (shouldn't reach here)
                    <>
                      <option value="rider">Rider (Field Executive)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-500 block mb-1">
                  Assigned Hub Base
                </label>
                <select
                  value={hubId}
                  onChange={(e) => setHubId(e.target.value)}
                  className="w-full text-xs border border-slate-200 bg-slate-50 rounded-lg p-2 focus:bg-white focus:outline-none"
                >
                  {hubs.map((hub) => (
                    <option key={hub.hubId} value={hub.hubId}>
                      {hub.hubId} - {hub.name.split(' ')[0]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-500 block mb-1">
                Primary Contact Number
              </label>
              <input
                type="tel"
                placeholder="+91 93450 XXXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full text-xs border border-slate-200 bg-slate-50 rounded-lg p-2 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-500 block mb-1">
                Employee ID (Auto Generated)
              </label>
              <input
                type="text"
                placeholder="AUTO"
                value={generatedEmployeeId}
                readOnly
                className="w-full text-xs border border-slate-200 bg-slate-50 rounded-lg p-2 focus:bg-white"
              />
              <p className="mt-1 text-[10px] text-slate-400">Formula: first 4 letters of name (uppercase) + last 4 digits of phone.</p>
            </div>
          </div>

          {/* Feedback logs */}
          {formErr && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-100">
              {formErr}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg border border-emerald-100">
              {success}
            </div>
          )}

          {/* Generated password display */}
          {generatedPassword && (
            <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-200">
              <div className="font-bold mb-1">⚠️ Temporary Password (share with user securely):</div>
              <div className="font-mono text-sm bg-amber-100 p-2 rounded border border-amber-300 text-center select-all">
                {generatedPassword}
              </div>
              <div className="mt-1 text-[10px] text-amber-600">
                The user must use "Forgot Password" on the login screen to set their own password after first login.
              </div>
            </div>
          )}

          {loading ? (
            <button
              disabled
              className="w-full bg-blue-400 text-white font-bold rounded-lg py-2.5 text-xs flex items-center justify-center gap-2"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              {canUseFirebaseOnboarding ? 'Creating Firebase Account...' : 'Onboarding...'}
            </button>
          ) : (
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg py-2.5 text-xs transition duration-150 cursor-pointer"
            >
              {canUseFirebaseOnboarding ? 'Create Staff Profile (Firebase Auth)' : 'Create Staff Profile'}
            </button>
          )}
        </form>

        {/* Super Admin re-auth prompt after onboarding */}
        {showPasswordPrompt && canUseFirebaseOnboarding && (
          <div className="bg-slate-800 p-4 border border-slate-700 rounded-xl text-[11px] leading-relaxed text-slate-300 mt-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-700 pb-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-white text-xs">Super Admin Session Restore</span>
            </div>
            <p className="text-[10px]">
              Your session was switched to the new user. Enter your Super Admin password to restore access:
            </p>
            <input
              type="password"
              placeholder="Enter Super Admin password"
              value={superAdminPassword}
              onChange={(e) => setSuperAdminPassword(e.target.value)}
              className="w-full text-xs border border-slate-600 bg-slate-900 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={handleReAuth}
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg py-2 text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
              Restore Super Admin Session
            </button>
          </div>
        )}

        <div className="bg-slate-50 p-4 border border-slate-100 rounded-lg text-[11px] leading-relaxed text-slate-500 mt-4">
          <span className="font-bold text-slate-700 block mb-1">Role Hierarchy Permission Guidelines:</span>
          Super Admins manage multi-hub parameters. Hub Admins oversee hub operations. Supervisors oversee geo-trackers and manual daily KPI score inputs for their hub. Riders connect coordinates onto live dashboards.
        </div>
      </div>

      {/* Col 2: Personnel database view list (8/12 wide) */}
      <div className="lg:col-span-8 bg-white rounded-xl border border-slate-100 shadow-xs p-5 flex flex-col justify-between h-[650px]">
        <div>
          {/* Header controls select tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
            <div>
              <h4 className="font-bold text-slate-800 text-sm font-display">EK Personnel Directory</h4>
              <p className="text-[10px] text-slate-400">Full directory listing credentials, status and contact records.</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:outline-none"
              >
                <option value="ALL">Filter Roles: All</option>
                <option value="super_admin">Super Admins</option>
                <option value="hub_admin">Hub Admins</option>
                <option value="admin">Admins</option>
                <option value="supervisor">Supervisors</option>
                <option value="rider">Riders only</option>
              </select>

              <select
                value={selectedHub}
                onChange={(e) => setSelectedHub(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:outline-none"
              >
                <option value="ALL">Filter Hubs: All</option>
                {hubs.map((hub) => (
                  <option key={hub.hubId} value={hub.hubId}>
                    {hub.hubId}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Directory Listings */}
          <div className="overflow-y-auto max-h-[460px] pr-1 grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredUsers.map((user) => {
              const isRider = user.role === 'rider';

              // Status Styling
              let statusLabel = 'bg-slate-100 text-slate-600';
              if (user.status === 'active') statusLabel = 'bg-emerald-100 text-emerald-800 border-emerald-200/50';
              if (user.status === 'suspended') statusLabel = 'bg-rose-100 text-rose-800 border-rose-200/50';

              let roleBadge = 'bg-purple-50 text-purple-700 border-purple-200';
              if (user.role === 'rider') roleBadge = 'bg-blue-50 text-blue-700 border-blue-200';
              if (user.role === 'hub_admin') roleBadge = 'bg-indigo-50 text-indigo-700 border-indigo-200';
              if (user.role === 'supervisor') roleBadge = 'bg-amber-50 text-amber-700 border-amber-200';
              if (user.role === 'super_admin') roleBadge = 'bg-rose-50 text-rose-700 border-rose-200';

              return (
                <div
                  key={user.uid}
                  className="p-3 rounded-lg border border-slate-100 shadow-2xs hover:border-blue-100 bg-slate-50/50 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h5 className="font-bold text-slate-800 text-xs">{user.fullName}</h5>
                        <span className={`text-[8.5px] font-mono uppercase font-bold border px-1.5 py-0.2 rounded-md ${roleBadge}`}>
                          {user.role === 'super_admin' ? 'S.Admin' : user.role === 'hub_admin' ? 'Hub Admin' : user.role}
                        </span>
                      </div>
                      <span className="font-mono text-[9px] text-slate-400 mt-1 block">
                        ID: {user.employeeId}
                      </span>
                      {user.email && (
                        <span className="font-mono text-[9px] text-slate-400 mt-0.5 block">
                          {user.email}
                        </span>
                      )}
                    </div>

                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${statusLabel}`}>
                      {user.status}
                    </span>
                  </div>

                  {/* Rider parameter block */}
                  {isRider && user.liveData && (
                    <div className="mt-2 pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-500">
                      <div>
                        <span>Battery Pwr: </span>
                        <span className="font-bold text-slate-700">{user.liveData.battery}%</span>
                      </div>
                      <div>
                        <span>GPS Unit: </span>
                        <span className={`font-bold ${user.liveData.gpsStatus === 'on' ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {user.liveData.gpsStatus.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mt-3.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1 text-slate-500">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span className="font-mono text-[10px]">{user.phoneNumber || '+91 N/A'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {user.status === 'active' ? (
                        <button
                          onClick={() => onUpdateStatus(user.uid, 'suspended')}
                          className="text-[10px] text-rose-600 hover:underline font-semibold cursor-pointer"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => onUpdateStatus(user.uid, 'active')}
                          className="text-[10px] text-emerald-600 hover:underline font-semibold cursor-pointer"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Directory statistics overview */}
        <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-xl text-center border border-slate-800 text-[10px] font-mono">
          <div>
            <span className="text-slate-500">TOTAL HUBSITE ROSTER</span>
            <p className="text-sm font-bold text-slate-100 mt-0.5">{users.length} Employees</p>
          </div>
          <div>
            <span className="text-slate-500">ACTIVE COURIERS</span>
            <p className="text-sm font-bold text-blue-400 mt-0.5">
              {users.filter(u => u.role === 'rider' && u.status === 'active').length} Riders
            </p>
          </div>
          <div>
            <span className="text-slate-500">SUSPENSIONS</span>
            <p className="text-sm font-bold text-rose-500 mt-0.5">
              {users.filter(u => u.status === 'suspended').length} Blocked
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}