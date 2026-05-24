import React, { useState, useEffect, useCallback } from 'react';
import {
  Hub,
  User,
  Attendance,
  KPIEntry,
  NotificationAlert,
  Shipment,
  Location,
  UserStatus,
  Role,
  AttendanceStatus,
  OrganizationConfig
} from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import RiderMonitoring from './components/RiderMonitoring';
import AttendanceManager from './components/AttendanceManager';
import KPINode from './components/KPINode';
import EmployeeManager from './components/EmployeeManager';
import HubControl from './components/HubControl';
import RiderSimulatorAPK from './components/RiderSimulatorAPK';
import AuthScreen from './components/AuthScreen';
import ProfileView from './components/ProfileView';
import OFDTracker from './components/OFDTracker';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut, sendEmailVerification, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, writeBatch, deleteDoc } from 'firebase/firestore';
import { calculateDistance } from './utils/distance';
import { ShieldAlert, CheckCircle2, CloudLightning, Loader2, Mail, Clock, LogOut } from 'lucide-react';

const deriveOrgCode = (name?: string) => {
  const clean = (name || '').trim();
  if (!clean) return 'ORG';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0] + (words[1][1] || words[0][1] || 'X')).toUpperCase();
  }
  if (clean.length <= 3) return clean.toUpperCase();
  return (clean.slice(0, 2) + clean.slice(-1)).toUpperCase();
};

