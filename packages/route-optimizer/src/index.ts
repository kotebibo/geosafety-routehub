/**
 * Route Optimizer - Main Entry Point
 * Optimizes route using real road distances (OSRM) with Haversine fallback
 */

import { createDistanceMatrix, calculateDistance } from './distance';
import { getOSRMDistanceMatrix, getRouteWithGeometry } from './osrm';
import type { Location, OptimizationOptions, OptimizedRoute, RouteStop } from './types';

/**
 * Simple nearest neighbor using distance matrix
 */
function nearestNeighborIndices(distanceMatrix: number[][]): number[] {
  const n = distanceMatrix.length;
  if (n === 0) return [];
  if (n === 1) return [0];

  const route: number[] = [];
  const unvisited = new Set(Array.from({ length: n }, (_, i) => i));

  // Start with first location
  let current = 0;
  route.push(current);
  unvisited.delete(current);

  while (unvisited.size > 0) {
    let nearest = -1;
    let nearestDist = Infinity;

    for (const next of unvisited) {
      if (distanceMatrix[current][next] < nearestDist) {
        nearestDist = distanceMatrix[current][next];
        nearest = next;
      }
    }

    current = nearest;
    route.push(current);
    unvisited.delete(current);
  }

  return route;
}

/**
 * 2-opt improvement using indices
 */
function twoOptIndices(distanceMatrix: number[][], route: number[]): number[] {
  if (route.length < 4) return route;

  let improved = [...route];
  let bestDist = calculateRouteDistFromMatrix(distanceMatrix, improved);
  let foundImprovement = true;
  let iterations = 0;

  while (foundImprovement && iterations < 100) {
    foundImprovement = false;
    iterations++;

    for (let i = 1; i < improved.length - 2; i++) {
      for (let j = i + 1; j < improved.length - 1; j++) {
        const newRoute = twoOptSwap(improved, i, j);
        const newDist = calculateRouteDistFromMatrix(distanceMatrix, newRoute);

        if (newDist < bestDist) {
          improved = newRoute;
          bestDist = newDist;
          foundImprovement = true;
        }
      }
    }
  }

  return improved;
}

function twoOptSwap(route: number[], i: number, j: number): number[] {
  const newRoute = [...route];
  while (i < j) {
    [newRoute[i], newRoute[j]] = [newRoute[j], newRoute[i]];
    i++;
    j--;
  }
  return newRoute;
}

function calculateRouteDistFromMatrix(matrix: number[][], route: number[]): number {
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    total += matrix[route[i]][route[i + 1]];
  }
  return total;
}

/**
 * Optimize route using hybrid algorithm
 */
export async function optimizeRoute(
  locations: Location[],
  options: OptimizationOptions = {}
): Promise<OptimizedRoute> {
  const {
    algorithm = 'hybrid',
    useRealRoads = true,
    maxStops = 50,
  } = options;

  if (locations.length === 0) {
    throw new Error('No locations provided');
  }

  // Limit locations
  const limitedLocations = locations.slice(0, maxStops);

  let distanceMatrix: number[][];
  let usingRealRoads = false;

  // Try OSRM for real roads (Table API supports up to ~100 locations efficiently)
  if (useRealRoads && limitedLocations.length <= 100) {
    try {
      console.log('Fetching real road distances from OSRM...');
      distanceMatrix = await getOSRMDistanceMatrix(limitedLocations);

      const hasValidDistances = distanceMatrix.some(row =>
        row.some(dist => dist > 0)
      );

      if (hasValidDistances) {
        usingRealRoads = true;
        console.log('✅ Using OSRM real road distances');
      } else {
        throw new Error('OSRM returned empty distances');
      }
    } catch (error) {
      console.warn('⚠️ OSRM failed, falling back to Haversine:', error);
      distanceMatrix = createDistanceMatrix(limitedLocations);
    }
  } else {
    if (limitedLocations.length > 100) {
      console.log(`⚠️ ${limitedLocations.length} locations exceeds OSRM limit, using Haversine`);
    }
    distanceMatrix = createDistanceMatrix(limitedLocations);
  }

  // Run optimization
  let optimizedIndices: number[];

  if (algorithm === 'nearest-neighbor') {
    optimizedIndices = nearestNeighborIndices(distanceMatrix);
  } else if (algorithm === '2-opt') {
    const initial = Array.from({ length: limitedLocations.length }, (_, i) => i);
    optimizedIndices = twoOptIndices(distanceMatrix, initial);
  } else {
    // Hybrid
    const nnRoute = nearestNeighborIndices(distanceMatrix);
    optimizedIndices = twoOptIndices(distanceMatrix, nnRoute);
  }

  // Build result
  const optimizedLocations = optimizedIndices.map(i => limitedLocations[i]);

  let totalDistance = 0;
  for (let i = 0; i < optimizedIndices.length - 1; i++) {
    totalDistance += distanceMatrix[optimizedIndices[i]][optimizedIndices[i + 1]];
  }

  const originalIndices = Array.from({ length: limitedLocations.length }, (_, i) => i);
  let originalDistance = 0;
  for (let i = 0; i < originalIndices.length - 1; i++) {
    originalDistance += distanceMatrix[i][i + 1];
  }

  const improvement = ((originalDistance - totalDistance) / originalDistance) * 100;

  const stops: RouteStop[] = optimizedLocations.map((loc, index) => {
    const distanceFromPrevious =
      index === 0
        ? 0
        : distanceMatrix[optimizedIndices[index - 1]][optimizedIndices[index]];

    return {
      ...loc,
      position: index + 1,
      distanceFromPrevious: Math.round(distanceFromPrevious * 100) / 100,
      serviceDuration: 30,
    };
  });

  // Get route geometry
  let routeGeometry: number[][] | null = null;

  if (usingRealRoads && optimizedLocations.length <= 25) {
    try {
      const routeWithGeometry = await getRouteWithGeometry(optimizedLocations);
      if (routeWithGeometry) {
        routeGeometry = routeWithGeometry.geometry;
        totalDistance = routeWithGeometry.distance;
      }
    } catch (error) {
      console.warn('Could not get route geometry:', error);
    }
  }

  return {
    stops,
    totalDistance: Math.round(totalDistance * 100) / 100,
    originalDistance: Math.round(originalDistance * 100) / 100,
    improvement: Math.round(improvement * 10) / 10,
    algorithm,
    metadata: {
      numLocations: limitedLocations.length,
      usingRealRoads,
      routeGeometry,
    },
  };
}

// Export utilities
export * from './distance';
export * from './osrm';
export * from './types';
