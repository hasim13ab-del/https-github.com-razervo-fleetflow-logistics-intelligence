import React, { useState } from 'react';
import {
  Sliders,
  MapPin,
  QrCode,
  Clock,
  Scale,
  AlertCircle,
  Plus,
  Settings,
  CheckCircle2
} from 'lucide-react';
import { Hub, HubConfig, Location, User } from '../types';

interface HubControlProps {
  hubs: Hub[];
  currentUser: User | null;
  onUpdateHub: (hubId: string, updatedFields: Partial<Hub>) => void;
  onAddHub: (hub: Hub) => void;
  onDeleteHub: (hubId: string) => void;
}

export default function HubControl({
  hubs,
  currentUser,
  onUpdateHub,
  onAddHub,
  onDeleteHub
}: HubControlProps) {
  const [activeHubId, setActiveHubId] = useState<string>(hubs[0]?.hubId || '');
  const activeHub = hubs.find((h) => h.hubId === activeHubId);

  // New Hub State
  const [isAddingHub, setIsAddingHub] = useState<boolean>(false);
  const [newHubId, setNewHubId] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newAddress, setNewAddress] = useState<string>('');
  const [newPincode, setNewPincode] = useState<string>('');
  const [newLat, setNewLat] = useState<number>(26.1158);
  const [newLng, setNewLng] = useState<number>(91.7086);
  const [newRadius, setNewRadius] = useState<number>(500);
  const [newIsVendor, setNewIsVendor] = useState<boolean>(false);
  const [newVendorName, setNewVendorName] = useState<string>('');

  const [errorMsg, setErrorMsg] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const [isEditingHub, setIsEditingHub] = useState<boolean>(false);

  const populateEditForm = () => {
    if (!activeHub) return;
    setNewHubId(activeHub.hubId);
    setNewName(activeHub.name);
    setNewAddress(activeHub.address);
    setNewPincode(activeHub.pincode);
    setNewLat(activeHub.location.latitude);
    setNewLng(activeHub.location.longitude);
    setNewRadius(activeHub.radius);
    setNewIsVendor(activeHub.isVendor);
    setNewVendorName(activeHub.vendorName || '');
    setIsEditingHub(true);
    setIsAddingHub(true);
  };

  const handleDelete = () => {
    if (!activeHub) return;
    if (window.confirm(`Are you sure you want to delete Hub ${activeHub.hubId}? This action cannot be undone.`)) {
      onDeleteHub(activeHub.hubId);
      setActiveHubId(hubs.filter(h => h.hubId !== activeHub.hubId)[0]?.hubId || '');
    }
  };

  // Handle Hub Update
  const handleUpdateConfig = (field: keyof HubConfig | 'radius', value: any) => {
    if (!activeHub) return;

    if (field === 'radius') {
      onUpdateHub(activeHub.hubId, { radius: parseInt(value) || 500 });
    } else {
      const updatedConfig = { ...activeHub.config, [field]: value };
      onUpdateHub(activeHub.hubId, { config: updatedConfig });
    }
  };

  // Handle KPI Weight Update ensuring totals = 1.0
  const handleKPIWeightSlider = (convWeight: number) => {
    if (!activeHub) return;
    const attWeight = parseFloat((1.0 - convWeight).toFixed(2));
    onUpdateHub(activeHub.hubId, {
      config: {
        ...activeHub.config,
        kpiWeights: {
          conversion: convWeight,
          attendance: attWeight
        }
      }
    });
  };

  // Create new Hub
  const handleCreateHub = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccess('');

    if (!newHubId || !newName || !newAddress || !newPincode) {
      setErrorMsg('All facility details (ID, Name, Address, Pincode) are required.');
      return;
    }

    if (newPincode.trim().length !== 6 || isNaN(Number(newPincode))) {
      setErrorMsg('Pincode must be exactly 6 digits.');
      return;
    }

    if (isEditingHub) {
      const updatedHubFields: Partial<Hub> = {
        name: newName,
        address: newAddress,
        pincode: newPincode,
        location: { latitude: newLat, longitude: newLng },
        radius: newRadius,
        isVendor: newIsVendor
      };

      if (newIsVendor && newVendorName.trim()) {
        updatedHubFields.vendorName = newVendorName.trim();
      }

      onUpdateHub(newHubId, updatedHubFields);
      setSuccess(`Logistics center [${newHubId}] updated successfully!`);
    } else {
      if (hubs.some((h) => h.hubId === newHubId)) {
        setErrorMsg('A Logistics hub with this identifier code already exists.');
        return;
      }
      const newHubPayload: Hub = {
        hubId: newHubId.toUpperCase(),
        name: newName,
        address: newAddress,
        pincode: newPincode,
        location: { latitude: newLat, longitude: newLng },
        radius: newRadius,
        isVendor: newIsVendor,
        config: {
          qrAttendance: true,
          gpsTrackingInterval: 30,
          kpiWeights: { conversion: 0.6, attendance: 0.4 }
        }
      };

      if (newIsVendor && newVendorName.trim()) {
        newHubPayload.vendorName = newVendorName.trim();
      }

      onAddHub(newHubPayload);
      setSuccess(`Logistics center [${newHubId.toUpperCase()}] established successfully!`);
    }

    setIsAddingHub(false);
    setIsEditingHub(false);

    // Clear inputs
    setNewHubId('');
    setNewName('');
    setNewAddress('');
    setNewPincode('');
    setNewIsVendor(false);
    setNewVendorName('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="hub_control_panel">

      {/* Left side list: Hub Selector (4/12 wide) */}
      <div className="lg:col-span-4 bg-white rounded-xl border border-slate-100 shadow-xs p-5 flex flex-col justify-between h-[580px]">
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-5 h-5 text-blue-600" />
              <h4 className="font-bold text-slate-800 text-sm font-display">Operational Hubs</h4>
            </div>

            {isSuperAdmin && (
              <button
                onClick={() => {
                  setIsAddingHub(!isAddingHub);
                  setIsEditingHub(false);
                  setNewHubId('');
                  setNewName('');
                  setNewAddress('');
                  setNewPincode('');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs p-1 px-2 rounded-lg flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Hub
              </button>
            )}
          </div>

          {!isAddingHub ? (
            <div className="space-y-2 h-[450px] overflow-y-auto pr-1">
              {hubs.map((h) => {
                const isActive = h.hubId === activeHubId;
                return (
                  <button
                    key={h.hubId}
                    onClick={() => setActiveHubId(h.hubId)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${isActive
                        ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-100 hover:border-slate-300'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs font-display">{h.name}</span>
                      <span className={`text-[9px] font-mono font-bold uppercase rounded px-1.5 py-0.5 ${isActive ? 'bg-blue-800 text-slate-100' : 'bg-slate-200 text-slate-600'
                        }`}>
                        {h.hubId}
                      </span>
                    </div>

                    <div className="flex justify-between items-center mt-1">
                      <span className={`text-[9px] font-mono ${isActive ? 'text-blue-300' : 'text-slate-400'}`}>
                        PIN: {h.pincode}
                      </span>
                      {h.isVendor && (
                        <span className={`text-[8px] font-bold px-1 rounded ${isActive ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'}`}>
                          Vendor: {h.vendorName}
                        </span>
                      )}
                    </div>

                    <p className={`text-[10px] mt-1.5 leading-relaxed truncate ${isActive ? 'text-blue-200' : 'text-slate-400'
                      }`}>
                      {h.address}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <form onSubmit={handleCreateHub} className="space-y-3 p-3 bg-slate-50 border border-slate-100 rounded-xl overflow-y-auto max-h-[460px]">
              <span className="text-[10px] font-mono tracking-widest text-slate-400 block uppercase">
                {isEditingHub ? 'Edit Logistics Hub' : 'Establish New Logistics Hub'}
              </span>

              <div>
                <label className="text-[9px] font-bold block mb-1">Hub Code Id (e.g. DEL05)</label>
                <input
                  type="text"
                  placeholder="BLR02"
                  value={newHubId}
                  disabled={isEditingHub}
                  onChange={(e) => setNewHubId(e.target.value)}
                  className={`w-full text-xs p-1.5 border border-slate-200 rounded ${isEditingHub ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-white'}`}
                />
              </div>

              <div>
                <label className="text-[9px] font-bold block mb-1">Hub Name</label>
                <input
                  type="text"
                  placeholder="Bangalore Central Hub"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full text-xs p-1.5 border border-slate-200 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold block mb-1">Pincode</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 560066"
                    value={newPincode}
                    onChange={(e) => setNewPincode(e.target.value)}
                    className="w-full text-xs p-1.5 border border-slate-200 rounded"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold block mb-1">Geofence Radius (m)</label>
                  <input
                    type="number"
                    value={newRadius}
                    onChange={(e) => setNewRadius(parseInt(e.target.value) || 500)}
                    className="w-full text-xs p-1.5 border border-slate-200 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold block mb-1">Coordinates (Lat, Lng)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.0001"
                    value={newLat}
                    onChange={(e) => setNewLat(parseFloat(e.target.value) || 26.1158)}
                    className="text-xs p-1.5 border border-slate-200 rounded font-mono"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    value={newLng}
                    onChange={(e) => setNewLng(parseFloat(e.target.value) || 91.7086)}
                    className="text-xs p-1.5 border border-slate-200 rounded font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold block mb-1">Physical Address</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full text-xs p-1.5 border border-slate-200 rounded"
                />
              </div>

              {/* Vendor Fields */}
              <div className="p-2.5 bg-white border border-slate-100 rounded flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold block">Vendor Operated?</span>
                  <span className="text-[8px] text-slate-400">Hub managed by third party vendor</span>
                </div>
                <input
                  type="checkbox"
                  checked={newIsVendor}
                  onChange={(e) => setNewIsVendor(e.target.checked)}
                  className="w-3.5 h-3.5 accent-blue-600"
                />
              </div>

              {newIsVendor && (
                <div>
                  <label className="text-[9px] font-bold block mb-1">Vendor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Gati, Blue Dart"
                    value={newVendorName}
                    onChange={(e) => setNewVendorName(e.target.value)}
                    className="w-full text-xs p-1.5 border border-slate-200 rounded"
                  />
                </div>
              )}

              {errorMsg && (
                <div className="text-[10px] text-rose-600 bg-rose-50 p-1 rounded font-mono">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingHub(false);
                    setIsEditingHub(false);
                  }}
                  className="bg-slate-200 hover:bg-slate-300 rounded font-semibold text-[10px] p-1.5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-[10px] p-1.5 cursor-pointer"
                >
                  Save Hub
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Right side panel: Hub Configuration controls (8/12 wide) */}
      <div className="lg:col-span-8 bg-white rounded-xl border border-slate-100 shadow-xs p-5 flex flex-col justify-between h-[580px]">
        {activeHub ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-slate-800 text-sm font-display">Manage Hub parameters</h4>
                <p className="text-[10px] text-slate-400">Settings and triggers for {activeHub.name}</p>
              </div>
              <div className="flex items-center gap-2">
                {isSuperAdmin && (
                  <>
                    <button
                      onClick={populateEditForm}
                      className="text-[10px] text-blue-600 font-bold hover:underline"
                    >
                      Edit Info
                    </button>
                    <button
                      onClick={handleDelete}
                      className="text-[10px] text-rose-600 font-bold hover:underline"
                    >
                      Delete Hub
                    </button>
                  </>
                )}
                <Settings className="w-5 h-5 text-slate-400" />
              </div>
            </div>

            {success && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg border border-emerald-100">
                {success}
              </div>
            )}

            {/* Hub parameters config grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Box 1: Geofence control */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs font-display">Hub Boundary Radius</span>
                  <span className="bg-blue-50 text-blue-600 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                    {activeHub.radius} meters
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Sets the allowed physical boundary perimeter for device sign-ins. If location pings exceed this circle radius, attendance lock fails.
                </p>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="100"
                    max="1500"
                    step="50"
                    value={activeHub.radius}
                    onChange={(e) => handleUpdateConfig('radius', e.target.value)}
                    className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between font-mono text-[9px] text-slate-400">
                    <span>100m (Tight)</span>
                    <span>1500m (Wide range)</span>
                  </div>
                </div>
              </div>

              {/* Box 2: Attendance authentication tier */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3.5">
                <span className="font-bold text-slate-800 text-xs font-display block">Sign-in Verification Tier</span>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Toggles whether riders scan physical QR stickers stationed at loading grids, or rely entirely on autonomous network GPS geofence checks.
                </p>

                <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200/80">
                  <span className="font-mono text-xs font-semibold text-slate-700 flex-1">
                    {activeHub.config.qrAttendance ? 'Mandatory QR Code' : 'Autonomous GPS'}
                  </span>

                  <button
                    onClick={() => handleUpdateConfig('qrAttendance', !activeHub.config.qrAttendance)}
                    className={`rounded-lg py-1 px-3 text-xs font-bold font-mono transition ${activeHub.config.qrAttendance
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                  >
                    [Toggle Method]
                  </button>
                </div>
              </div>

              {/* Box 3: KPI scoring engines and weights slider */}
              <div className="bg-slate-900 text-slate-300 rounded-xl p-4 border border-slate-800 md:col-span-2 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-amber-500" />
                    <span className="font-bold text-slate-200 text-xs font-display">Performance KPI Weights</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">AUTOMATED CALCULATOR SETTING</span>
                </div>

                <p className="text-[11px] leading-relaxed opacity-85">
                  Adjust standard weights ratios. Total sum must equal **1.0 (100%)**. Drag slider right to prioritize package delivery conversion scores, drag left to prioritize shift attendance logs.
                </p>

                <div className="grid grid-cols-3 gap-4 text-center py-2 text-xs font-mono">
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-500 block">CONVERSION INDEX</span>
                    <span className="text-sm font-black text-white mt-1 block">
                      {(activeHub.config.kpiWeights.conversion * 100).toFixed(0)}% Weight
                    </span>
                  </div>

                  <div className="flex items-center justify-center font-bold text-slate-500 text-lg">
                    &amp;
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-500 block">SHIFT ATTENDANCE</span>
                    <span className="text-sm font-black text-white mt-1 block">
                      {(activeHub.config.kpiWeights.attendance * 100).toFixed(0)}% Weight
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <input
                    type="range"
                    min="0.10"
                    max="0.90"
                    step="0.05"
                    value={activeHub.config.kpiWeights.conversion}
                    onChange={(e) => handleKPIWeightSlider(parseFloat(e.target.value))}
                    className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between font-mono text-[9px] text-slate-500">
                    <span>Attendance Priority</span>
                    <span>Equal Weights</span>
                    <span>Conversion Priority</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="text-center p-12 text-slate-400 text-xs">
            No logistics hub selected to manage.
          </div>
        )}

        <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[11px] text-slate-400">
          <span>Target Operations Engine:</span>
          <span>Automatic Leaderboard recalculations enabled.</span>
        </div>

      </div>
    </div>
  );
}
