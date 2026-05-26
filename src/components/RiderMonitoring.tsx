import React, { useState, useEffect, useRef } from 'react';
import { 
  Map, 
  User, 
  MapPin, 
  Battery, 
  Eye, 
  Target, 
  Navigation, 
  AlertOctagon, 
  CheckCircle2, 
  Sliders, 
  RefreshCw,
  DollarSign,
  Wallet,
  CalendarDays
} from 'lucide-react';
import { Hub, User as UserType, NotificationAlert, Location, KPIEntry, EarningsRate } from '../types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { calculateDistance, validateAttendance } from '../utils/distance';

interface RiderMonitoringProps {
  hubs: Hub[];
  users: UserType[];
  alerts: NotificationAlert[];
  kpiEntries: KPIEntry[];
  globalEarningsRate: EarningsRate;
  currentUser: UserType | null;
  selectedRiderId: string | null;
  onUpdateRiderLocation: (riderId: string, location: Location) => void;
  onUpdateRiderBattery: (riderId: string, battery: number) => void;
  onUpdateRiderGPS: (riderId: string, status: 'on' | 'off') => void;
  onUpdateRiderIdle: (riderId: string, isIdle: boolean) => void;
  onClearAlert: (alertId: string) => void;
  onUpdateGlobalEarnings: (rate: EarningsRate) => void;
  onUpdateHub: (hubId: string, updatedFields: Partial<Hub>) => void;
}

