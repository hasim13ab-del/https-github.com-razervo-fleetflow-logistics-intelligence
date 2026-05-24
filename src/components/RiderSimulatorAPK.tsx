import React, { useState } from 'react';
import { 
  Smartphone, 
  Wifi, 
  Battery, 
  MapPin, 
  QrCode, 
  Award, 
  Play, 
  Pause, 
  Home, 
  Power,
  RotateCcw,
  CheckCircle,
  AlertTriangle 
} from 'lucide-react';
import { Hub, User, Attendance, KPIEntry, Location } from '../types';
import { calculateDistance, validateAttendance } from '../utils/distance';

interface RiderSimulatorAPKProps {
  hubs: Hub[];
  users: User[];
  attendance: Attendance[];
  kpiEntries: KPIEntry[];
  onCheckIn: (userId: string, location: Location) => void;
  onStartDuty: (userId: string) => void;
  onToggleBreak: (userId: string) => void;
  onCheckOut: (userId: string) => void;
  loggedRiderId?: string;
  onLogout?: () => void;
}

export default function RiderSimulatorAPK({
  hubs,
  users,
  attendance,
  kpiEntries,
  onCheckIn,
  onStartDuty,
  onToggleBreak,
  onCheckOut,
  loggedRiderId,
  onLogout
}: RiderSimulatorAPKProps) {
  const riders = users.filter((u) => u.role === 'rider' && u.liveData);
  const [activeRiderId, setActiveRiderId] = useState<string>(() => {
    if (loggedRiderId) return loggedRiderId;
    return riders.length > 0 ? riders[0].uid : '';
  });

  React.useEffect(() => {
    if (loggedRiderId) {
      setActiveRiderId(loggedRiderId);
    }
  }, [loggedRiderId]);

  const activeRider = riders.find((r) => r.uid === activeRiderId);
  const todayDate = '2026-05-20'; // Matching our records

  const activeHub = activeRider ? hubs.find((h) => h.hubId === activeRider.hubId) : null;
  const activeAttLog = attendance.find(
    (a) => a.userId === activeRiderId && a.date === todayDate
  );

  const activeKPI = kpiEntries.find(
    (e) => e.riderId === activeRiderId && e.date === todayDate
  );

  // Simulation parameters check
  const hasCheckedIn = !!activeAttLog?.checkIn;
  const hasStartedDuty = !!activeAttLog?.startDuty;
  const hasEndedDuty = !!activeAttLog?.endDuty;
  const hasCheckedOut = !!activeAttLog?.checkOut;

  // Compute geofence results
  let distanceToHub = 0;
  let geofenceResult = { allowed: false, message: 'No location ping' };

  if (activeRider && activeRider.liveData && activeHub) {
    distanceToHub = calculateDistance(
      activeRider.liveData.currentLocation,
      activeHub.location
    );
    const valid = validateAttendance(
      activeRider.liveData.currentLocation,
      activeHub.location,
      activeHub.radius
    );
    geofenceResult = { allowed: valid.allowed, message: valid.message };
  }

  // Handle mobile check-in action (validating geofence)
  const [apkMessage, setApkMessage] = useState<{ status: 'success' | 'error'; text: string } | null>(null);

  const handleApkCheckIn = () => {
    if (!activeRider || !activeRider.liveData || !activeHub) return;
    setApkMessage(null);

    const checkLoc = activeRider.liveData.currentLocation;
    const validation = validateAttendance(checkLoc, activeHub.location, activeHub.radius);

    if (activeRider.liveData.gpsStatus === 'off') {
      setApkMessage({
        status: 'error',
        text: 'CHECK-IN FAILED: System indicates your phone GPS unit is turned OFF!'
      });
      return;
    }

    if (validation.allowed) {
      onCheckIn(activeRider.uid, checkLoc);
      setApkMessage({
        status: 'success',
        text: `Check-in Authorized! Verified within ${validation.distance}m radius of Hub.`
      });
    } else {
      setApkMessage({
        status: 'error',
        text: `GEOFENCE ERROR: You are ${Math.round(validation.distance - activeHub.radius)}m outside the Hub range! Move closer to loading dock.`
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-between h-full bg-slate-100 p-4 border border-slate-200 shadow-sm rounded-xl" id="rider_mobile_simulation">
      
      {/* Top Selector: Swap device view */}
      <div className="w-full bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3 mb-4">
        <div>
          <span className="text-[10px] text-slate-400 font-mono block uppercase">ACTIVE SMARTPHONE SIMULATOR</span>
          <span className="font-bold text-xs text-slate-800">Phone of: {activeRider?.fullName || 'N/A'}</span>
        </div>
        
        {loggedRiderId ? (
          onLogout && (
            <button
              onClick={onLogout}
              className="text-xs bg-red-50 text-red-600 hover:bg-red-100/80 hover:text-red-700 border border-red-200 rounded-lg px-2.5 py-1.5 font-bold transition"
            >
              Log Out Unit
            </button>
          )
        ) : (
          <select
            value={activeRiderId}
            onChange={(e) => {
              setActiveRiderId(e.target.value);
              setApkMessage(null);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1.5 focus:outline-none"
          >
            {riders.map((r) => (
              <option key={r.uid} value={r.uid}>
                {r.fullName} ({r.hubId})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Main Bezel Smart phone frame enclosure */}
      {activeRider ? (
        <div className="relative w-[340px] h-[550px] bg-[#0d1527] rounded-[36px] p-3 border-4 border-slate-800 shadow-2xl flex flex-col justify-between overflow-hidden">
          
          {/* Bezel Notch Camera */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-5 bg-slate-800 rounded-b-xl z-20 flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-black/60 mr-1.5" />
            <span className="w-10 h-1 bg-black/40 rounded-full" />
          </div>

          {/* Smartphone screen boundary */}
          <div className="flex-1 rounded-[28px] overflow-hidden bg-slate-900 flex flex-col justify-between text-slate-300 relative">
            
            {/* Native Status Top Bar */}
            <div className="h-7 bg-slate-950 px-4 pt-1 flex items-center justify-between text-[10px] font-mono font-medium text-slate-400 z-10 selection:bg-transparent">
              <span>08:15 AM</span>
              <div className="flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="text-[8px] font-black text-blue-400">5G READY</span>
                <span className="ml-1 shrink-0 flex items-center gap-0.5">
                  <Battery className="w-3.5 h-3.5 text-slate-400" />
                  {activeRider.liveData?.battery}%
                </span>
              </div>
            </div>

            {/* Simulated Native App Body */}
            <div className="flex-1 flex flex-col justify-between bg-slate-950 p-4 overflow-y-auto">
              
              {/* Profile welcome board */}
              <div className="bg-slate-900 border border-slate-800/80 p-3.5 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 font-bold font-display uppercase">
                  {activeRider.fullName.slice(0, 2)}
                </div>
                <div>
                  <h5 className="font-bold text-xs text-white">Good Morning, {activeRider.fullName.split(' ')[0]}</h5>
                  <p className="font-mono text-[9px] text-slate-500">{activeRider.employeeId}</p>
                </div>
              </div>

              {/* Duty shift large CTA panel */}
              <div className="flex-1 py-4 flex flex-col justify-center space-y-3.5">
                
                {/* 1. Geofenced Clock In/Out button */}
                {!hasCheckedIn ? (
                  <button
                    onClick={handleApkCheckIn}
                    className="w-full h-15 bg-blue-600 active:bg-blue-700 text-white font-bold rounded-2xl text-xs tracking-wider flex flex-col items-center justify-center shadow-lg hover:shadow-blue-500/10 transition"
                  >
                    <span className="font-extrabold text-sm font-display uppercase">CHECK IN (GPS &amp; GEOLOCATION)</span>
                    <span className="text-[9px] font-mono opacity-80 mt-0.5 font-normal">Hub geofence scan</span>
                  </button>
                ) : !hasStartedDuty ? (
                  // 2. Start Duty Action Card
                  <div className="space-y-2">
                    <span className="text-[9px] text-slate-500 uppercase font-mono tracking-wider font-bold block text-center">
                      Checked In. Ready at Hub.
                    </span>
                    <button
                      onClick={() => onStartDuty(activeRider.uid)}
                      className="w-full h-20 bg-emerald-600 active:bg-emerald-700 hover:bg-emerald-550 text-white font-black rounded-2xl text-base tracking-wider shadow-lg flex flex-col items-center justify-center transition"
                    >
                      <span className="font-black flex items-center gap-1"><Play className="w-5 h-5 fill-white" /> START DUTY</span>
                      <span className="text-[10px] font-mono opacity-80 mt-1 font-normal">Initiate tracking log</span>
                    </button>
                  </div>
                ) : (
                  // 3. Active duty controls (Take Break, End Shift)
                  <div className="space-y-3">
                    <div className="bg-emerald-950/40 border border-emerald-900/60 rounded-xl p-2.5 text-center text-xs text-emerald-300 flex items-center justify-center gap-2">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                      <span className="font-bold">ON DUTY TRACKING ACTIVE</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => onToggleBreak(activeRider.uid)}
                        className={`h-24 font-bold rounded-2xl text-xs flex flex-col items-center justify-center gap-1 transition ${
                          activeRider.liveData?.isIdle 
                            ? 'bg-amber-600 text-white select-none shadow' 
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-705'
                        }`}
                      >
                        <Pause className="w-4 h-4 text-white" />
                        <span>{activeRider.liveData?.isIdle ? 'RESUME SHIFT' : 'TAKE BREAK'}</span>
                      </button>

                      <button
                        onClick={() => onCheckOut(activeRider.uid)}
                        className="h-24 bg-rose-600 active:bg-rose-700 hover:bg-rose-550 text-white font-bold rounded-2xl text-xs flex flex-col items-center justify-center gap-1 shadow"
                      >
                        <Power className="w-4 h-4 text-white" />
                        <span>END SHIFT</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Submitting Geofence & simulation messages */}
                {apkMessage && (
                  <div className={`p-3 rounded-xl border text-[11px] leading-relaxed font-semibold transition-all ${
                    apkMessage.status === 'success' 
                      ? 'bg-emerald-950/80 text-emerald-200 border-emerald-900' 
                      : 'bg-rose-950/80 text-rose-200 border-rose-900'
                  }`}>
                    <div className="flex gap-2">
                      {apkMessage.status === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <p>{apkMessage.text}</p>
                    </div>
                  </div>
                )}

              </div>

              {/* Status information tracker */}
              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-3.5 space-y-2 text-[10px] font-mono text-slate-400">
                <div className="flex justify-between items-center pb-1 border-b border-slate-800">
                  <span className="text-slate-500 uppercase tracking-wider text-[8.5px]">GPS coordinates</span>
                  <span className={`font-semibold ${activeRider.liveData?.gpsStatus === 'on' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {activeRider.liveData?.gpsStatus === 'on' ? 'CONNECTED' : 'GPS UNIT OFF'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Assigned Base</span>
                  <span className="text-white hover:underline">{activeHub?.name.split(' ')[0]} Hub</span>
                </div>

                <div className="flex justify-between">
                  <span>Geofence Distance</span>
                  <span className={`font-bold ${geofenceResult.allowed ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {distanceToHub ? `${distanceToHub.toFixed(0)}m away` : '0m'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Allowed Perimeter</span>
                  <span className="text-slate-200">{activeHub?.radius}m Radius</span>
                </div>
              </div>

              {/* Local mini KPI stats list */}
              <div className="bg-[#001529]/80 border border-slate-800 rounded-2xl p-3 flex items-center justify-between mt-3 text-xs">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <div>
                    <span className="text-[10px] text-slate-500 block font-mono">TODAY'S CONVERSION</span>
                    <span className="font-bold text-slate-200">
                      {activeKPI ? `${activeKPI.conversionRate.toFixed(1)}%` : '90.6%'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block font-mono">DELIVERED OFD</span>
                  <span className="font-semibold text-slate-200">
                    {activeKPI ? `${activeKPI.delivered}/${activeKPI.ofd}` : '29/32'}
                  </span>
                </div>
              </div>

            </div>

            {/* Smartphone screen navigation buttons mock */}
            <div className="h-10 bg-slate-950 border-t border-slate-900 flex items-center justify-around text-slate-500 py-1 font-sans font-medium selection:bg-transparent">
              <button className="flex flex-col items-center justify-center p-1 text-[8.5px] text-slate-600 transition">
                <Home className="w-3.5 h-3.5 mb-0.5 text-slate-600" />
                Home
              </button>
              <div className="w-12 h-1 bg-slate-800 rounded-full cursor-pointer hover:bg-slate-700 transition" />
              <button 
                onClick={() => setApkMessage(null)}
                className="flex flex-col items-center justify-center p-1 text-[8.5px] hover:text-slate-400 transition"
              >
                <RotateCcw className="w-3.5 h-3.5 mb-0.5" />
                Clear
              </button>
            </div>

          </div>
        </div>
      ) : (
        <div className="text-center p-12 text-slate-400">
          No riders initialized.
        </div>
      )}

      {/* Simulator Quick Tips */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-150 rounded-lg text-[11px] leading-relaxed text-slate-600">
        <span className="font-bold text-blue-800 block mb-0.5">💡 Simulator Interactive Guide:</span>
        To test **Geofence Clock-In rules**, click **"Rider Monitoring"** in the ERP sidebar, select the rider’s phone name, then drag their spatial coordinates to exceed their allowed radius. Then, attempt to tap the large **"CHECK IN"** button inside this mobile shell to see real-time geofence failures!
      </div>

    </div>
  );
}
