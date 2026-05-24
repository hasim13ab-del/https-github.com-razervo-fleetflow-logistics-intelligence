import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Truck,
  CheckCircle,
  Percent,
  Users,
  MapPin,
  AlertTriangle,
  Clock,
  Battery,
  ShieldAlert,
  ArrowUpRight,
  Filter,
  Ban,
  UserX
} from 'lucide-react';
import { Hub, User, Attendance, KPIEntry, NotificationAlert } from '../types';

interface DashboardProps {
  hubs: Hub[];
  users: User[];
  attendance: Attendance[];
  kpiEntries: KPIEntry[];
  alerts: NotificationAlert[];
  onNavigateToTab: (tab: string, riderId?: string) => void;
  onClearAlert: (alertId: string) => void;
}

export default function Dashboard({
  hubs,
  users,
  attendance,
  kpiEntries,
  alerts,
  onNavigateToTab,
  onClearAlert
}: DashboardProps) {
  const [selectedHubFilter, setSelectedHubFilter] = useState<string>('ALL');

  // Filter users that are riders
  const riders = users.filter((u) => u.role === 'rider');

  // Filter data by selected Hub
  const filteredRiders = selectedHubFilter === 'ALL'
    ? riders
    : riders.filter((r) => r.hubId === selectedHubFilter);

  // Today's date
  const todayDate = new Date().toISOString().split('T')[0];

  // Calculate real metrics based on state
  const totalOfd = kpiEntries
    .filter(entry => selectedHubFilter === 'ALL' || entry.hubId === selectedHubFilter)
    .reduce((sum, entry) => sum + entry.ofd, 0);

  const totalDelivered = kpiEntries
    .filter(entry => selectedHubFilter === 'ALL' || entry.hubId === selectedHubFilter)
    .reduce((sum, entry) => sum + entry.delivered, 0);

  const totalFailed = kpiEntries
    .filter(entry => selectedHubFilter === 'ALL' || entry.hubId === selectedHubFilter)
    .reduce((sum, entry) => sum + entry.failed, 0);

  const totalCod = kpiEntries
    .filter(entry => selectedHubFilter === 'ALL' || entry.hubId === selectedHubFilter)
    .reduce((sum, entry) => sum + entry.cod, 0);

  const averageConversion = totalOfd > 0 ? (totalDelivered / totalOfd) * 100 : 0;

  // Active riders: Riders who checked in today
  const activeRiderIds = new Set(
    attendance
      .filter(att => att.date === todayDate && (selectedHubFilter === 'ALL' || att.hubId === selectedHubFilter))
      .map(att => att.userId)
  );

  // Absent riders today
  const absentRiderIds = new Set(
    attendance
      .filter(att => att.date === todayDate && att.manualStatus === 'absent' && (selectedHubFilter === 'ALL' || att.hubId === selectedHubFilter))
      .map(att => att.userId)
  );

  const absentRidersCount = filteredRiders.filter(r => absentRiderIds.has(r.uid)).length;

  const totalRidersCount = filteredRiders.length;
  const activeRidersCount = filteredRiders.filter(r => activeRiderIds.has(r.uid)).length;
  const attendanceRate = totalRidersCount > 0 ? (activeRidersCount / totalRidersCount) * 100 : 0;

  // Active alerts in high risk category
  const activeAlerts = alerts.filter(a => !a.resolved);
  const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');

  // KPI card helper component
  const KPICard = ({
    title,
    value,
    subText,
    icon: IconComponent,
    status,
    trend
  }: {
    title: string;
    value: string | number;
    subText: string;
    icon: any;
    status: string;
    trend?: { value: number; positive: boolean }
  }) => {
    let colorClasses = "border-l-4 border-blue-500 bg-white";
    let iconBg = "bg-blue-50 text-blue-600";
    if (status === 'green') {
      colorClasses = "border-l-4 border-emerald-500 bg-emerald-50/20";
      iconBg = "bg-emerald-50 text-emerald-600";
    } else if (status === 'red') {
      colorClasses = "border-l-4 border-rose-500 bg-rose-50/20";
      iconBg = "bg-rose-50 text-rose-600";
    } else if (status === 'amber') {
      colorClasses = "border-l-4 border-amber-500 bg-amber-50/20";
      iconBg = "bg-amber-50 text-amber-600";
    }

    return (
      <div className={`p-5 rounded-xl shadow-xs border border-slate-100 flex items-start justify-between transition hover:shadow-md ${colorClasses}`}>
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">{title}</p>
          <h3 className="text-2xl font-bold font-display text-slate-800">{value}</h3>
          <div className="flex items-center gap-1.5 pt-1">
            {trend && (
              <span className={`text-[10px] font-bold flex items-center font-mono ${trend.positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                {trend.positive ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                {trend.value}%
              </span>
            )}
            <span className="text-[10px] text-slate-400">{subText}</span>
          </div>
        </div>
        <div className={`p-2.5 rounded-lg ${iconBg}`}>
          <IconComponent className="w-5 h-5" />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" id="dashboard_panel">
      {/* Upper Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-800 font-display">EK Operations Room</h2>
          <p className="text-xs text-slate-400">
            Real-time Logistics Roster, GPS Pings & Performance metrics for May 20, 2026.
          </p>
        </div>

        {/* Hub Filtering pills */}
        <div className="flex items-center gap-2">
          <div className="flex items-center text-slate-400 text-xs gap-1.5 mr-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-[10px] uppercase tracking-wider font-bold">Filter Hub:</span>
          </div>
          <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200 text-xs">
            <button
              onClick={() => setSelectedHubFilter('ALL')}
              className={`px-3 py-1 rounded-md font-medium transition ${selectedHubFilter === 'ALL'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              All Hubs
            </button>
            {hubs.map((hub) => (
              <button
                key={hub.hubId}
                onClick={() => setSelectedHubFilter(hub.hubId)}
                className={`px-3 py-1 rounded-md font-medium transition ${selectedHubFilter === hub.hubId
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                {hub.hubId}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title="OFD today"
          value={totalOfd}
          subText="Items shipped out"
          icon={Truck}
          status="blue"
        />
        <KPICard
          title="Delivered"
          value={totalDelivered}
          subText={`COD Check: ₹${totalCod.toLocaleString()}`}
          icon={CheckCircle}
          status="green"
        />
        <KPICard
          title="Conversion"
          value={`${averageConversion.toFixed(1)}%`}
          subText="Delivered vs Out-For-Delivery"
          icon={Percent}
          status={averageConversion >= 85 ? "green" : averageConversion >= 70 ? "amber" : "red"}
          trend={{ value: 2.4, positive: averageConversion >= 85 }}
        />
        <KPICard
          title="Attendance Rate"
          value={`${attendanceRate.toFixed(0)}%`}
          subText={`${activeRidersCount} / ${totalRidersCount} Present Today`}
          icon={Users}
          status={attendanceRate >= 85 ? "green" : "amber"}
        />
        <KPICard
          title="Active On-Field"
          value={activeRidersCount}
          subText="Pinging live locations"
          icon={MapPin}
          status="blue"
        />
        <KPICard
          title="Failed / Returns"
          value={totalFailed}
          subText="Need supervisor follow-up"
          icon={AlertTriangle}
          status={totalFailed > 5 ? "red" : "amber"}
        />
      </div>

      {/* Main Splits Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left 2 Cols: Live Rider Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-xs flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm font-display">Live Rider Roster</h3>
              <p className="text-[10px] text-slate-400">Current active tracking pings, battery status, and activity state.</p>
            </div>
            <span className="bg-slate-100 text-slate-600 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full">
              Showing {filteredRiders.length} Riders
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-mono text-[10px] uppercase border-b border-slate-100">
                <tr>
                  <th className="p-3">Rider Name</th>
                  <th className="p-3">Hub & Supervisor</th>
                  <th className="p-3 text-center">Duty Status</th>
                  <th className="p-3 text-right">Battery</th>
                  <th className="p-3">GPS / Last Seen</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {filteredRiders.map((rider) => {
                  const hasActiveAttendance = activeRiderIds.has(rider.uid);
                  const isAbsent = absentRiderIds.has(rider.uid);
                  const attLog = attendance.find(a => a.userId === rider.uid && a.date === todayDate);

                  // Absent riders get a distinct high-visibility warning border
                  const isHighlighted = isAbsent;

                  // Determine active state tag
                  let dutyStateTag = (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400">
                      Inactive
                    </span>
                  );

                  if (isAbsent) {
                    dutyStateTag = (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300 animate-pulse">
                        <UserX className="w-3 h-3" /> ABSENT
                      </span>
                    );
                  } else if (hasActiveAttendance) {
                    if (attLog?.endDuty || attLog?.checkOut) {
                      dutyStateTag = (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                          Checked-Out
                        </span>
                      );
                    } else if (rider.liveData?.isIdle) {
                      dutyStateTag = (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 animate-pulse">
                          ● Idle {`(${Math.round(40)}m)`}
                        </span>
                      );
                    } else if (attLog?.startDuty) {
                      dutyStateTag = (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          ● On Duty
                        </span>
                      );
                    } else {
                      dutyStateTag = (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                          Ready at Hub
                        </span>
                      );
                    }
                  }

                  // Battery colors
                  const bat = rider.liveData?.battery ?? 100;
                  const batteryColor = bat < 15 ? 'text-rose-500 font-bold' : bat < 30 ? 'text-amber-500' : 'text-slate-500';

                  // GPS indicator
                  const gpsOn = rider.liveData?.gpsStatus === 'on';

                  return (
                    <tr key={rider.uid} className={`transition ${isHighlighted ? 'bg-rose-50/70 hover:bg-rose-100/70 border-l-4 border-l-rose-500' : 'hover:bg-slate-50/50'}`}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${isAbsent ? 'text-rose-800' : 'text-slate-800'}`}>{rider.fullName}</span>
                          {isAbsent && <Ban className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-slate-700">{rider.hubId}</div>
                        <div className="text-[10px] text-slate-400">
                          {users.find(u => u.uid === rider.supervisorId)?.fullName || 'Unassigned'}
                        </div>
                      </td>
                      <td className="p-3 text-center">{dutyStateTag}</td>
                      <td className="p-3 text-right">
                        <div className={`flex items-center justify-end gap-1 font-mono text-[11px] ${batteryColor}`}>
                          <Battery className="w-3.5 h-3.5 shrink-0" />
                          {bat}%
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${gpsOn ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span className="font-mono text-[10px]">
                            {gpsOn ? 'GPS Active' : 'GPS Off/Stale'}
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono">
                          {rider.liveData?.lastActive ? new Date(rider.liveData.lastActive).toLocaleTimeString() : 'No ping'}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => onNavigateToTab('monitoring', rider.uid)}
                          className="inline-flex items-center gap-1 bg-sm text-blue-600 hover:text-blue-800 font-bold text-[10px] border border-blue-100 hover:border-blue-300 rounded px-2 py-1 bg-blue-50/50 transition"
                        >
                          Ping GPS <ArrowUpRight className="w-2.5 h-2.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Realtime Alert feeds */}
        <div className="bg-slate-900 text-slate-200 rounded-xl p-5 border border-slate-800 shadow-sm flex flex-col min-h-[380px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500 pulse-alert" />
              <h4 className="font-bold text-sm tracking-wide font-display text-white">Alert Intelligence</h4>
            </div>
            {criticalAlerts.length > 0 && (
              <span className="bg-rose-500 text-white font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded">
                {criticalAlerts.length} CRITICAL
              </span>
            )}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1 max-h-[290px]">
            {activeAlerts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <CheckCircle className="w-8 h-8 text-slate-700 mb-2" />
                <p className="text-xs">No active alerts triggered.</p>
                <p className="text-[10px] mt-1 text-slate-600">Workforce status stable & geofences clear.</p>
              </div>
            ) : (
              activeAlerts.map((alert) => {
                const isCritical = alert.severity === 'critical';
                return (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border text-xs transition ${isCritical
                        ? 'bg-rose-950/40 border-rose-900 text-rose-200'
                        : 'bg-amber-950/40 border-amber-900 text-amber-200'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold ${isCritical ? 'bg-rose-900/60 text-rose-300' : 'bg-amber-950 text-amber-400'
                        }`}>
                        {alert.triggerType.replace('_', ' ')}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="font-bold text-slate-100 mb-1">{alert.message}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-2 pt-2 border-t border-slate-800/60">
                      <span>Rider: {alert.riderName}</span>
                      <button
                        onClick={() => onClearAlert(alert.id)}
                        className="text-emerald-400 hover:text-emerald-300 font-black"
                      >
                        [Resolve Alert]
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Stats Summary */}
          <div className="border-t border-slate-800 pt-4 mt-auto">
            <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <p className="text-slate-500 font-mono">GPS OFF INCIDENTS</p>
                <p className="text-lg font-bold font-mono text-rose-500 mt-0.5">
                  {activeAlerts.filter(a => a.triggerType === 'gps_off').length}
                </p>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <p className="text-slate-500 font-mono">STALENESS INDEX</p>
                <p className="text-lg font-bold font-mono text-slate-300 mt-0.5">
                  Stable
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Hub Config & Geofence overview */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-xs p-5">
        <h3 className="font-bold text-slate-800 text-sm font-display mb-4">Hub Operations Roster Check</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {hubs.map((hub) => {
            const hRiders = riders.filter(r => r.hubId === hub.hubId);
            const activeH = attendance.filter(a => a.hubId === hub.hubId && a.date === todayDate).length;
            const percentage = hRiders.length > 0 ? (activeH / hRiders.length) * 100 : 0;

            return (
              <div key={hub.hubId} className="p-4 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-100 transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 tracking-wide font-display">{hub.name}</span>
                  <span className="font-mono text-[10px] font-bold uppercase bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                    {hub.hubId}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Geofence Boundary</span>
                    <span className="font-mono text-slate-700">{hub.radius}m Radius</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>QR Attendance</span>
                    <span className="font-mono font-medium text-slate-700">
                      {hub.config.qrAttendance ? 'Mandatory QR Check' : 'GPS Verification'}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="pt-2">
                    <div className="flex justify-between items-center text-[10px] mb-1">
                      <span className="text-slate-400">Roster Attendance</span>
                      <span className="font-bold text-slate-700">{activeH} / {hRiders.length} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