export default function RiderMonitoring({
  hubs,
  users,
  alerts,
  kpiEntries,
  globalEarningsRate,
  currentUser,
  selectedRiderId,
  onUpdateRiderLocation,
  onUpdateRiderBattery,
  onUpdateRiderGPS,
  onUpdateRiderIdle,
  onClearAlert,
  onUpdateGlobalEarnings,
  onUpdateHub
}: RiderMonitoringProps) {
  const riders = users.filter((u) => u.role === 'rider' && u.liveData);
  const [activeRiderId, setActiveRiderId] = useState<string>(
    selectedRiderId || (riders.length > 0 ? riders[0].uid : '')
  );

  useEffect(() => {
    if (selectedRiderId) {
      setActiveRiderId(selectedRiderId);
    }
  }, [selectedRiderId]);

  const activeRider = riders.find((r) => r.uid === activeRiderId);
  const activeHub = activeRider ? hubs.find((h) => h.hubId === activeRider.hubId) : null;

  // Let's compute distance and geofence state for the active rider
  let computedDistance = 0;
  let geofenceResult = { allowed: true, message: 'Stable connection established.' };

  if (activeRider && activeRider.liveData && activeHub) {
    computedDistance = calculateDistance(
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

  // Handle manual movement of rider (by scaling lat/long offsets)
  const shiftLocation = (direction: 'north' | 'south' | 'east' | 'west', amount: number) => {
    if (!activeRider || !activeRider.liveData) return;
    const { latitude, longitude } = activeRider.liveData.currentLocation;
    let newLat = latitude;
    let newLng = longitude;

    // ~111,000 meters per degree latitude; amount is in meters
    const latOffset = amount / 111320;
    const lngOffset = amount / (111320 * Math.cos((newLat * Math.PI) / 180));

    if (direction === 'north') newLat += latOffset;
    if (direction === 'south') newLat -= latOffset;
    if (direction === 'east') newLng += lngOffset;
    if (direction === 'west') newLng -= lngOffset;

    onUpdateRiderLocation(activeRider.uid, { latitude: newLat, longitude: newLng });
  };

   // SVG Radar translations (now using Leaflet map)
   const mapContainerRef = React.useRef<HTMLDivElement>(null);
   const mapRef = React.useRef<L.Map | null>(null);
   const riderMarkerRef = React.useRef<L.Marker | null>(null);
   const hubMarkerRef = React.useRef<L.Marker | null>(null);
   const geofenceCircleRef = React.useRef<L.Circle | null>(null);

   // Initialize Leaflet map when active hub changes
   React.useEffect(() => {
     if (!activeHub) return;
     const { latitude, longitude } = activeHub.location;
     const hubLatLng: L.LatLngExpression = [latitude, longitude];
     if (!mapRef.current && mapContainerRef.current) {
       mapRef.current = L.map(mapContainerRef.current, {
         center: hubLatLng,
         zoom: 15,
         zoomControl: false,
         attributionControl: false,
       });
       L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
         maxZoom: 19,
       }).addTo(mapRef.current);
     } else if (mapRef.current) {
       mapRef.current.setView(hubLatLng);
     }
     // Hub marker
     if (!hubMarkerRef.current) {
       hubMarkerRef.current = L.marker(hubLatLng, { title: activeHub.name }).addTo(mapRef.current);
     } else {
       hubMarkerRef.current.setLatLng(hubLatLng);
     }
     // Geofence circle
     if (!geofenceCircleRef.current) {
       geofenceCircleRef.current = L.circle(hubLatLng, {
         radius: activeHub.radius,
         color: '#10b981',
         dashArray: '4,4',
         fillOpacity: 0,
       }).addTo(mapRef.current);
     } else {
       geofenceCircleRef.current.setLatLng(hubLatLng);
       geofenceCircleRef.current.setRadius(activeHub.radius);
     }
   }, [activeHub]);

   // Update rider marker when rider location changes
   React.useEffect(() => {
     if (!activeRider?.liveData || !mapRef.current) return;
     const { latitude, longitude } = activeRider.liveData.currentLocation;
     const riderLatLng: L.LatLngExpression = [latitude, longitude];
     if (!riderMarkerRef.current) {
       riderMarkerRef.current = L.marker(riderLatLng, {
         title: activeRider.fullName,
         icon: L.divIcon({
           className: 'rider-marker',
           html: `<div style="background:${geofenceResult.allowed ? '#10b981' : '#f43f5e'};width:12px;height:12px;border-radius:50%;border:2px solid white;"></div>`,
         }),
       }).addTo(mapRef.current);
     } else {
       riderMarkerRef.current.setLatLng(riderLatLng);
     }
   }, [activeRider?.liveData?.currentLocation, geofenceResult.allowed]);

   // Clean up on unmount
   React.useEffect(() => {
     return () => {
       if (mapRef.current) {
         mapRef.current.remove();
         mapRef.current = null;
         riderMarkerRef.current = null;
         hubMarkerRef.current = null;
         geofenceCircleRef.current = null;
       }
     };
   }, []);

  // Center is at 200, 200. Max radial view distance is 1.5x Hub Radius.
  const svgCenter = 200;
  const maxViewDistance = activeHub ? activeHub.radius * 2 : 1000;
  const pixelsPerMeter = activeHub ? 150 / activeHub.radius : 0.15; // 150px representing the full Hub boundary

  let riderX = svgCenter;
  let riderY = svgCenter;

  if (activeRider && activeRider.liveData && activeHub) {
    // Relative latitude and longitude offsets
    const deltaLat = activeRider.liveData.currentLocation.latitude - activeHub.location.latitude;
    const deltaLng = activeRider.liveData.currentLocation.longitude - activeHub.location.longitude;

    // Translates to meters
    const dy = deltaLat * 111320;
    const dx = deltaLng * (111320 * Math.cos((activeHub.location.latitude * Math.PI) / 180));

    // Translate to SVG coordinate system with bounds protection
    // SVG increases latitude upwards (which is -y) and longitude rightwards (+x)
    riderX = svgCenter + dx * pixelsPerMeter;
    riderY = svgCenter - dy * pixelsPerMeter;

    // Enforce display bounds so pin stays on radar visual plane
    riderX = Math.max(30, Math.min(370, riderX));
    riderY = Math.max(30, Math.min(370, riderY));
  }

  // Earnings Logic
  const [showConfigPanel, setShowConfigPanel] = useState<boolean>(false);
  const [configType, setConfigType] = useState<'global' | 'local'>('global');
  
  // Earnings states
  const [perDeliveryRate, setPerDeliveryRate] = useState<number>(0);
  const [baseDailyRate, setBaseDailyRate] = useState<number>(0);
  
  useEffect(() => {
    if (configType === 'global') {
      setPerDeliveryRate(globalEarningsRate.perDelivery);
      setBaseDailyRate(globalEarningsRate.dailyBase || 0);
    } else if (activeHub) {
      setPerDeliveryRate(activeHub.config.earningsRate?.perDelivery || globalEarningsRate.perDelivery);
      setBaseDailyRate(activeHub.config.earningsRate?.dailyBase || globalEarningsRate.dailyBase || 0);
    }
  }, [configType, globalEarningsRate, activeHub]);

  const handleSaveEarningsConfig = () => {
    if (configType === 'global') {
      onUpdateGlobalEarnings({ perDelivery: perDeliveryRate, dailyBase: baseDailyRate });
    } else if (activeHub) {
      onUpdateHub(activeHub.hubId, {
        config: {
          ...activeHub.config,
          earningsRate: { perDelivery: perDeliveryRate, dailyBase: baseDailyRate }
        }
      });
    }
    setShowConfigPanel(false);
  };

  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Current earnings for active rider
  const riderKpis = kpiEntries.filter(k => k.riderId === activeRiderId);
  const effectiveRate = activeHub?.config.earningsRate || globalEarningsRate;
  
  const todayDate = '2026-05-20'; // Matching our seed dates
  const todayKpi = riderKpis.find(k => k.date === todayDate) || { delivered: 0, cod: 0 };
  const todayEarnings = (effectiveRate.dailyBase || 0) + (todayKpi.delivered * effectiveRate.perDelivery);

  const monthlyDelivered = riderKpis.reduce((acc, k) => acc + k.delivered, 0);
  const totalDaysActive = new Set(riderKpis.map(k => k.date)).size;
  const monthlyEarnings = (totalDaysActive * (effectiveRate.dailyBase || 0)) + (monthlyDelivered * effectiveRate.perDelivery);

  // Filter alerts for the active rider
  const riderAlerts = alerts.filter(
    (alert) => alert.userId === activeRiderId && !alert.resolved
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6" id="rider_monitoring_view">
      {/* Col 1: Riders selector list (3/12 wide) */}
      <div className="xl:col-span-3 bg-white rounded-xl border border-slate-100 shadow-xs flex flex-col h-[650px]">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm font-display">Active Fleet</h3>
          <p className="text-[10px] text-slate-400">Select any rider to sync diagnostic radar metrics.</p>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {riders.map((r) => {
            const isSelected = r.uid === activeRiderId;
            const live = r.liveData!;
            const rAlerts = alerts.filter(a => a.userId === r.uid && !a.resolved);
            const rDist = activeHub ? calculateDistance(live.currentLocation, activeHub.location) : 0;
            const isBreaching = activeHub ? rDist > activeHub.radius : false;

            return (
              <button
                key={r.uid}
                onClick={() => setActiveRiderId(r.uid)}
                className={`w-full text-left p-3.5 transition flex items-center justify-between ${
                  isSelected ? 'bg-blue-50/50 border-l-4 border-blue-600' : 'hover:bg-slate-50/35'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800 text-xs">{r.fullName}</span>
                    {rAlerts.length > 0 && (
                      <span className="bg-rose-500 text-white font-mono text-[8px] px-1 rounded-full animate-bounce">
                        {rAlerts.length}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{r.employeeId}</div>
                  <span className="text-[9px] font-mono text-slate-500 bg-slate-100 px-1 py-0.5 rounded mr-1">
                    Hub: {r.hubId}
                  </span>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-mono font-bold text-slate-600 flex items-center gap-0.5 justify-end">
                    <Battery className="w-3 h-3 text-slate-400" />
                    {live.battery}%
                  </div>
                  <span className={`text-[9px] font-mono block mt-1 font-bold ${
                    isBreaching ? 'text-rose-500' : 'text-emerald-600'
                  }`}>
                    {isBreaching ? 'OUTSIDE GEOFENCE' : 'INSIDE GEOFENCE'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Col 2: GPS Dynamic Radar SVG (5/12 wide) */}
      <div className="xl:col-span-5 bg-white rounded-xl border border-slate-100 shadow-xs p-5 flex flex-col justify-between h-[650px]">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Live Hub Radar
            </span>
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <Eye className="w-3.5 h-3.5 text-blue-500" />
              <span>Realtime Coordinate Matrix</span>
            </div>

          </div>
          <p className="text-[10px] text-slate-400">
            Center: <span className="font-semibold text-slate-700">{activeHub?.name || 'Primary Hub'}</span>
          </p>
        </div>

        <div ref={mapContainerRef} className="flex-1 w-full rounded-xl overflow-hidden border border-slate-200 shadow-inner" />

        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500 mt-2">
          <span>Scale Check: Circle diameter is {activeHub ? activeHub.radius : 500}m</span>
          <span className="text-blue-600 font-bold font-sans">Leaflet Maps v1.0</span>
        </div>
      </div>

      <div className="xl:col-span-4 flex flex-col gap-6 h-[650px] justify-between relative">
        
        <div className="bg-white rounded-xl border border-slate-100 shadow-xs p-5 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800 text-sm font-display">Target Diagnostic Telemetry</h4>
              <span className="bg-slate-100 text-slate-500 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded">
                SIM PANEL
              </span>
            </div>

            {activeRider ? (
              <div className="space-y-4">
                
                {/* Geofence status ticker block */}
                <div className={`p-4 rounded-lg flex items-start gap-3 border ${
                  geofenceResult.allowed 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {geofenceResult.allowed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs">
                    <p className="font-bold">
                      {geofenceResult.allowed ? 'Geofence Validated' : 'GEOFENCE BREACH DETECTED'}
                    </p>
                    <p className="text-[11px] mt-1 opacity-90">{geofenceResult.message}</p>
                  </div>
                </div>

                {/* Interactive sliders for GPS Simulation */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3.5">
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                    <Sliders className="w-4 h-4 text-slate-500" />
                    <span>Live GPS Position Offset (m)</span>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                      <span>Shift North / South</span>
                      <span className="font-bold font-mono text-slate-700">Y-axis Control</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => shiftLocation('north', 70)}
                        className="bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 rounded py-1 px-2 text-[10px] shadow-2xs font-mono transition"
                      >
                        [ +70m North ]
                      </button>
                      <button 
                        onClick={() => shiftLocation('south', 70)}
                        className="bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 rounded py-1 px-2 text-[10px] shadow-2xs font-mono transition"
                      >
                        [ -70m South ]
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                      <span>Shift East / West</span>
                      <span className="font-bold font-mono text-slate-700">X-axis Control</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => shiftLocation('west', 70)}
                        className="bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 rounded py-1 px-2 text-[10px] shadow-2xs font-mono transition"
                      >
                        [ -70m West ]
                      </button>
                      <button 
                        onClick={() => shiftLocation('east', 70)}
                        className="bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 rounded py-1 px-2 text-[10px] shadow-2xs font-mono transition"
                      >
                        [ +70m East ]
                      </button>
                    </div>
                  </div>

                  <div className="text-center pt-1.5 border-t border-slate-200">
                    <button
                      onClick={() => {
                        if (activeHub) {
                          onUpdateRiderLocation(activeRider.uid, activeHub.location);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 text-[10px] text-blue-600 font-bold hover:underline"
                    >
                      <RefreshCw className="w-3 h-3" /> Reset Pin directly to Hub
                    </button>
                  </div>
                </div>

                {/* Live parameters config diagnostics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-100 text-xs">
                    <span className="text-[10px] text-slate-400 font-mono block">GPS STATUS TIERS</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-semibold">{activeRider?.liveData?.gpsStatus === 'on' ? 'ACTIVE' : 'DORMANT'}</span>
                      <button
                        onClick={() => onUpdateRiderGPS(activeRider.uid, activeRider.liveData?.gpsStatus === 'on' ? 'off' : 'on')}
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                          activeRider?.liveData?.gpsStatus === 'on' ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        }`}
                      >
                        {activeRider?.liveData?.gpsStatus === 'on' ? 'Turn Off' : 'Turn On'}
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded border border-slate-100 text-xs">
                    <span className="text-[10px] text-slate-400 font-mono block">BATTERY POWER CONTROL</span>
                    <div className="flex items-center gap-2 mt-1.5">
                      <input 
                        type="range" 
                        min="5" 
                        max="100" 
                        value={activeRider?.liveData?.battery || 100}
                        onChange={(e) => onUpdateRiderBattery(activeRider.uid, parseInt(e.target.value))}
                        className="w-full accent-blue-600 h-1 bg-slate-200 rounded-lg cursor-pointer"
                      />
                      <span className="font-mono font-bold text-[10px]">{activeRider?.liveData?.battery}%</span>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center p-6 text-slate-400 text-xs">
                No active rider selected.
              </div>
            )}
          </div>

            <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between text-[11px] text-slate-500">
              <span>Supervisor In-Charge:</span>
              <span className="font-bold text-slate-700">
                {users.find(u => u.uid === activeRider?.supervisorId)?.fullName || 'Rupam Kalita'}
              </span>
            </div>
          </div>

          {/* Earnings Configuration Panel */}
          {showConfigPanel && (
            <div className="absolute inset-0 bg-white z-10 p-5 flex flex-col justify-between rounded-xl">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <h4 className="font-bold text-slate-800 text-sm font-display flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    Earnings Configuration
                  </h4>
                  <button onClick={() => setShowConfigPanel(false)} className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-500 font-bold hover:bg-slate-200">Close</button>
                </div>
                
                <div className="flex items-center gap-2 mb-4 bg-slate-50 p-1 rounded-lg">
                  <button 
                    onClick={() => setConfigType('global')} 
                    disabled={!isSuperAdmin}
                    className={`flex-1 text-[10px] font-bold py-1.5 rounded ${configType === 'global' ? 'bg-white shadow text-blue-600' : 'text-slate-500'} ${!isSuperAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Global Base Rate
                  </button>
                  <button 
                    onClick={() => setConfigType('local')} 
                    className={`flex-1 text-[10px] font-bold py-1.5 rounded ${configType === 'local' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                  >
                    Local Hub Override
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">Per Delivery Incentive (₹)</label>
                    <input 
                      type="number" 
                      value={perDeliveryRate} 
                      onChange={(e) => setPerDeliveryRate(parseInt(e.target.value) || 0)}
                      className="w-full border border-slate-200 rounded p-2 text-xs" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">Base Daily Allowance (₹)</label>
                    <input 
                      type="number" 
                      value={baseDailyRate} 
                      onChange={(e) => setBaseDailyRate(parseInt(e.target.value) || 0)}
                      className="w-full border border-slate-200 rounded p-2 text-xs" 
                    />
                  </div>
                </div>

                <div className="bg-blue-50 text-[10px] text-blue-700 p-2 rounded mt-4">
                  {configType === 'global' ? 
                    'Global rate applies to all hubs without a specific local override.' : 
                    `Local override applies specifically to riders in ${activeHub?.name}.`}
                </div>
              </div>
              
              <button 
                onClick={handleSaveEarningsConfig}
                className="w-full bg-emerald-600 text-white font-bold text-xs py-2 rounded-lg mt-4"
              >
                Save Configuration
              </button>
            </div>
          )}

        {/* Bottom Left block: Rider Performance & Earnings */}
        <div className="bg-emerald-950 text-slate-100 rounded-xl p-4 h-[210px] flex flex-col justify-between border border-emerald-900 relative">
          <div className="flex items-center justify-between border-b border-emerald-900 pb-2 mb-2">
            <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-emerald-400 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" /> Earnings & KPIs
            </span>
            <button 
              onClick={() => setShowConfigPanel(true)}
              className="bg-emerald-900 hover:bg-emerald-800 text-emerald-300 font-mono text-[9px] px-1.5 py-0.5 rounded cursor-pointer transition"
            >
              Config Rates
            </button>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-3 mt-1">
            <div className="bg-emerald-900/40 border border-emerald-800/50 rounded-lg p-2 flex flex-col justify-between">
              <div className="text-[10px] text-emerald-300/80 font-mono flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> Today's Est.
              </div>
              <div>
                <div className="text-xl font-display font-bold text-emerald-300">₹{todayEarnings.toLocaleString()}</div>
                <div className="text-[9px] text-emerald-400/60 font-mono mt-0.5">
                  Base: ₹{effectiveRate.dailyBase} + (₹{effectiveRate.perDelivery} × {todayKpi.delivered})
                </div>
              </div>
            </div>

            <div className="bg-emerald-900/40 border border-emerald-800/50 rounded-lg p-2 flex flex-col justify-between">
              <div className="text-[10px] text-emerald-300/80 font-mono flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> Month to Date
              </div>
              <div>
                <div className="text-xl font-display font-bold text-emerald-300">₹{monthlyEarnings.toLocaleString()}</div>
                <div className="text-[9px] text-emerald-400/60 font-mono mt-0.5">
                  {monthlyDelivered} items delivered
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-3 flex items-center justify-between text-[9px] text-emerald-500 font-mono border-t border-emerald-900 pt-2">
            <span>Rate Plan: {activeHub?.config.earningsRate ? 'LOCAL HUB OVERRIDE' : 'GLOBAL BASE TIER'}</span>
            <span>COD Cash Collected: ₹{todayKpi.cod}</span>
          </div>
        </div>

        {/* Bottom block: Active alerts of this specific rider */}
        <div className="bg-slate-900 text-slate-100 rounded-xl p-4 h-[210px] flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-rose-500">
              Rider Alerts Stream
            </span>
            <span className="bg-slate-800 text-slate-400 font-mono text-[9px] px-1.5 py-0.5 rounded">
              {riderAlerts.length} Active
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-[11px]">
            {riderAlerts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
                <CheckCircle2 className="w-6 h-6 text-slate-700 mb-1" />
                <p>Telemetry channels optimal.</p>
              </div>
            ) : (
              riderAlerts.map((alert) => (
                <div key={alert.id} className="p-2 rounded bg-rose-950/50 border border-rose-900/60 text-slate-200">
                  <p className="font-semibold text-slate-100">{alert.message}</p>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5 pt-1.5 border-t border-slate-800/40">
                    <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                    <button
                      onClick={() => onClearAlert(alert.id)}
                      className="text-emerald-400 hover:underline font-black"
                    >
                      [Acknowledge]
                    </button>
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
