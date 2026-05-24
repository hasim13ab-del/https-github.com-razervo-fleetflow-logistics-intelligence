import React, { useState } from 'react';
import { PackageCheck, QrCode, Search, CheckCircle2, User as UserIcon, Loader2, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { User, Hub, Attendance } from '../types';
import { appendOFDAssignment } from '../utils/sheets';

interface OFDTrackerProps {
  users: User[];
  hubs: Hub[];
  currentUser: { hubId: string; role: string; email?: string; uid: string } | null;
  attendance: Attendance[];
  onOFDScan: (shipmentId: string, riderId: string, trackingId?: string) => Promise<{ success: boolean; message: string }>;
}

interface ScannedShipment {
  id: string;
  status: 'Assigned';
  timestamp: string;
  riderId: string;
  riderName: string;
}

export default function OFDTracker({ users, hubs, currentUser, attendance, onOFDScan }: OFDTrackerProps) {
  const [shipmentId, setShipmentId] = useState<string>('');
  const [selectedRiderId, setSelectedRiderId] = useState<string>('');
  const [trackingId, setTrackingId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [scannedItems, setScannedItems] = useState<ScannedShipment[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const todayDate = new Date().toISOString().split('T')[0];
  const riders = users.filter(u => u.role === 'rider' && (currentUser?.role === 'super_admin' || u.hubId === currentUser?.hubId));

  // Check if selected rider is Absent today
  const isRiderAbsent = (riderId: string): boolean => {
    const attRecord = attendance.find(a => a.userId === riderId && a.date === todayDate);
    return attRecord?.manualStatus === 'absent';
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipmentId.trim()) return;
    if (!selectedRiderId) {
      setStatusMessage({ text: 'Please select a rider first.', type: 'error' });
      return;
    }

    // Absentee Block: Rider marked Absent cannot receive shipments
    if (isRiderAbsent(selectedRiderId)) {
      setStatusMessage({
        text: 'Operation Denied: Rider marked Absent today.',
        type: 'error'
      });
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const rider = users.find(u => u.uid === selectedRiderId);
      if (!rider) {
        setStatusMessage({ text: 'Rider not found.', type: 'error' });
        setIsProcessing(false);
        return;
      }

      // Call the parent handler which writes to Firestore
      const result = await onOFDScan(shipmentId, selectedRiderId, trackingId || undefined);

      if (!result.success) {
        setStatusMessage({ text: result.message, type: 'error' });
        setIsProcessing(false);
        return;
      }

      // Append to Google Sheets via OAuth2 token
      try {
        const spreadsheetId = localStorage.getItem('ek_sheets_id');
        if (spreadsheetId) {
          await appendOFDAssignment(
            spreadsheetId,
            new Date().toISOString(),
            shipmentId,
            rider.fullName,
            'Assigned',
            trackingId || undefined
          );
          console.log(`Sheets row appended for ${currentUser?.email}`);
        } else {
          console.log('No Google Sheets ID configured. Skipping sheets update.');
          // In production, prompt the user to create or link a sheet
        }
      } catch (sheetErr) {
        console.warn('Sheets append failed (non-blocking):', sheetErr);
        // Non-blocking: the Firestore write already succeeded
      }

      // Update local scanned items state
      const newItem: ScannedShipment = {
        id: shipmentId,
        status: 'Assigned',
        timestamp: new Date().toISOString(),
        riderId: selectedRiderId,
        riderName: rider.fullName
      };

      setScannedItems(prev => [newItem, ...prev]);
      setStatusMessage({
        text: `✓ Shipment ${shipmentId} assigned to ${rider.fullName}${trackingId ? ` (Tracking: ${trackingId})` : ''}`,
        type: 'success'
      });
      setShipmentId('');
      setTrackingId('');

    } catch (error) {
      setStatusMessage({ text: 'Failed to assign shipment.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="ofd_tracker_panel">
      {/* Tracker Entry Panel (5/12) */}
      <div className="lg:col-span-5 bg-white rounded-xl border border-slate-100 shadow-xs p-5 flex flex-col justify-between h-[700px]">
        <div>
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-6">
            <PackageCheck className="w-5 h-5 text-blue-600" />
            <div>
              <h4 className="font-bold text-slate-800 text-sm font-display">OFD Intake Scanner</h4>
              <p className="text-[10px] text-slate-400">Scan or manually enter Shipment IDs to assign Out For Delivery</p>
            </div>
          </div>

          <form onSubmit={handleScan} className="space-y-5">
            <div>
              <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-500 block mb-1">
                Assign To Rider
              </label>
              <div className="relative">
                <UserIcon className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
                <select
                  value={selectedRiderId}
                  onChange={(e) => setSelectedRiderId(e.target.value)}
                  className="w-full text-xs border border-slate-200 bg-slate-50 rounded-lg p-2 pl-8 focus:bg-white focus:outline-none"
                  required
                >
                  <option value="" disabled>Select a rider...</option>
                  {riders.map(r => {
                    const absent = isRiderAbsent(r.uid);
                    return (
                      <option key={r.uid} value={r.uid} disabled={absent} className={absent ? 'text-rose-400' : ''}>
                        {r.fullName} ({r.employeeId}){absent ? ' [ABSENT]' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
              {/* Absent rider indicator */}
              {selectedRiderId && isRiderAbsent(selectedRiderId) && (
                <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span><strong>Blocked:</strong> Rider marked Absent. Cannot assign shipments.</span>
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl">
              <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-500 block mb-2 text-center">
                Scan Barcode / QR
              </label>
              <div className="flex justify-center mb-3 text-slate-300">
                <QrCode className="w-16 h-16" />
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Scan or enter Shipment ID..."
                  value={shipmentId}
                  onChange={(e) => setShipmentId(e.target.value)}
                  className="w-full text-sm border-2 border-blue-200 bg-white rounded-lg p-2.5 pl-8 focus:border-blue-500 focus:outline-none font-mono font-bold"
                  autoFocus
                />
              </div>
            </div>

            {/* KPI Manual Override Fallback: Optional Tracking ID field */}
            <div>
              <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-500 block mb-1">
                Tracking ID (Optional)
              </label>
              <input
                type="text"
                placeholder="Leave blank for auto-generated tracking"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                className="w-full text-xs border border-slate-200 bg-slate-50 rounded-lg p-2 focus:bg-white focus:outline-none"
              />
              <p className="text-[9px] text-slate-400 mt-1">
                If left blank, the system will write <strong>"manual entry"</strong> to the tracking column.
              </p>
            </div>

            <button
              type="submit"
              disabled={isProcessing || !shipmentId.trim() || !selectedRiderId || isRiderAbsent(selectedRiderId)}
              className={`w-full font-bold rounded-lg py-3 text-sm flex items-center justify-center gap-2 transition ${isProcessing || !shipmentId.trim() || !selectedRiderId || isRiderAbsent(selectedRiderId)
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                }`}
            >
              {isProcessing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing Webhook...</>
              ) : (
                <><PackageCheck className="w-4 h-4" /> Assign & Sync to Sheets</>
              )}
            </button>
          </form>

          {/* Status messages */}
          {statusMessage && (
            <div className={`mt-4 p-3 rounded-lg text-xs font-bold ${statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
              {statusMessage.type === 'error' && <AlertTriangle className="w-4 h-4 inline mr-1" />}
              {statusMessage.text}
            </div>
          )}
        </div>

        {/* Google Sheets integration status */}
        <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-lg text-[10px] text-slate-500 font-mono mt-4">
          <span className="font-bold text-slate-700 block mb-1">Integration Active:</span>
          Assignments trigger automated API webhooks to Google Sheets tied to <span className="font-bold">{currentUser?.email}</span>.
          {!localStorage.getItem('ek_sheets_id') && (
            <span className="block mt-1 text-amber-600">
              ⚠ No spreadsheet linked. Set one up via the sheets utility to enable auto-sync.
            </span>
          )}
        </div>
      </div>

      {/* Scanned Items Log (7/12) */}
      <div className="lg:col-span-7 bg-slate-900 rounded-xl border border-slate-800 shadow-xs flex flex-col justify-between h-[700px] p-5">
        <div>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <h4 className="font-bold text-slate-100 text-sm font-display flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Assignment Log
            </h4>
            <span className="bg-slate-800 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
              {scannedItems.length} Scanned
            </span>
          </div>

          <div className="overflow-y-auto max-h-[550px] space-y-2 pr-1">
            {scannedItems.length === 0 ? (
              <div className="text-center p-10 text-slate-500 text-xs font-mono">
                No shipments scanned yet in this session.
              </div>
            ) : (
              scannedItems.map((item, index) => (
                <div key={index} className="bg-slate-800/50 border border-slate-700 p-3 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <PackageCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-mono text-sm font-bold text-slate-200">{item.id}</div>
                      <div className="text-[10px] text-slate-400">Assigned to: <span className="text-slate-300 font-semibold">{item.riderName}</span></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">{item.status}</div>
                    <div className="text-[9px] text-slate-500 font-mono mt-0.5">{new Date(item.timestamp).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}