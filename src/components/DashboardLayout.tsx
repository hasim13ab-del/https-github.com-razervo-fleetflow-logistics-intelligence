import React from 'react';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import RiderMonitoring from './RiderMonitoring';
import AttendanceManager from './AttendanceManager';
import KPINode from './KPINode';
import EmployeeManager from './EmployeeManager';
import HubControl from './HubControl';
import RiderSimulatorAPK from './RiderSimulatorAPK';
import ProfileView from './ProfileView';
import OFDTracker from './OFDTracker';
import {
    Hub,
    User,
    Attendance,
    KPIEntry,
    NotificationAlert,
    Shipment,
    Location,
    Role,
    UserStatus,
    AttendanceStatus,
    OrganizationConfig
} from '../types';
import { CloudLightning } from 'lucide-react';

interface DashboardLayoutProps {
    currentUser: {
        uid: string;
        fullName: string;
        role: Role;
        email: string;
        hubId: string;
        employeeId: string;
        status: UserStatus;
        emailVerified: boolean;
    };
    hubs: Hub[];
    users: User[];
    attendance: Attendance[];
    kpiEntries: KPIEntry[];
    alerts: NotificationAlert[];
    shipments: Shipment[];
    orgName: string;
    orgLogo: string;
    globalEarningsRate: { perDelivery: number; dailyBase?: number };
    onSignOut: () => void;
    onNavigateToTab: (tab: string, riderId?: string) => void;

    // Handler props
    onUpdateRiderLocation: (riderId: string, location: Location) => void;
    onUpdateRiderBattery: (riderId: string, battery: number) => void;
    onUpdateRiderGPS: (riderId: string, status: 'on' | 'off') => void;
    onUpdateRiderIdle: (riderId: string, isIdle: boolean) => void;
    onSetAttendance: (userId: string, date: string, manualStatus: AttendanceStatus) => Promise<void>;
    onAddKPIEntry: (entry: Omit<KPIEntry, 'id' | 'conversionRate'>) => void;
    onAddEmployee: (employee: Omit<User, 'uid'>) => void;
    onUpdateStatus: (uid: string, status: UserStatus) => void;
    onFirebaseOnboarding: (params: {
        fullName: string;
        email: string;
        role: Role;
        hubId: string;
        phoneNumber: string;
        employeeId: string;
    }) => Promise<{ success: boolean; message: string; password?: string }>;
    onReAuthSuperAdmin: (password: string) => Promise<boolean>;
    onClearAlert: (alertId: string) => void;
    onUpdateHub: (hubId: string, updatedFields: Partial<Hub>) => void;
    onAddHub: (hub: Hub) => void;
    onDeleteHub: (hubId: string) => void;
    onOFDScan: (
        shipmentId: string,
        riderId: string,
        trackingId?: string
    ) => Promise<{ success: boolean; message: string }>;
    onUpdateGlobalEarnings: (rate: { perDelivery: number; dailyBase?: number }) => void;

    // Internal layout state
    viewMode: 'split' | 'erp' | 'mobile';
    setViewMode: (mode: 'split' | 'erp' | 'mobile') => void;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    selectedRiderId: string | null;
}

export default function DashboardLayout({
    currentUser,
    hubs,
    users,
    attendance,
    kpiEntries,
    alerts,
    shipments,
    orgName,
    orgLogo,
    globalEarningsRate,
    onSignOut,
    onNavigateToTab,
    onUpdateRiderLocation,
    onUpdateRiderBattery,
    onUpdateRiderGPS,
    onUpdateRiderIdle,
    onSetAttendance,
    onAddKPIEntry,
    onAddEmployee,
    onUpdateStatus,
    onFirebaseOnboarding,
    onReAuthSuperAdmin,
    onClearAlert,
    onUpdateHub,
    onAddHub,
    onDeleteHub,
    onOFDScan,
    onUpdateGlobalEarnings,
    viewMode,
    setViewMode,
    activeTab,
    setActiveTab,
    selectedRiderId,
}: DashboardLayoutProps) {
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
                    onSignOut={onSignOut}
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
                                    onNavigateToTab={onNavigateToTab}
                                    onClearAlert={onClearAlert}
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
                                    onUpdateRiderLocation={onUpdateRiderLocation}
                                    onUpdateRiderBattery={onUpdateRiderBattery}
                                    onUpdateRiderGPS={onUpdateRiderGPS}
                                    onUpdateRiderIdle={onUpdateRiderIdle}
                                    onClearAlert={onClearAlert}
                                    onUpdateGlobalEarnings={onUpdateGlobalEarnings}
                                    onUpdateHub={onUpdateHub}
                                />
                            )}

                            {activeTab === 'ofdTracker' && (
                                <OFDTracker
                                    users={users}
                                    hubs={hubs}
                                    currentUser={currentUser}
                                    attendance={attendance}
                                    onOFDScan={onOFDScan}
                                />
                            )}

                            {activeTab === 'attendance' && (
                                <AttendanceManager
                                    hubs={hubs}
                                    users={users}
                                    attendance={attendance}
                                    onSetAttendance={onSetAttendance}
                                    currentUser={currentUser}
                                />
                            )}

                            {activeTab === 'kpi' && (
                                <KPINode
                                    hubs={hubs}
                                    users={users}
                                    attendance={attendance}
                                    kpiEntries={kpiEntries}
                                    onAddKPIEntry={onAddKPIEntry}
                                />
                            )}

                            {activeTab === 'employees' && (
                                <EmployeeManager
                                    hubs={hubs}
                                    users={users}
                                    currentUser={currentUser}
                                    onAddEmployee={onAddEmployee}
                                    onUpdateStatus={onUpdateStatus}
                                    onFirebaseOnboarding={onFirebaseOnboarding}
                                    onReAuthSuperAdmin={onReAuthSuperAdmin}
                                />
                            )}

                            {activeTab === 'hubs' && (
                                <HubControl
                                    hubs={hubs}
                                    currentUser={currentUser}
                                    onUpdateHub={onUpdateHub}
                                    onAddHub={onAddHub}
                                    onDeleteHub={onDeleteHub}
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
                                onCheckIn={(userId, location) => { }}
                                onStartDuty={(userId) => { }}
                                onToggleBreak={(userId) => { }}
                                onCheckOut={(userId) => { }}
                            />
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}