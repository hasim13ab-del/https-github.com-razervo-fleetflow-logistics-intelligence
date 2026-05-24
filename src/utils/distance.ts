import { Location } from '../types';

/**
 * Calculates the geodetic distance between two coordinates in meters.
 * Using the Haversine formula.
 */
export function calculateDistance(loc1: Location, loc2: Location): number {
  const R = 6371e3; // Earth's radius in meters
  const lat1Rad = (loc1.latitude * Math.PI) / 180;
  const lat2Rad = (loc2.latitude * Math.PI) / 180;
  const deltaLatRad = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
  const deltaLonRad = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLonRad / 2) *
      Math.sin(deltaLonRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in meters
}

/**
 * Validates check-in attendance based on rider position, hub position, and radius.
 */
export function validateAttendance(
  riderLocation: Location,
  hubLocation: Location,
  allowedRadius: number
): { allowed: boolean; distance: number; message: string } {
  const distance = calculateDistance(riderLocation, hubLocation);
  if (distance <= allowedRadius) {
    return {
      allowed: true,
      distance: Math.round(distance),
      message: `Within allowed action range (${Math.round(distance)}m from Hub).`,
    };
  } else {
    return {
      allowed: false,
      distance: Math.round(distance),
      message: `Outside permitido hub boundary! You are ${Math.round(
        distance - allowedRadius
      )}m past the geofence perimeter.`,
    };
  }
}
