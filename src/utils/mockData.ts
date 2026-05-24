/**
 * @deprecated All OLD placeholder/demo data has been removed.
 * Data is now loaded exclusively from Cloud Firestore via onSnapshot subscriptions.
 * See App.tsx for the Firestore integration layer.
 * 
 * This file exists only for type imports and backwards compatibility.
 * All INITIAL_* arrays are empty - no localStorage seeding occurs.
 */
import { Hub, User, Attendance, KPIEntry, NotificationAlert } from '../types';

export const INITIAL_HUBS: Hub[] = [];

export const INITIAL_USERS: User[] = [];

export const INITIAL_ATTENDANCE: Attendance[] = [];

export const INITIAL_KPI: KPIEntry[] = [];

export const INITIAL_ALERTS: NotificationAlert[] = [];