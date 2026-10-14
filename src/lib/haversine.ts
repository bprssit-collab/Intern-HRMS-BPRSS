/**
 * Haversine distance formula
 * Calculates the great-circle distance between two geographic coordinates.
 * Used for geofence validation: if distance > max_radius_meters → block check-in.
 */

import type { GeoPosition, GeofenceResult } from '@/types';

const EARTH_RADIUS_METERS = 6371000; // Mean radius of Earth in meters

/**
 * Converts degrees to radians.
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculates the Haversine distance between two coordinate pairs.
 * @param lat1 - Latitude of point 1 (degrees)
 * @param long1 - Longitude of point 1 (degrees)
 * @param lat2 - Latitude of point 2 (degrees)
 * @param long2 - Longitude of point 2 (degrees)
 * @returns Distance in meters (floating point)
 */
export function haversineDistance(
  lat1: number,
  long1: number,
  lat2: number,
  long2: number
): number {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(long2 - long1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Validates whether a user's location is within the allowed geofence radius.
 * @param userPos - The user's current GPS coordinates
 * @param officePos - The office GPS coordinates (from settings)
 * @param maxRadius - Maximum allowed distance in meters
 * @returns GeofenceResult with validity flag, distance, and user-friendly message
 */
export function validateGeofence(
  userPos: GeoPosition,
  officePos: GeoPosition,
  maxRadius: number
): GeofenceResult {
  const distance = haversineDistance(
    userPos.lat,
    userPos.long,
    officePos.lat,
    officePos.long
  );

  const isValid = distance <= maxRadius;

  return {
    isValid,
    distance,
    message: isValid
      ? `Lokasi valid. Jarak dari kantor: ${Math.round(distance)} meter.`
      : `Lokasi terlalu jauh dari kantor. Jarak: ${Math.round(distance)}m (maks: ${maxRadius}m). Harap berada di area kantor.`,
  };
}

/**
 * Gets the user's current GPS coordinates via the browser Geolocation API.
 * Returns a promise that resolves with the position or rejects with an error message.
 */
export function getCurrentPosition(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Perangkat Anda tidak mendukung GPS. Hubungi admin.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          long: position.coords.longitude,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('Akses lokasi ditolak. Aktifkan izin lokasi di pengaturan browser Anda.'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Informasi lokasi tidak tersedia. Pastikan GPS aktif.'));
            break;
          case error.TIMEOUT:
            reject(new Error('Permintaan lokasi timeout. Coba lagi.'));
            break;
          default:
            reject(new Error('Terjadi kesalahan tidak diketahui saat mendapatkan lokasi.'));
        }
      },
      {
        enableHighAccuracy: true, // Use GPS chip for best accuracy
        timeout: 15000,           // 15 seconds timeout
        maximumAge: 0,            // Always fetch fresh position
      }
    );
  });
}
