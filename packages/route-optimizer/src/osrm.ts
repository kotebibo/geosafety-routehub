/**
 * OSRM Integration for Real Road Routing
 * Uses Open Source Routing Machine for actual driving distances
 */

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

// OSRM public server (free, no API key needed)
const OSRM_BASE_URL = 'http://router.project-osrm.org/route/v1/driving';

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

  // Format: lng,lat;lng,lat;lng,lat...
  const coordsStr = coordinates.map(([lng, lat]) => `${lng},${lat}`).join(';');

  const params = new URLSearchParams({
    overview: 'full', // Get complete route geometry
    geometries: 'geojson', // Return as GeoJSON
    steps: 'true', // Get turn-by-turn directions
    annotations: 'true', // Get additional route info
  });

  const url = `${OSRM_BASE_URL}/${coordsStr}?${params}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.error('OSRM error:', response.status);
      return null;
    }

    const data: OSRMResponse = await response.json();

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      return data.routes[0];
    }

    return null;
  } catch (error) {
    console.error('OSRM request failed:', error);
    return null;
  }
}

/**
 * Get distance matrix using OSRM (real road distances)
 * @param locations Array of locations with lat/lng
 * @returns 2D matrix of distances in kilometers
 */
export async function getOSRMDistanceMatrix(
  locations: Array<{ lat: number; lng: number }>
): Promise<number[][]> {
  const n = locations.length;
  const matrix: number[][] = Array(n)
    .fill(0)
    .map(() => Array(n).fill(0));

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
        // Fallback to 0 if OSRM fails
        matrix[i][j] = 0;
        matrix[j][i] = 0;
      }

      // Be nice to the public server - small delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return matrix;
}

/**
 * Get route with road geometry for map visualization
 * @param locations Ordered array of locations
 * @returns Full route with geometry
 */
export async function getRouteWithGeometry(
  locations: Array<{ lat: number; lng: number }>
): Promise<{
  distance: number; // km
  duration: number; // minutes
  geometry: number[][]; // [lng, lat] pairs
} | null> {
  const coordinates: Array<[number, number]> = locations.map(loc => [loc.lng, loc.lat]);

  const route = await getOSRMRoute(coordinates);

  if (!route) {
    return null;
  }

  return {
    distance: route.distance / 1000, // meters to km
    duration: route.duration / 60, // seconds to minutes
    geometry: route.geometry.coordinates,
  };
}
