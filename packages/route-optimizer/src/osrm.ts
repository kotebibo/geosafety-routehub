/**
 * OSRM Integration for Real Road Routing
 * Uses Open Source Routing Machine for actual driving distances
 * Falls back to Haversine formula when OSRM is unavailable
 */

import { createDistanceMatrix as createHaversineMatrix } from './distance';

interface OSRMRoute {
  distance: number; // meters
  duration: number; // seconds
  geometry: {
    type: string;
    coordinates: number[][]; // [lng, lat] pairs
  };
}

interface OSRMResponse {
  code: string;
  routes: OSRMRoute[];
}

interface OSRMTableResponse {
  code: string;
  distances: number[][] | null; // matrix in meters (null cells for unreachable)
  durations: number[][] | null; // matrix in seconds
}

// OSRM public server (free, no API key needed)
// NOTE: This is a demo server with rate limits. For production, consider:
// - Hosting your own OSRM instance
// - Using a paid routing service (Mapbox, Google, HERE)
const OSRM_BASE_URL = 'http://router.project-osrm.org';
const OSRM_ROUTE_URL = `${OSRM_BASE_URL}/route/v1/driving`;
const OSRM_TABLE_URL = `${OSRM_BASE_URL}/table/v1/driving`;

// Timeout for OSRM requests (ms)
const OSRM_TIMEOUT = 10000;

// Flag to track if OSRM is available (avoid repeated failed requests)
let osrmAvailable = true;
let osrmLastFailure: number | null = null;
const OSRM_RETRY_DELAY = 60000; // Retry after 1 minute

/**
 * Check if OSRM should be retried after a failure
 */
function shouldRetryOSRM(): boolean {
  if (osrmAvailable) return true;
  if (!osrmLastFailure) return true;
  return Date.now() - osrmLastFailure > OSRM_RETRY_DELAY;
}

/**
 * Mark OSRM as unavailable
 */
function markOSRMUnavailable(): void {
  osrmAvailable = false;
  osrmLastFailure = Date.now();
  console.warn('⚠️ OSRM marked as unavailable. Will retry in 1 minute.');
}

/**
 * Mark OSRM as available
 */
function markOSRMAvailable(): void {
  osrmAvailable = true;
  osrmLastFailure = null;
}

/**
 * Fetch with timeout wrapper
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = OSRM_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Get real road route from OSRM
 * @param coordinates Array of [lng, lat] pairs
 * @returns Route with distance, duration, and geometry
 */
export async function getOSRMRoute(
  coordinates: Array<[number, number]>
): Promise<OSRMRoute | null> {
  if (coordinates.length < 2) {
    return null;
  }

  // Skip if OSRM is known to be unavailable
  if (!shouldRetryOSRM()) {
    return null;
  }

  // Format: lng,lat;lng,lat;lng,lat...
  const coordsStr = coordinates.map(([lng, lat]) => `${lng},${lat}`).join(';');

  const params = new URLSearchParams({
    overview: 'full', // Get complete route geometry
    geometries: 'geojson', // Return as GeoJSON
    steps: 'true', // Get turn-by-turn directions
    annotations: 'true', // Get additional route info
  });

  const url = `${OSRM_ROUTE_URL}/${coordsStr}?${params}`;

  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.error('OSRM error:', response.status);
      if (response.status === 429 || response.status >= 500) {
        markOSRMUnavailable();
      }
      return null;
    }

    const data: OSRMResponse = await response.json();

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      markOSRMAvailable();
      return data.routes[0];
    }

    return null;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('OSRM request timed out');
      markOSRMUnavailable();
    } else {
      console.error('OSRM request failed:', error);
      markOSRMUnavailable();
    }
    return null;
  }
}

/**
 * Get distance matrix using OSRM Table service (single API call)
 * Much more efficient than individual route requests
 * Falls back to Haversine formula when OSRM is unavailable
 * @param locations Array of locations with lat/lng
 * @returns 2D matrix of distances in kilometers
 */
