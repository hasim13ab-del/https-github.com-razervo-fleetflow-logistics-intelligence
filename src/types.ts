export type Role = 'super_admin' | 'admin' | 'hub_admin' | 'supervisor' | 'rider';
export type UserStatus = 'active' | 'pending' | 'suspended';
export type AttendanceStatus = 'present' | 'absent';
export type GpsStatus = 'on' | 'off';

export interface Location {
  latitude: number;
  longitude: number;
}

export interface EarningsRate {
  perDelivery: number;
  dailyBase?: number;
}

export interface HubConfig {
  qrAttendance: boolean;
  gpsTrackingInterval: number; // in seconds
  kpiWeights: {
    conversion: number; // e.g. 0.6
    attendance: number; // e.g. 0.4
  };
  earningsRate?: EarningsRate; // Local override for earnings
}

export interface Hub {
  hubId: string; // e.g. "HUB01"
  organizationName?: string;
  name: string;
  address: string;
  pincode: string;
  location: Location;
  radius: number; // allowed geofence in meters
  isVendor: boolean;
  vendorName?: string;
  config: HubConfig;
}

export interface LiveData {
  battery: number;
  isIdle: boolean;
  lastActive: string; // ISO date string
  gpsStatus: GpsStatus;
  currentLocation: Location;
}

export interface OrganizationTenant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
}

export interface User {
  uid: string;
  fullName: string;
  organizationId?: string;
  organizationName?: string;
  role: Role;
  email: string;
  employeeId: string; // e.g. "ORG-HUB01-DL-0001"
  hubId: string;
  supervisorId?: string;
  status: UserStatus;
  phoneNumber?: string;
  liveData?: LiveData;
}

export interface Attendance {
  id: string; // userId_date
  userId: string;
  hubId: string;
  date: string; // YYYY-MM-DD
  manualStatus?: AttendanceStatus; // Manual Present/Absent flag
  checkIn?: string; // ISO timestamp
  startDuty?: string; // ISO timestamp
  endDuty?: string; // ISO timestamp
  checkOut?: string; // ISO timestamp
  totalHours?: number; // calculated hours
  locationAtCheckIn?: Location;
  geofencePassed?: boolean;
}

export interface KPIEntry {
  id: string; // riderId_date
  riderId: string;
  date: string; // YYYY-MM-DD
  hubId: string;
  ofd: number; // Out For Delivery (scanner-only)
  delivered: number; // OFD field
  failed: number; // OFD field
  pickup: number; // Pickup field (manual-only)
  cod: number; // cash collected in INR
  conversionRate: number; // (delivered / ofd) * 100
  supervisorId: string;
  trackingId?: string; // Optional manual Tracking ID with "manual entry" fallback
}

export interface Shipment {
  id: string; // Shipment ID (barcode/QR)
  status: 'Assigned' | 'In Transit' | 'Delivered' | 'Failed';
  timestamp: string;
  riderId: string;
  riderName: string;
  hubId: string;
  assignedBy: string; // uid of operator who scanned
  assignedAt: string;
}

export interface OrganizationConfig {
  orgName: string;
  orgLogo?: string;
  primaryHubId: string;
  updatedAt: string;
}

export interface NotificationAlert {
  id: string;
  userId: string;
  riderName: string;
  employeeId: string;
  triggerType: 'gps_off' | 'low_battery' | 'low_conversion' | 'idle_time';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  resolved: boolean;
  actionTaken?: string;
}