export default function App() {
  // ==========================================
  // FIRESTORE SUBSCRIPTION-BASED STATE
  // ==========================================
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [kpiEntries, setKpiEntries] = useState<KPIEntry[]>([]);
  const [alerts, setAlerts] = useState<NotificationAlert[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [orgConfig, setOrgConfig] = useState<OrganizationConfig | null>(null);
  const [firestoreReady, setFirestoreReady] = useState<boolean>(false);

  // Layout & UI Routing
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'erp' | 'mobile'>('split');

  // Global org settings (from Firestore system/config)
  const [orgName, setOrgName] = useState<string>('FleetFlow');
  const [orgLogo, setOrgLogo] = useState<string>('');
  const [globalEarningsRate, setGlobalEarningsRate] = useState<{ perDelivery: number; dailyBase?: number }>({
    perDelivery: 15, dailyBase: 300
  });

  // Real Authenticated Operator state
  const [currentUser, setCurrentUser] = useState<{
    uid: string;
    fullName: string;
    role: Role;
    email: string;
    hubId: string;
    employeeId: string;
    status: UserStatus;
    emailVerified: boolean;
  } | null>(null);

  const [authChecked, setAuthChecked] = useState(false);

  // ==========================================
  // FIRESTORE REAL-TIME LISTENERS
  // ==========================================
  useEffect(() => {
    if (!currentUser) {
      setFirestoreReady(false);
      return;
    }

    const unsubscribers: (() => void)[] = [];

    const unsubHubs = onSnapshot(collection(db, 'hubs'), (snapshot) => {
      const list: Hub[] = [];
      snapshot.forEach(doc => list.push({ ...doc.data(), hubId: doc.id } as Hub));
      setHubs(list);
    });
    unsubscribers.push(unsubHubs);

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: User[] = [];
      snapshot.forEach(doc => list.push({ ...doc.data(), uid: doc.id } as User));
      setUsers(list);
    });
    unsubscribers.push(unsubUsers);

    const unsubAtt = onSnapshot(collection(db, 'attendance'), (snapshot) => {
      const list: Attendance[] = [];
      snapshot.forEach(doc => list.push({ ...doc.data(), id: doc.id } as Attendance));
      setAttendance(list);
    });
    unsubscribers.push(unsubAtt);

    const unsubKpi = onSnapshot(collection(db, 'kpi'), (snapshot) => {
      const list: KPIEntry[] = [];
      snapshot.forEach(doc => list.push({ ...doc.data(), id: doc.id } as KPIEntry));
      setKpiEntries(list);
    });
    unsubscribers.push(unsubKpi);

    const unsubAlerts = onSnapshot(collection(db, 'alerts'), (snapshot) => {
      const list: NotificationAlert[] = [];
      snapshot.forEach(doc => list.push({ ...doc.data(), id: doc.id } as NotificationAlert));
      setAlerts(list);
    });
    unsubscribers.push(unsubAlerts);

    const unsubShip = onSnapshot(collection(db, 'shipments'), (snapshot) => {
      const list: Shipment[] = [];
      snapshot.forEach(doc => list.push({ ...doc.data(), id: doc.id } as Shipment));
      setShipments(list);
    });
    unsubscribers.push(unsubShip);

    const unsubConfig = onSnapshot(doc(db, 'system', 'config'), (snapshot) => {
      if (snapshot.exists()) {
        const config = snapshot.data() as OrganizationConfig;
        setOrgConfig(config);
        setOrgName(config.orgName || 'FleetFlow');
        setOrgLogo(config.orgLogo || '');
      }
    });
    unsubscribers.push(unsubConfig);

    setFirestoreReady(true);

    return () => unsubscribers.forEach(fn => fn());
  }, [currentUser]);

  // ==========================================
  // AUTH STATE LISTENER
  // ==========================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const orgCode = deriveOrgCode(data.organizationName || orgName);
            const fallbackHubId = `${orgCode}H01`;
            // CRITICAL NAME RULE: Use ONLY Firestore fullName, never Gmail displayName
            if (!data.fullName) {
              await signOut(auth);
              setCurrentUser(null);
              setAuthChecked(true);
              return;
            }

            setCurrentUser({
              uid: firebaseUser.uid,
              fullName: data.fullName,
              role: (data.role || 'supervisor') as Role,
              email: firebaseUser.email || '',
              hubId: data.hubId || fallbackHubId,
              employeeId: data.employeeId || `${orgCode}-${data.hubId || fallbackHubId}-SUP-${Math.floor(1000 + Math.random() * 9000)}`,
              status: data.status || 'pending',
              emailVerified: firebaseUser.emailVerified
            });
          } else {
            // Strict profile requirement: no auto-fallback profile creation
            await signOut(auth);
            setCurrentUser(null);
            setAuthChecked(true);
            return;
          }
        } catch (err) {
          console.error("Error reading Firestore profile:", err);
          await signOut(auth);
          setCurrentUser(null);
          setAuthChecked(true);
          return;
        }
      } else {
        setCurrentUser(null);
      }
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, []);

  // Route riders to profile view
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'rider') {
        setActiveTab('profile');
        setViewMode('mobile');
      } else if (activeTab === 'profile') {
        setActiveTab('dashboard');
      }
    }
  }, [currentUser]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
    } catch (err) {
      console.error("Sign Out error:", err);
    }
  };

  const handleAuthSuccess = (uid: string, profile: { fullName: string; role: Role; email: string; hubId: string; employeeId: string; status: UserStatus; emailVerified: boolean }) => {
    setCurrentUser({
      uid,
      fullName: profile.fullName,
      role: profile.role,
      email: profile.email,
      hubId: profile.hubId,
      employeeId: profile.employeeId,
      status: profile.status,
      emailVerified: profile.emailVerified
    });
  };

  const handleNavigateToTab = (tab: string, riderId?: string) => {
    setActiveTab(tab);
    if (riderId) setSelectedRiderId(riderId);
  };

  // ==========================================
  // HELPER: Get today's date string
  // ==========================================
  const getTodayDate = (): string => {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD in local timezone
  };

  // ==========================================
  // HELPER: Check if rider is Absent today
  // ==========================================
  const isRiderAbsentToday = useCallback((riderId: string): boolean => {
    const today = getTodayDate();
    const attRecord = attendance.find(a => a.userId === riderId && a.date === today);
    return attRecord?.manualStatus === 'absent';
  }, [attendance]);

  // ==========================================
  // ALERTS ENGINE
  // ==========================================
  const triggerSimAlert = async (
    riderId: string,
    triggerType: 'gps_off' | 'low_battery' | 'low_conversion' | 'idle_time',
    severity: 'critical' | 'warning' | 'info',
    message: string
  ) => {
    const riderObj = users.find(u => u.uid === riderId);
    // Check for duplicate unresolved
    const exists = alerts.some(a => a.userId === riderId && a.triggerType === triggerType && !a.resolved);
    if (exists) return;

    const newAlert: NotificationAlert = {
      id: 'alert_' + Date.now(),
      userId: riderId,
      riderName: riderObj?.fullName || 'Unknown Rider',
      employeeId: riderObj?.employeeId || 'EK-RIDER-TEMP',
      triggerType,
      severity,
      message,
      timestamp: new Date().toISOString(),
      resolved: false
    };

    try {
      await setDoc(doc(db, 'alerts', newAlert.id), newAlert);
    } catch (err) {
      console.warn('Failed to write alert to Firestore:', err);
    }
  };

  // ==========================================
  // RIDER SIMULATION HANDLERS
  // ==========================================
  const handleUpdateRiderLocation = (riderId: string, location: Location) => {
    const rider = users.find(u => u.uid === riderId);
    if (!rider || !rider.liveData) return;

    const updatedLiveData = {
      ...rider.liveData,
      currentLocation: location,
      lastActive: new Date().toISOString()
    };

    setDoc(doc(db, 'users', riderId), { liveData: updatedLiveData }, { merge: true }).catch(console.warn);

    // Geofence breach check
    const rHub = hubs.find(h => h.hubId === rider.hubId);
    if (rHub) {
      const distance = calculateDistance(location, rHub.location);
      const todayLog = attendance.find(a => a.userId === riderId && a.date === getTodayDate());
      if (distance > rHub.radius && todayLog && todayLog.startDuty && !todayLog.endDuty) {
        triggerSimAlert(riderId, 'idle_time', 'warning',
          `Geofence Breach: Rider is ${Math.round(distance - rHub.radius)}m past authorized boundary!`);
      }
    }
  };

  const handleUpdateRiderBattery = async (riderId: string, battery: number) => {
    const rider = users.find(u => u.uid === riderId);
    if (!rider || !rider.liveData) return;

    const updatedLiveData = { ...rider.liveData, battery, lastActive: new Date().toISOString() };
    await setDoc(doc(db, 'users', riderId), { liveData: updatedLiveData }, { merge: true }).catch(console.warn);

    if (battery < 15) {
      triggerSimAlert(riderId, 'low_battery', 'critical', `Critical Battery Alert: Battery level at ${battery}%!`);
    }
  };

  const handleUpdateRiderGPS = async (riderId: string, status: 'on' | 'off') => {
    const rider = users.find(u => u.uid === riderId);
    if (!rider || !rider.liveData) return;

    const updatedLiveData = { ...rider.liveData, gpsStatus: status, lastActive: new Date().toISOString() };
    await setDoc(doc(db, 'users', riderId), { liveData: updatedLiveData }, { merge: true }).catch(console.warn);

    if (status === 'off') {
      triggerSimAlert(riderId, 'gps_off', 'critical', `Hardware Connection Failure: GPS Tracker reported OFF!`);
    }
  };

  const handleUpdateRiderIdle = async (riderId: string, isIdle: boolean) => {
    const rider = users.find(u => u.uid === riderId);
    if (!rider || !rider.liveData) return;

    const updatedLiveData = { ...rider.liveData, isIdle, lastActive: new Date().toISOString() };
    await setDoc(doc(db, 'users', riderId), { liveData: updatedLiveData }, { merge: true }).catch(console.warn);

    if (isIdle) {
      triggerSimAlert(riderId, 'idle_time', 'warning', `Inactive Warning: Idle report raised for 40+ minutes!`);
    }
  };

  // ==========================================
  // OFD TRACKER - Scanner Handler
  // ==========================================
  const handleOFDScan = async (
    shipmentId: string,
    riderId: string,
    trackingId?: string
  ): Promise<{ success: boolean; message: string }> => {
    // Absentee Block: Rider marked Absent today cannot receive shipments
    if (isRiderAbsentToday(riderId)) {
      return {
        success: false,
        message: 'Operation Denied: Rider marked Absent today.'
      };
    }

    const rider = users.find(u => u.uid === riderId);
    if (!rider) {
      return { success: false, message: 'Rider not found.' };
    }

    try {
      const today = getTodayDate();
      const now = new Date().toISOString();

      // 1. Create shipment record in Firestore
      const shipmentDocId = `ship_${Date.now()}`;
      const newShipment: Shipment = {
        id: shipmentDocId,
        status: 'Assigned',
        timestamp: now,
        riderId,
        riderName: rider.fullName,
        hubId: rider.hubId,
        assignedBy: currentUser?.uid || '',
        assignedAt: now
      };
      await setDoc(doc(db, 'shipments', shipmentDocId), newShipment);

      // 2. Update KPI: increment OFD count for this rider today
      const kpiId = `${riderId}_${today}`;
      const existingKpi = kpiEntries.find(k => k.id === kpiId);
      const currentOfd = existingKpi?.ofd || 0;
      await setDoc(doc(db, 'kpi', kpiId), {
        id: kpiId,
        riderId,
        date: today,
        hubId: rider.hubId,
        ofd: currentOfd + 1,
        delivered: existingKpi?.delivered || 0,
        failed: existingKpi?.failed || 0,
        pickup: existingKpi?.pickup || 0,
        cod: existingKpi?.cod || 0,
        conversionRate: existingKpi?.delivered ? ((existingKpi.delivered / (currentOfd + 1)) * 100) : 0,
        supervisorId: rider.supervisorId || currentUser?.uid || '',
        trackingId: trackingId || ''
      }, { merge: true });

      return { success: true, message: `Shipment ${shipmentId} assigned to ${rider.fullName}` };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to assign shipment.' };
    }
  };

  // ==========================================
  // KPI MANUAL ENTRY HANDLER (with Tracking ID fallback)
  // ==========================================
  const handleAddKPIEntry = async (newEntry: Omit<KPIEntry, 'id' | 'conversionRate'>) => {
    const calculatedRate = newEntry.ofd > 0 ? (newEntry.delivered / newEntry.ofd) * 100 : 0;
    const entryId = `${newEntry.riderId}_${newEntry.date}`;

    // FALLBACK RULE: If trackingId is blank, write "manual entry"
    const finalTrackingId = newEntry.trackingId || 'manual entry';

    if (calculatedRate < 60) {
      triggerSimAlert(newEntry.riderId, 'low_conversion', 'warning',
        `Stagnant Conversions: Daily delivery rate dropped to ${calculatedRate.toFixed(1)}%!`);
    }

    try {
      await setDoc(doc(db, 'kpi', entryId), {
        ...newEntry,
        id: entryId,
        conversionRate: calculatedRate,
        trackingId: finalTrackingId
      });
    } catch (err) {
      console.error('Failed to write KPI entry:', err);
    }
  };

  // ==========================================
  // ATTENDANCE HANDLER (Manual Present/Absent)
  // ==========================================
  const handleSetAttendance = async (userId: string, date: string, manualStatus: AttendanceStatus) => {
    const attId = `${userId}_${date}`;
    const userObj = users.find(u => u.uid === userId);
    try {
      await setDoc(doc(db, 'attendance', attId), {
        id: attId,
        userId,
        hubId: userObj?.hubId || 'GHY01',
        date,
        manualStatus
      }, { merge: true });
    } catch (err) {
      console.error('Failed to set attendance:', err);
    }
  };

  // ==========================================
  // HUB MANAGEMENT
  // ==========================================
  const handleUpdateHub = async (hubId: string, updatedFields: Partial<Hub>) => {
    try {
      await setDoc(doc(db, 'hubs', hubId), updatedFields, { merge: true });
    } catch (err) {
      console.error('Failed to update hub:', err);
    }
  };

  const handleAddHub = async (newHub: Hub) => {
    try {
      await setDoc(doc(db, 'hubs', newHub.hubId), newHub);
    } catch (err) {
      console.error('Failed to add hub:', err);
    }
  };

  const handleDeleteHub = async (hubId: string) => {
    try {
      await deleteDoc(doc(db, 'hubs', hubId));
    } catch (err) {
      console.error('Failed to delete hub:', err);
    }
  };

  // ==========================================
  // EMPLOYEE MANAGEMENT
  // ==========================================
  const handleAddEmployee = async (newEmployee: Omit<User, 'uid'>) => {
    const newUid = 'emp_' + Date.now();
    try {
      await setDoc(doc(db, 'users', newUid), { ...newEmployee, uid: newUid });
    } catch (err) {
      console.error('Failed to add employee:', err);
    }
  };

  const handleFirebaseOnboarding = async (params: {
    fullName: string;
    email: string;
    role: Role;
    hubId: string;
    phoneNumber: string;
    employeeId: string;
  }): Promise<{ success: boolean; message: string; password?: string }> => {
    const { fullName, email, role, hubId, phoneNumber, employeeId } = params;
    const generatedPassword = 'Ek@' + Math.random().toString(36).slice(2, 10) + '#' + Math.floor(1000 + Math.random() * 9000);

    try {
      if (!auth.currentUser?.email) {
        return { success: false, message: 'Admin session not found.' };
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, generatedPassword);
      const newUid = userCredential.user.uid;
      await sendEmailVerification(userCredential.user);

      const newUserProfile: User = {
        uid: newUid,
        fullName,
        organizationName: orgName,
        email,
        role,
        employeeId,
        hubId,
        status: 'active',
        phoneNumber,
        liveData: role === 'rider' ? {
          battery: 100,
          isIdle: false,
          gpsStatus: 'on' as const,
          lastActive: new Date().toISOString(),
          currentLocation: hubs.find(h => h.hubId === hubId)?.location || { latitude: 26.1158, longitude: 91.7086 }
        } : undefined
      };

      await setDoc(doc(db, 'users', newUid), newUserProfile);

      return {
        success: true,
        message: `User ${fullName} onboarded! Verification sent to ${email}. Password: ${generatedPassword}`,
        password: generatedPassword
      };
    } catch (err: any) {
      console.error('Firebase Onboarding Error:', err);
      return { success: false, message: err.message || 'Onboarding failed.' };
    }
  };

  const handleReAuthSuperAdmin = async (password: string): Promise<boolean> => {
    try {
      const email = auth.currentUser?.email;
      if (!email) return false;
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (err) {
      console.error('Re-auth error:', err);
      return false;
    }
  };

  const handleUpdateStatus = async (uid: string, status: UserStatus) => {
    try {
      await setDoc(doc(db, 'users', uid), { status }, { merge: true });
    } catch (err) {
      console.warn("Firestore sync status warning:", err);
    }
  };

  // ==========================================
  // ALERT RESOLUTION
  // ==========================================
  const handleClearAlert = async (alertId: string) => {
    try {
      await setDoc(doc(db, 'alerts', alertId), {
        resolved: true,
        actionTaken: 'Resolved by ' + (currentUser?.fullName || 'Operator')
      }, { merge: true });
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  const handleUpdateGlobalEarnings = (rate: { perDelivery: number; dailyBase?: number }) => {
    setGlobalEarningsRate(rate);
    // Save to Firestore if needed
  };

  // ==========================================
  // RIDER MOBILE SHIFTS
  // ==========================================
  const handleCheckInMobile = async (userId: string, location: Location) => {
    const today = getTodayDate();
    const logId = `${userId}_${today}`;
    const userObj = users.find(u => u.uid === userId);

    try {
      await setDoc(doc(db, 'attendance', logId), {
        id: logId,
        userId,
        hubId: userObj?.hubId || 'GHY01',
        date: today,
        checkIn: new Date().toISOString(),
        geofencePassed: true,
        locationAtCheckIn: location
      }, { merge: true });
    } catch (err) {
      console.error('Check-in failed:', err);
    }
  };

  const handleStartDutyMobile = async (userId: string) => {
    const today = getTodayDate();
    const logId = `${userId}_${today}`;
    try {
      await setDoc(doc(db, 'attendance', logId), { startDuty: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.error('Start duty failed:', err);
    }
  };

  const handleToggleBreakMobile = (userId: string) => {
    const riderObj = users.find(u => u.uid === userId);
    if (!riderObj?.liveData) return;
    handleUpdateRiderIdle(userId, !riderObj.liveData.isIdle);
  };

  const handleCheckOutMobile = async (userId: string) => {
    const today = getTodayDate();
    const logId = `${userId}_${today}`;
    try {
      await setDoc(doc(db, 'attendance', logId), {
        endDuty: new Date().toISOString(),
        checkOut: new Date().toISOString(),
        totalHours: 9.0
      }, { merge: true });
    } catch (err) {
      console.error('Checkout failed:', err);
    }
  };

  // ==========================================
  // LOADING GUARD
  // ==========================================
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center font-sans text-slate-200">
        <div className="p-8 bg-slate-800 border border-slate-700 rounded-2xl flex flex-col items-center gap-4 shadow-2xl max-w-sm text-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <div>
            <h3 className="font-bold text-base text-white">Loading FleetFlow ERP</h3>
            <p className="text-xs text-slate-400 mt-1">Establishing encrypted interface tunnel & profiles...</p>
          </div>
        </div>
      </div>
    );
  }

  const handleReloadStatus = async () => {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      try {
        await firebaseUser.reload();
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const orgCode = deriveOrgCode(data.organizationName || orgName);
          const fallbackHubId = `${orgCode}H01`;
          setCurrentUser({
            uid: firebaseUser.uid,
            fullName: data.fullName,
            role: (data.role || 'supervisor') as Role,
            email: firebaseUser.email || '',
            hubId: data.hubId || fallbackHubId,
            employeeId: data.employeeId || `${orgCode}-${data.hubId || fallbackHubId}-SUP-${Math.floor(1000 + Math.random() * 9000)}`,
            status: data.status || 'pending',
            emailVerified: firebaseUser.emailVerified
          });
        }
      } catch (err) {
        console.error("Error reloading user status:", err);
      }
    }
  };

  // ==========================================
  // AUTH GATES
  // ==========================================
  if (!currentUser) {
    return (
      <AuthScreen
        onAuthSuccess={handleAuthSuccess}
        orgName={orgName}
        setOrgName={setOrgName}
        orgLogo={orgLogo}
        setOrgLogo={setOrgLogo}
        users={users}
        setUsers={(val: any) => {
          if (typeof val === 'function') {
            const newUsers = val(users);
            setUsers(newUsers);
          }
        }}
        hubs={hubs}
        setHubs={(val: any) => {
          if (typeof val === 'function') {
            const newHubs = val(hubs);
            setHubs(newHubs);
          }
        }}
      />
    );
  }

  // Email verification gate
  if (currentUser && !currentUser.emailVerified) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased text-slate-200 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/30 mb-4 animate-pulse">
            <Mail className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white font-display">Verify Your Email</h2>
          <p className="mt-2 text-sm text-slate-400">
            A verification link was sent to <span className="text-blue-400 font-mono">{currentUser.email}</span>.
          </p>
        </div>
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
          <div className="bg-slate-800/90 backdrop-blur-md py-8 px-4 shadow-2xl rounded-2xl border border-slate-700 sm:px-10 space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed text-center">
              Please click the link in your verification email to activate your login session.
            </p>
            <button onClick={async () => {
              try { if (auth.currentUser) { await sendEmailVerification(auth.currentUser); alert("Verification email resent!"); } }
              catch (err: any) { alert(err.message || "Failed to resend."); }
            }} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs uppercase transition cursor-pointer">
              Resend Verification Email
            </button>
            <button onClick={handleReloadStatus} className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg text-xs uppercase transition cursor-pointer">
              I Have Verified (Refresh)
            </button>
            <button onClick={handleSignOut} className="w-full py-2.5 bg-transparent border border-slate-600 text-slate-400 hover:text-white rounded-lg text-xs uppercase transition cursor-pointer">
              Log Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pending gate
  if (currentUser && currentUser.status === 'pending') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased text-slate-200 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/30 mb-4">
            <Clock className="w-8 h-8 text-blue-400 animate-pulse" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white font-display">Registration Under Review</h2>
        </div>
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
          <div className="bg-slate-800/90 backdrop-blur-md py-8 px-4 shadow-2xl rounded-2xl border border-slate-700 sm:px-10 space-y-4">
            <div className="p-4 bg-slate-900/60 border border-slate-700 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Name:</span><span className="font-bold text-white">{currentUser.fullName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Employee ID:</span><span className="font-mono text-white">{currentUser.employeeId}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Role:</span><span className="capitalize text-white">{currentUser.role.replace('_', ' ')}</span></div>
            </div>
            <p className="text-xs text-slate-400 text-center">Your account must be approved by a Super Admin.</p>
            <button onClick={handleReloadStatus} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs uppercase transition cursor-pointer">Check Status</button>
            <button onClick={handleSignOut} className="w-full py-2.5 bg-transparent border border-slate-600 text-slate-400 hover:text-white rounded-lg text-xs uppercase transition cursor-pointer">Log Out</button>
          </div>
        </div>
      </div>
    );
  }

  // Suspended gate
  if (currentUser && currentUser.status === 'suspended') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased text-slate-200 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/30 mb-4 animate-bounce">
            <ShieldAlert className="w-8 h-8 text-rose-400" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-rose-500 font-display">Account Suspended</h2>
        </div>
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
          <div className="bg-slate-800/90 backdrop-blur-md py-8 px-4 shadow-2xl rounded-2xl border border-slate-700 sm:px-10 space-y-4 text-center">
            <p className="text-xs text-slate-400">Contact your administrator for assistance.</p>
            <button onClick={handleSignOut} className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs uppercase transition cursor-pointer">Log Out</button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN ERP LAYOUT
  // ==========================================
  return (
    <div className="flex h-screen bg-[#fafbfc] overflow-hidden font-sans text-slate-700 antialiased">

      {/* Sidebar */}
      {viewMode !== 'mobile' && (
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUser={currentUser}
          viewMode={viewMode}
          setViewMode={setViewMode}
          unresolvedAlertsCount={alerts.filter(a => !a.resolved).length}
          onSignOut={handleSignOut}
          orgName={orgName}
          orgLogo={orgLogo}
        />
      )}

      <div className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Header with Dynamic Branding: [Org]_[Hub] ERP */}
        {viewMode !== 'mobile' && (
          <header className="h-16 shrink-0 bg-white border-b border-slate-100 flex items-center justify-between px-8 shadow-2xs z-10">
            <div className="flex items-center gap-2">
              {orgLogo ? (
                <img src={orgLogo} alt="Org Logo" className="w-8 h-8 object-contain" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider font-display">
                {orgName}{currentUser.hubId ? `_${hubs.find(h => h.hubId === currentUser.hubId)?.name || currentUser.hubId}` : ''} ERP / {activeTab.toUpperCase()}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono font-medium text-slate-400 bg-slate-50 border border-slate-200/60 rounded-full px-3 py-1">
                <CloudLightning className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Firebase Cloud Sync Active</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-800">{currentUser.fullName}</p>
                  <p className="text-[10px] text-slate-400 font-mono capitalize">
                    {currentUser.role.replace('_', ' ')} · Hub {currentUser.hubId}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold font-display uppercase border-2 border-slate-100 shadow-sm">
                  {currentUser.fullName.slice(0, 2)}
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Main workspace */}
        <section className="flex-1 flex overflow-hidden min-h-0 bg-slate-100/35">

          {/* Left panel */}
          {viewMode !== 'mobile' && (
            <div className={`p-6 overflow-y-auto ${viewMode === 'split' ? 'w-2/3 border-r border-slate-200/80' : 'w-full'} h-full min-h-0`}>

              {activeTab === 'dashboard' && (
                <Dashboard
                  hubs={hubs}
                  users={users}
                  attendance={attendance}
                  kpiEntries={kpiEntries}
                  alerts={alerts}
                  onNavigateToTab={handleNavigateToTab}
                  onClearAlert={handleClearAlert}
                />
              )}

              {activeTab === 'monitoring' && (
                <RiderMonitoring
                  hubs={hubs}
                  users={users}
                  alerts={alerts}
                  kpiEntries={kpiEntries}
                  globalEarningsRate={globalEarningsRate}
                  currentUser={currentUser}
                  selectedRiderId={selectedRiderId}
                  onUpdateRiderLocation={handleUpdateRiderLocation}
                  onUpdateRiderBattery={handleUpdateRiderBattery}
                  onUpdateRiderGPS={handleUpdateRiderGPS}
                  onUpdateRiderIdle={handleUpdateRiderIdle}
                  onClearAlert={handleClearAlert}
                  onUpdateGlobalEarnings={handleUpdateGlobalEarnings}
                  onUpdateHub={handleUpdateHub}
                />
              )}

              {activeTab === 'ofdTracker' && (
                <OFDTracker
                  users={users}
                  hubs={hubs}
                  currentUser={currentUser}
                  attendance={attendance}
                  onOFDScan={handleOFDScan}
                />
              )}

              {activeTab === 'attendance' && (
                <AttendanceManager
                  hubs={hubs}
                  users={users}
                  attendance={attendance}
                  onSetAttendance={handleSetAttendance}
                  currentUser={currentUser}
                />
              )}

              {activeTab === 'kpi' && (
                <KPINode
                  hubs={hubs}
                  users={users}
                  attendance={attendance}
                  kpiEntries={kpiEntries}
                  onAddKPIEntry={handleAddKPIEntry}
                />
              )}

              {activeTab === 'employees' && (
                <EmployeeManager
                  hubs={hubs}
                  users={users}
                  currentUser={currentUser}
                  onAddEmployee={handleAddEmployee}
                  onUpdateStatus={handleUpdateStatus}
                  onFirebaseOnboarding={handleFirebaseOnboarding}
                  onReAuthSuperAdmin={handleReAuthSuperAdmin}
                />
              )}

              {activeTab === 'hubs' && (
                <HubControl
                  hubs={hubs}
                  currentUser={currentUser}
                  onUpdateHub={handleUpdateHub}
                  onAddHub={handleAddHub}
                  onDeleteHub={handleDeleteHub}
                />
              )}

              {activeTab === 'profile' && (
                <ProfileView currentUser={currentUser} hubs={hubs} />
              )}

            </div>
          )}

          {/* Right panel: Rider simulator */}
          {(viewMode === 'split' || viewMode === 'mobile') && (
            <div className={`${viewMode === 'split' ? 'w-1/3 p-6 shrink-0' : 'w-full p-12'} h-full bg-slate-50 overflow-y-auto flex flex-col justify-center items-center min-w-[350px]`}>
              {viewMode === 'mobile' && currentUser.role !== 'rider' && (
                <div className="w-full max-w-[340px] mb-4 text-left">
                  <button onClick={() => setViewMode('split')} className="text-xs text-blue-600 hover:underline font-bold">&larr; Back to Split View</button>
                </div>
              )}
              <RiderSimulatorAPK
                hubs={hubs}
                users={users}
                attendance={attendance}
                kpiEntries={kpiEntries}
                onCheckIn={handleCheckInMobile}
                onStartDuty={handleStartDutyMobile}
                onToggleBreak={handleToggleBreakMobile}
                onCheckOut={handleCheckOutMobile}
              />
            </div>
          )}

        </section>

      </div>
    </div>
  );
}