export async function getOSRMDistanceMatrix(
  locations: Array<{ lat: number; lng: number }>
): Promise<number[][]> {
  const n = locations.length;

  if (n < 2) {
    return [[0]];
  }

  // Skip OSRM if known to be unavailable
  if (!shouldRetryOSRM()) {
    console.log('⚠️ OSRM unavailable, using Haversine fallback...');
    return createHaversineMatrix(locations);
  }

  // Format coordinates: lng,lat;lng,lat;lng,lat...
  const coordsStr = locations.map(loc => `${loc.lng},${loc.lat}`).join(';');

  const params = new URLSearchParams({
    annotations: 'distance', // We want distance matrix
  });

  const url = `${OSRM_TABLE_URL}/${coordsStr}?${params}`;

  try {
    console.log(`Fetching OSRM distance matrix for ${n} locations...`);

    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.error('OSRM Table error:', response.status);
      if (response.status === 429 || response.status >= 500) {
        markOSRMUnavailable();
      }
      throw new Error(`OSRM Table returned ${response.status}`);
    }

    const data: OSRMTableResponse = await response.json();

    if (data.code === 'Ok' && data.distances) {
      // Convert meters to kilometers
      const matrixKm = data.distances.map(row =>
        row.map(dist => (dist !== null ? dist / 1000 : 0))
      );
      console.log(`✅ Got OSRM distance matrix (${n}x${n})`);
      markOSRMAvailable();
      return matrixKm;
    }

    throw new Error(`OSRM Table returned code: ${data.code}`);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('OSRM Table request timed out');
      markOSRMUnavailable();
    } else {
      console.error('OSRM Table request failed:', error);
    }

    // Fallback to pairwise OSRM for small matrices
    if (n <= 10 && shouldRetryOSRM()) {
      console.log('Falling back to pairwise OSRM requests...');
      try {
        return await getOSRMDistanceMatrixPairwise(locations);
      } catch (pairwiseError) {
        console.error('Pairwise OSRM also failed:', pairwiseError);
      }
    }

    // Final fallback: Haversine formula (straight-line distance)
    console.log('⚠️ Using Haversine fallback (straight-line distances)');
    return createHaversineMatrix(locations);
  }
}

/**
 * Fallback: Get distance matrix using pairwise requests
 * Used when Table service fails. Uses Haversine for individual failures.
 */
async function getOSRMDistanceMatrixPairwise(
  locations: Array<{ lat: number; lng: number }>
): Promise<number[][]> {
  const n = locations.length;
  const matrix: number[][] = Array(n)
    .fill(0)
    .map(() => Array(n).fill(0));

  // Import Haversine for individual distance fallback
  const { calculateDistance } = await import('./distance');

  // Calculate distances between all pairs
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const coords: Array<[number, number]> = [
        [locations[i].lng, locations[i].lat],
        [locations[j].lng, locations[j].lat],
      ];

      const route = await getOSRMRoute(coords);

      if (route) {
        const distanceKm = route.distance / 1000; // Convert meters to km
        matrix[i][j] = distanceKm;
        matrix[j][i] = distanceKm;
      } else {
        // Fallback to Haversine (straight-line) distance
        const haversineDistance = calculateDistance(
          locations[i].lat,
          locations[i].lng,
          locations[j].lat,
          locations[j].lng
        );
        // Apply 1.3x factor to approximate road distance
        matrix[i][j] = haversineDistance * 1.3;
        matrix[j][i] = haversineDistance * 1.3;
      }

      // Be nice to the public server - small delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return matrix;
}

/**
 * Get route with road geometry for map visualization
 * Falls back to straight-line geometry when OSRM is unavailable
 * @param locations Ordered array of locations
 * @returns Full route with geometry
 */
export async function getRouteWithGeometry(
  locations: Array<{ lat: number; lng: number }>
): Promise<{
  distance: number; // km
  duration: number; // minutes
  geometry: number[][]; // [lng, lat] pairs
  isEstimate?: boolean; // true if using Haversine fallback
}> {
  const coordinates: Array<[number, number]> = locations.map(loc => [loc.lng, loc.lat]);

  const route = await getOSRMRoute(coordinates);

  if (route) {
    return {
      distance: route.distance / 1000, // meters to km
      duration: route.duration / 60, // seconds to minutes
      geometry: route.geometry.coordinates,
      isEstimate: false,
    };
  }

  // Fallback to Haversine calculation with straight-line geometry
  const { calculateRouteDistance, estimateTravelTime } = await import('./distance');
  const distance = calculateRouteDistance(locations);
  const duration = estimateTravelTime(distance);

  return {
    distance: distance * 1.3, // Apply road distance factor
    duration: duration * 1.2, // Add buffer for road travel
    geometry: coordinates, // Straight lines between points
    isEstimate: true,
  };
}

/**
 * Check if OSRM service is currently available
 * Useful for UI to show warnings
 */
export function isOSRMAvailable(): boolean {
  return osrmAvailable;
}

/**
 * Force reset OSRM availability (for testing or manual retry)
 */
export function resetOSRMAvailability(): void {
  osrmAvailable = true;
  osrmLastFailure = null;
}
