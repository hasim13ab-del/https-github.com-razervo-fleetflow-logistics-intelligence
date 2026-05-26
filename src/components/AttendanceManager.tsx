import React, { useState } from 'react';
import {
  CalendarDays,
  QrCode,
  CheckCircle,
  AlertTriangle,
  Search,
  Clock,
  MapPin,
  FileSpreadsheet,
  Shuffle,
  UserCheck,
  UserX
} from 'lucide-react';
import { Hub, User, Attendance, AttendanceStatus } from '../types';

interface AttendanceManagerProps {
  hubs: Hub[];
  users: User[];
  attendance: Attendance[];
  onSetAttendance: (userId: string, date: string, manualStatus: AttendanceStatus) => Promise<void>;
  currentUser: { hubId: string; role: string } | null;
}

export default function AttendanceManager({
  hubs,
  users,
  attendance,
  onSetAttendance,
  currentUser
}: AttendanceManagerProps) {
  const [selectedHub, setSelectedHub] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const getOrgPrefix = () => {
    const name = sessionStorage.getItem('orgName') || 'ORG';
    const clean = name.trim();
    if (!clean) return 'ORG';
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length >= 2) return (words[0][0] + words[1][0] + (words[1][1] || words[0][1] || 'X')).toUpperCase().substring(0, 4);
    if (clean.length <= 4) return clean.toUpperCase();
    return clean.slice(0, 4).toUpperCase();
  };

  // Rotating QR code token simulator
  const [currentQrToken, setCurrentQrToken] = useState<string>(
    `${getOrgPrefix()}-` + (currentUser?.hubId || 'HUB') + '-' + Math.floor(1000 + Math.random() * 9000)
  );

  // Today's date
  const todayDate = new Date().toISOString().split('T')[0];

  const rotateQrToken = () => {
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    const activeHubCode = selectedHub === 'ALL' ? (currentUser?.hubId || 'HUB') : selectedHub;
    setCurrentQrToken(`${getOrgPrefix()}-${activeHubCode}-${randomHex}`);
  };

  // Riders list filtered by hub and search
  const riders = users.filter(u => u.role === 'rider');
  const filteredRiders = riders.filter(rider => {
    const matchesHub = selectedHub === 'ALL' || rider.hubId === selectedHub;
    const matchesSearch =
      rider.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rider.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesHub && matchesSearch;
  });

  // Metrics
  const presentCount = attendance.filter(att => att.date === todayDate && att.manualStatus === 'present').length;
  const absentCount = attendance.filter(att => att.date === todayDate && att.manualStatus === 'absent').length;
  const checkedInCount = attendance.filter(att => att.date === todayDate && att.checkIn).length;

  // Get attendance for a rider on today's date
  const getRiderAttendance = (riderId: string): Attendance | undefined => {
    return attendance.find(a => a.userId === riderId && a.date === todayDate);
  };

  // Handle Present/Absent toggle
  const handleStatusToggle = async (riderId: string, status: AttendanceStatus) => {
    await onSetAttendance(riderId, todayDate, status);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="attendance_manager_view">
      {/* Visual Hub QR Code Simulator Card (4/12 wide) */}
      <div className="lg:col-span-4 bg-white rounded-xl border border-slate-100 shadow-xs p-5 flex flex-col justify-between">
        <div className="space-y-3.5">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-600" />
            <h4 className="font-bold text-slate-800 text-sm font-display">Daily Hub Attendance</h4>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Manually mark riders as <strong>Present</strong> or <strong>Absent</strong> for today ({todayDate}).
            Absent riders are blacklisted from OFD package allocation.
          </p>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
              <UserCheck className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <span className="text-lg font-black text-emerald-700 font-mono">{presentCount}</span>
              <p className="text-[10px] text-emerald-600 font-semibold">Present</p>
            </div>
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-center">
              <UserX className="w-5 h-5 text-rose-600 mx-auto mb-1" />
              <span className="text-lg font-black text-rose-700 font-mono">{absentCount}</span>
              <p className="text-[10px] text-rose-600 font-semibold">Absent</p>
            </div>
          </div>

          {/* Simulated QR block */}
          <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-xl flex flex-col items-center justify-center space-y-4">
            <svg className="w-36 h-36 bg-white p-2 border border-slate-200 rounded-lg shadow-2xs" viewBox="0 0 100 100">
              <rect x="5" y="5" width="25" height="25" fill="#001529" />
              <rect x="5" y="70" width="25" height="25" fill="#001529" />
              <rect x="70" y="5" width="25" height="25" fill="#001529" />
              <rect x="10" y="10" width="15" height="15" fill="white" />
              <rect x="10" y="75" width="15" height="15" fill="white" />
              <rect x="75" y="10" width="15" height="15" fill="white" />
              <rect x="15" y="15" width="5" height="5" fill="#001529" />
              <rect x="15" y="80" width="5" height="5" fill="#001529" />
              <rect x="80" y="15" width="5" height="5" fill="#001529" />
              <circle cx="45" cy="15" r="3" fill="#2563eb" />
              <circle cx="55" cy="25" r="3.5" fill="#001529" />
              <circle cx="45" cy="45" r="4" fill="#001529" />
              <circle cx="55" cy="55" r="3" fill="#2563eb" />
              <circle cx="15" cy="45" r="3.5" fill="#001529" />
              <circle cx="45" cy="75" r="3" fill="#001529" />
              <circle cx="75" cy="45" r="4" fill="#001529" />
              <circle cx="85" cy="65" r="3" fill="#2563eb" />
              <circle cx="85" cy="85" r="3.5" fill="#001529" />
            </svg>
            <div className="text-center">
              <span className="text-[10px] text-slate-400 font-mono block uppercase">Active Authorization Token</span>
              <span className="text-xs font-mono font-bold text-slate-700 bg-white border border-slate-200 rounded px-2.5 py-1 mt-1 block">
                {currentQrToken}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={rotateQrToken}
            className="w-full inline-flex items-center justify-center gap-2 text-xs font-bold text-blue-600 hover:text-white border border-blue-100 hover:bg-blue-600 rounded-lg py-2 transition cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5" /> Rotate Secure OTP Token
          </button>
        </div>
      </div>

      {/* Main Rider Attendance Grid (8/12 wide) */}
      <div className="lg:col-span-8 bg-white rounded-xl border border-slate-100 shadow-xs p-5 flex flex-col justify-between">

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-slate-800 text-sm font-display">Daily Rider Attendance Roster</h4>
              <p className="text-[10px] text-slate-400">Mark riders Present or Absent for today's operations.</p>
            </div>
            <button className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs text-slate-600 font-medium hover:bg-slate-100 transition shadow-2xs">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search Rider or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg pl-9 pr-4 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>

            <select
              value={selectedHub}
              onChange={(e) => setSelectedHub(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Filter: All Hub Locations</option>
              {hubs.map((h) => (
                <option key={h.hubId} value={h.hubId}>{h.hubId} - {h.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Rider Cards Grid */}
        <div className="flex-1 overflow-y-auto min-h-[400px] mt-4 space-y-2">
          {filteredRiders.length === 0 ? (
            <div className="text-center p-12 text-slate-400 text-xs">No riders found for current filters.</div>
          ) : (
            filteredRiders.map((rider) => {
              const attRecord = getRiderAttendance(rider.uid);
              const isPresent = attRecord?.manualStatus === 'present';
              const isAbsent = attRecord?.manualStatus === 'absent';
              const isUnmarked = !isPresent && !isAbsent;
              const hasCheckedIn = !!attRecord?.checkIn;

              return (
                <div
                  key={rider.uid}
                  className={`p-4 rounded-xl border transition-all ${isAbsent
                      ? 'bg-rose-50 border-rose-200 shadow-sm'
                      : isPresent
                        ? 'bg-emerald-50 border-emerald-200 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${isAbsent ? 'bg-rose-100 text-rose-600' :
                          isPresent ? 'bg-emerald-100 text-emerald-600' :
                            'bg-slate-100 text-slate-500'
                        }`}>
                        {rider.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-800 text-sm">{rider.fullName}</h5>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <span>{rider.employeeId}</span>
                          <span>·</span>
                          <span>{rider.hubId}</span>
                        </div>
                        {hasCheckedIn && (
                          <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> Checked in today
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Present Button */}
                      <button
                        onClick={() => handleStatusToggle(rider.uid, 'present')}
                        disabled={isPresent}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${isPresent
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          }`}
                      >
                        <UserCheck className="w-4 h-4 inline-block mr-1" />
                        {isPresent ? 'Present ✓' : 'Present'}
                      </button>

                      {/* Absent Button */}
                      <button
                        onClick={() => handleStatusToggle(rider.uid, 'absent')}
                        disabled={isAbsent}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${isAbsent
                            ? 'bg-rose-600 text-white shadow-sm animate-pulse'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          }`}
                      >
                        <UserX className="w-4 h-4 inline-block mr-1" />
                        {isAbsent ? 'Absent ✗' : 'Absent'}
                      </button>

                      {/* Unmarked indicator */}
                      {isUnmarked && (
                        <span className="text-[10px] text-amber-600 font-mono bg-amber-50 px-2 py-1 rounded border border-amber-200">
                          Not Marked
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Absent warning banner */}
                  {isAbsent && (
                    <div className="mt-2 pt-2 border-t border-rose-200 flex items-center gap-2 text-xs text-rose-700">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span><strong>OFD Blocked:</strong> This rider cannot receive package assignments today.</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Summary footer */}
        <div className="mt-4 grid grid-cols-3 gap-2 bg-slate-50 border border-slate-100 p-3 rounded-xl text-center text-[10px] font-mono">
          <div>
            <span className="text-slate-500">TOTAL RIDERS</span>
            <p className="text-sm font-bold text-slate-800 mt-0.5">{filteredRiders.length}</p>
          </div>
          <div>
            <span className="text-slate-500">PRESENT</span>
            <p className="text-sm font-bold text-emerald-600 mt-0.5">{presentCount}</p>
          </div>
          <div>
            <span className="text-slate-500">ABSENT</span>
            <p className="text-sm font-bold text-rose-600 mt-0.5">{absentCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}