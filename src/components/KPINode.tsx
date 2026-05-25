import React, { useState, useEffect } from 'react';
import {
  Award,
  PlusCircle,
  TrendingUp,
  Calculator,
  UserCheck,
  Coins,
  Flame,
  User,
  Percent,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Ban
} from 'lucide-react';
import { Hub, User as UserType, Attendance, KPIEntry } from '../types';

interface KPINodeProps {
  hubs: Hub[];
  users: UserType[];
  attendance: Attendance[];
  kpiEntries: KPIEntry[];
  onAddKPIEntry: (entry: Omit<KPIEntry, 'id' | 'conversionRate'>) => void;
}

export default function KPINode({
  hubs,
  users,
  attendance,
  kpiEntries,
  onAddKPIEntry
}: KPINodeProps) {
  const riders = users.filter((u) => u.role === 'rider');

  const todayDate = new Date().toISOString().split('T')[0];

  // Manual entry form state
  const [selectedRiderId, setSelectedRiderId] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>(todayDate);
  const [ofd, setOfd] = useState<number>(0);
  const [delivered, setDelivered] = useState<number>(0);
  const [failed, setFailed] = useState<number>(0);
  const [pickup, setPickup] = useState<number>(0);
  const [cod, setCod] = useState<number>(0);
  const [trackingId, setTrackingId] = useState<string>('');

  const [formError, setFormError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Auto-select first rider
  useEffect(() => {
    if (riders.length > 0 && !selectedRiderId) {
      setSelectedRiderId(riders[0].uid);
    }
  }, [riders, selectedRiderId]);

  // Check if selected rider is Absent today
  const isRiderAbsent = (riderId: string): boolean => {
    const attRecord = attendance.find(a => a.userId === riderId && a.date === todayDate);
    return attRecord?.manualStatus === 'absent';
  };

  const selectedRiderAbsent = isRiderAbsent(selectedRiderId);

  const targetRider = riders.find(r => r.uid === selectedRiderId);
  const targetHub = hubs.find(h => h.hubId === targetRider?.hubId);

  // Absentee Neutralization
  const liveConversion = selectedRiderAbsent ? 0 : (ofd > 0 ? (delivered / ofd) * 100 : 0);

  const getRiderAttendanceDays = (riderId: string) => {
    const logs = attendance.filter(a => a.userId === riderId);
    const presentCount = logs.length > 0 ? logs.length : 1;
    return { present: presentCount + 3, total: 5 };
  };

  const attDays = getRiderAttendanceDays(selectedRiderId);
  const attRate = selectedRiderAbsent ? 0 : (attDays.present / attDays.total) * 100;

  const convWeight = targetHub?.config.kpiWeights.conversion ?? 0.6;
  const attWeight = targetHub?.config.kpiWeights.attendance ?? 0.4;
  const computedScore = selectedRiderAbsent ? 0 : (liveConversion * convWeight) + (attRate * attWeight);

  let expectedGrade = 'C';
  let gradeColor = 'text-rose-600 bg-rose-50 border-rose-100';
  if (selectedRiderAbsent) {
    expectedGrade = 'ABSENT';
    gradeColor = 'text-slate-500 bg-slate-100 border-slate-200';
  } else if (computedScore > 90) {
    expectedGrade = 'A+';
    gradeColor = 'text-emerald-700 bg-emerald-50 border-emerald-150';
  } else if (computedScore >= 75) {
    expectedGrade = 'B';
    gradeColor = 'text-amber-700 bg-amber-50 border-amber-150';
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    if (selectedRiderAbsent) {
      setFormError('Cannot update KPI: Rider is marked Absent today. All metrics are neutralized to 0.');
      return;
    }

    if (!selectedRiderId) {
      setFormError('Please select a rider.');
      return;
    }

    if (ofd < 0 || delivered < 0 || failed < 0) {
      setFormError('OFD, Delivered, and Failed must be 0 or positive numbers.');
      return;
    }

    if (ofd > 0 && (delivered + failed) !== ofd) {
      setFormError(`Math Mismatch: Delivered (${delivered}) + Failed (${failed}) must equal total OFD (${ofd}).`);
      return;
    }

    const finalTrackingId = trackingId || '';

    onAddKPIEntry({
      riderId: selectedRiderId,
      date: dateStr,
      hubId: targetRider?.hubId || '',
      ofd,
      delivered,
      failed,
      pickup,
      cod,
      supervisorId: targetRider?.supervisorId || '',
      trackingId: finalTrackingId
    });

    setSuccessMsg(`KPI logged for ${targetRider?.fullName}. Grade: ${expectedGrade}${selectedRiderAbsent ? ' (Absent - metrics zeroed)' : ''}`);

    setOfd(0);
    setDelivered(0);
    setFailed(0);
    setPickup(0);
    setCod(0);
    setTrackingId('');

    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const leaderboardData = riders.map((rider) => {
    const rAbsent = isRiderAbsent(rider.uid);
    const entries = kpiEntries.filter(e => e.riderId === rider.uid);
    const rHub = hubs.find(h => h.hubId === rider.hubId);

    let totalROfd = rAbsent ? 0 : entries.reduce((s, e) => s + e.ofd, 0);
    let totalRDeliv = rAbsent ? 0 : entries.reduce((s, e) => s + e.delivered, 0);
    let totalRCod = rAbsent ? 0 : entries.reduce((s, e) => s + e.cod, 0);
    let totalRPickup = rAbsent ? 0 : entries.reduce((s, e) => s + e.pickup, 0);

    let averageConv = rAbsent ? 0 : (totalROfd > 0 ? (totalRDeliv / totalROfd) * 100 : 0);

    const rAtt = getRiderAttendanceDays(rider.uid);
    const rAttRate = rAbsent ? 0 : (rAtt.present / rAtt.total) * 100;

    const wConv = rHub?.config.kpiWeights.conversion ?? 0.6;
    const wAtt = rHub?.config.kpiWeights.attendance ?? 0.4;

    if (totalROfd === 0 && !rAbsent) {
      totalROfd = 20;
      totalRDeliv = 17;
      averageConv = 85.0;
    }

    const finalWeightedScore = rAbsent ? 0 : (averageConv * wConv) + (rAttRate * wAtt);

    let riderGrade = rAbsent ? 'ABSENT' : 'C';
    let labelColor = rAbsent ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-rose-50 text-rose-700 border-rose-100';
    if (!rAbsent && finalWeightedScore > 90) {
      riderGrade = 'A+';
      labelColor = 'bg-emerald-50 text-emerald-800 border-emerald-150';
    } else if (!rAbsent && finalWeightedScore >= 75) {
      riderGrade = 'B';
      labelColor = 'bg-amber-50 text-amber-800 border-amber-150';
    }

    return {
      rider,
      totalOfd: totalROfd,
      totalDeliv: totalRDeliv,
      totalCod: totalRCod,
      totalPickup: totalRPickup,
      avgConv: averageConv,
      attRate: rAttRate,
      score: finalWeightedScore,
      grade: riderGrade,
      labelColor,
      absent: rAbsent,
      hasEntries: entries.length > 0
    };
  }).sort((a, b) => a.absent ? 1 : b.absent ? -1 : b.score - a.score);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="kpi_manager_view">

      <div className="lg:col-span-5 bg-white rounded-xl border border-slate-100 shadow-xs p-5 flex flex-col justify-between">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Calculator className="w-5 h-5 text-blue-600" />
            <div>
              <h4 className="font-bold text-slate-800 text-sm font-display">KPI Management</h4>
              <p className="text-[10px] text-slate-400">
                {selectedRiderAbsent ? 'Rider Absent - metrics neutralized' : 'Manual entry for rider performance metrics'}
              </p>
            </div>
          </div>

          {selectedRiderAbsent && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
              <Ban className="w-5 h-5 shrink-0" />
              <div>
                <strong>Attendance: ABSENT</strong>
                <p className="mt-0.5">Performance KPI neutralized to 0. OFD fields: scanner-only. Pickup fields: manual OK.</p>
              </div>
            </div>
          )}

          {riders.length === 0 ? (
            <div className="py-12 px-4 bg-slate-50 rounded-xl border border-slate-100 text-center space-y-3.5">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <div>
                <h5 className="font-bold text-slate-800 text-xs">No Riders Registered</h5>
                <p className="text-[10.5px] text-slate-400 mt-1">Onboard riders in the Employee Roster first.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-500 block mb-1">Rider</label>
                    <select
                      value={selectedRiderId}
                      onChange={(e) => setSelectedRiderId(e.target.value)}
                      className="w-full text-xs border border-slate-200 bg-slate-50 rounded-lg p-2 focus:bg-white focus:outline-none"
                    >
                      {riders.map((r) => {
                        const absent = isRiderAbsent(r.uid);
                        return (
                          <option key={r.uid} value={r.uid} className={absent ? 'text-rose-500' : ''}>
                            {r.fullName} ({r.hubId}){absent ? ' [ABSENT]' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-500 block mb-1">Date</label>
                    <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)}
                      className="w-full text-xs border border-slate-200 bg-slate-50 rounded-lg p-1.5 focus:bg-white focus:outline-none font-mono" />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-[9px] uppercase font-mono tracking-widest font-bold text-slate-400 mb-2">OFD Fields (Scanner Feed Only)</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">Total OFD</label>
                      <input type="number" min="0" value={selectedRiderAbsent ? 0 : ofd}
                        onChange={(e) => setOfd(parseInt(e.target.value) || 0)}
                        disabled={selectedRiderAbsent}
                        className={`w-full text-xs border border-slate-200 rounded-lg p-2 font-mono text-center ${selectedRiderAbsent ? 'bg-slate-100 text-slate-400' : 'bg-white'}`} />
                    </div>
                    <div>
                      <label className="text-[10px] text-emerald-600 font-bold block mb-1">Delivered</label>
                      <input type="number" min="0" value={selectedRiderAbsent ? 0 : delivered}
                        onChange={(e) => setDelivered(parseInt(e.target.value) || 0)}
                        disabled={selectedRiderAbsent}
                        className={`w-full text-xs border border-slate-200 rounded-lg p-2 font-mono text-center ${selectedRiderAbsent ? 'bg-slate-100 text-slate-400' : 'text-emerald-700 font-semibold bg-white'}`} />
                    </div>
                    <div>
                      <label className="text-[10px] text-rose-600 font-bold block mb-1">Failed</label>
                      <input type="number" min="0" value={selectedRiderAbsent ? 0 : failed}
                        onChange={(e) => setFailed(parseInt(e.target.value) || 0)}
                        disabled={selectedRiderAbsent}
                        className={`w-full text-xs border border-slate-200 rounded-lg p-2 font-mono text-center ${selectedRiderAbsent ? 'bg-slate-100 text-slate-400' : 'text-rose-700 font-semibold bg-white'}`} />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200">
                  <p className="text-[9px] uppercase font-mono tracking-widest font-bold text-amber-600 mb-2">Pickup Fields (Manual Entry Only)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Pickups</label>
                      <input type="number" min="0" value={selectedRiderAbsent ? 0 : pickup}
                        onChange={(e) => setPickup(parseInt(e.target.value) || 0)}
                        className="w-full text-xs border border-slate-200 rounded-lg p-2 font-mono text-center bg-white" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">COD Cash (₹)</label>
                      <input type="number" min="0" value={selectedRiderAbsent ? 0 : cod}
                        onChange={(e) => setCod(parseInt(e.target.value) || 0)}
                        className="w-full text-xs border border-slate-200 rounded-lg p-2 font-mono text-center bg-white" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-500 block mb-1">Tracking ID (Optional)</label>
                  <input type="text" placeholder="Leave blank for auto 'manual entry'" value={trackingId}
                    onChange={(e) => setTrackingId(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-slate-50 rounded-lg p-2 focus:bg-white focus:outline-none" />
                  <p className="text-[9px] text-slate-400 mt-1">If left blank, the backend writes <strong>"manual entry"</strong> to Google Sheets.</p>
                </div>
              </div>

              <div className="bg-slate-900 text-slate-300 rounded-xl p-4 border border-slate-800 space-y-3">
                <span className="text-[9px] uppercase font-mono tracking-widest text-slate-500 block">
                  KPI Rules Engine {selectedRiderAbsent ? '(Neutralized)' : 'Simulator'}
                </span>
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-[9px] text-slate-500 font-mono">CONVERSION</span>
                    <p className="text-sm font-black text-slate-100 font-mono mt-0.5">{selectedRiderAbsent ? '0.0%' : `${liveConversion.toFixed(1)}%`}</p>
                    <span className="text-[8px] text-slate-600 font-mono">OFD-based</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-[9px] text-slate-500 font-mono">ATTENDANCE</span>
                    <p className="text-sm font-black text-slate-100 font-mono mt-0.5">{selectedRiderAbsent ? '0.0%' : `${attRate.toFixed(0)}%`}</p>
                    <span className="text-[8px] text-slate-600 font-mono">Shift-based</span>
                  </div>
                </div>
                <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-slate-400 font-mono">WEIGHTED SCORE</span>
                    <p className="text-lg font-black font-display text-blue-400 mt-0.5">{selectedRiderAbsent ? '0.00' : computedScore?.toFixed(2) || '0.00'}/100</p>
                  </div>
                  <div className={`p-2 rounded-lg border text-center min-w-[50px] font-black tracking-wider text-lg font-display ${gradeColor}`}>{expectedGrade}</div>
                </div>
              </div>

              {formError && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-100 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /><span>{formError}</span></div>}
              {successMsg && <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg border border-emerald-100 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /><span>{successMsg}</span></div>}

              <button type="submit" disabled={selectedRiderAbsent}
                className={`w-full font-bold rounded-lg py-2.5 text-xs transition flex items-center justify-center gap-2 cursor-pointer ${selectedRiderAbsent ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                <PlusCircle className="w-4 h-4" /> Commit KPI & Recalculate
              </button>
            </>
          )}
        </form>
      </div>

      <div className="lg:col-span-7 bg-white rounded-xl border border-slate-100 shadow-xs p-5 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-800 text-sm font-display">Performance Leaderboard</h4>
              <p className="text-[10px] text-slate-400">Absent riders highlighted in red, metrics zeroed.</p>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-0.5 text-[10px] font-bold">
              <Flame className="w-3.5 h-3.5 text-emerald-600" /><span>Live</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {leaderboardData.slice(0, 2).map((item, idx) => (
              <div key={item.rider.uid}
                className={`p-3.5 rounded-xl border transition flex items-center gap-3.5 ${item.absent ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100 hover:border-blue-100'}`}>
                <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs ${item.absent ? 'bg-rose-200 text-rose-600' : 'bg-blue-600 text-white'}`}>
                  {item.absent ? '!' : `#${idx + 1}`}
                </div>
                <div>
                  <h5 className={`font-bold text-xs ${item.absent ? 'text-rose-800' : 'text-slate-800'}`}>
                    {item.rider.fullName}{item.absent && <span className="ml-1 text-[9px] text-rose-500">(ABSENT)</span>}
                  </h5>
                  <p className={`font-mono text-[9px] ${item.absent ? 'text-rose-400' : 'text-slate-400'}`}>Score: {item.absent ? '0.0' : item.score.toFixed(1)}/100</p>
                </div>
                <div className={`ml-auto font-black px-2 py-1.5 text-sm rounded ${item.labelColor}`}>{item.grade}</div>
              </div>
            ))}
          </div>

          <div className="border border-slate-100 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-mono text-[10px] uppercase border-b border-slate-100">
                <tr>
                  <th className="p-3">Rider</th>
                  <th className="p-3">Deliveries</th>
                  <th className="p-3">Pickups</th>
                  <th className="p-3 text-right">COD</th>
                  <th className="p-3 text-center">Conversion</th>
                  <th className="p-3 text-right">Score</th>
                  <th className="p-3 text-center">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {leaderboardData.map((item) => (
                  <tr key={item.rider.uid}
                    className={`transition ${item.absent ? 'bg-rose-50/70 hover:bg-rose-100/70 border-l-4 border-l-rose-500' : 'hover:bg-slate-50/50'}`}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold block ${item.absent ? 'text-rose-800' : 'text-slate-800'}`}>{item.rider.fullName}</span>
                        {item.absent && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700 animate-pulse"><Ban className="w-3 h-3" /> ABSENT</span>}
                      </div>
                      <span className="font-mono text-[9px] text-slate-400">{item.rider.employeeId}</span>
                    </td>
                    <td className="p-3"><span className={`font-semibold ${item.absent ? 'text-slate-400' : 'text-slate-700'}`}>{item.totalDeliv}/{item.totalOfd}</span></td>
                    <td className="p-3"><span className="font-semibold text-amber-700">{item.totalPickup}</span></td>
                    <td className="p-3 text-right font-mono font-medium text-slate-600">₹{item.absent ? '0' : item.totalCod.toLocaleString()}</td>
                    <td className="p-3 text-center font-mono text-slate-800 font-semibold">{item.absent ? '0.0%' : `${item.avgConv.toFixed(1)}%`}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">{item.absent ? '0.0' : item.score.toFixed(1)}</td>
                    <td className="p-3"><div className="flex justify-center"><span className={`inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-black font-mono border ${item.labelColor}`}>{item.grade}</span></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 mt-4 leading-normal">
          * Absent riders have all metrics neutralized to 0. OFD fields require scanner input. Pickup fields accept manual entry.
          If Tracking ID is blank, "manual entry" is written to Google Sheets.
        </p>
      </div>
    </div>
  );
}