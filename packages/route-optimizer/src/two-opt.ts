/**
 * 2-Opt Algorithm
 * Improves existing route by swapping edges
 */

import type { Location, OptimizedRoute } from './types';
import { calculateRouteDistance } from './distance';

/**
 * Improve route using 2-opt algorithm
 * Swaps edges to reduce total distance
 * @param route Initial route
 * @param maxIterations Maximum iterations to prevent infinite loops
 * @returns Improved route
 */
export function twoOptImprove(
  route: Location[],
  maxIterations: number = 100
): Location[] {
  if (route.length < 4) {
    return route; // 2-opt needs at least 4 stops
  }
  
  let improved = [...route];
  let bestDistance = calculateRouteDistance(improved);
  let iteration = 0;
  let foundImprovement = true;
  
  while (foundImprovement && iteration < maxIterations) {
    foundImprovement = false;
    iteration++;
    
    // Try all possible edge swaps
    for (let i = 1; i < improved.length - 2; i++) {
      for (let j = i + 1; j < improved.length - 1; j++) {
        // Reverse segment between i and j
        const newRoute = twoOptSwap(improved, i, j);
        const newDistance = calculateRouteDistance(newRoute);
        
        if (newDistance < bestDistance) {
          improved = newRoute;
          bestDistance = newDistance;
          foundImprovement = true;
        }
      }
    }
  }
  
  return improved;
}

/**
 * Swap edges between positions i and j
 * Reverses the order of locations between i and j
 */
function twoOptSwap(route: Location[], i: number, j: number): Location[] {
  const newRoute = [...route];
  
  // Reverse segment between i and j
  while (i < j) {
    [newRoute[i], newRoute[j]] = [newRoute[j], newRoute[i]];
    i++;
    j--;
  }
  
  return newRoute;
}

/**
 * Apply 2-opt to optimized route result
 * Rebuilds OptimizedRoute with improved stops
 */
export function improveOptimizedRoute(
  optimized: OptimizedRoute,
  maxIterations?: number
): OptimizedRoute {
  const improvedStops = twoOptImprove(optimized.stops, maxIterations);
  const totalDistance = calculateRouteDistance(improvedStops);
  
  // Recalculate metrics
  const travelTime = estimateTravelTime(totalDistance);
  const serviceTime = improvedStops.reduce(
    (sum, loc) => sum + (loc.serviceDuration || 30),
    0
  );
  
  return {
    ...optimized,
    stops: improvedStops,
    totalDistance,
    totalDuration: travelTime + serviceTime,
    efficiency: calculateEfficiency(improvedStops, totalDistance),
  };
}

function estimateTravelTime(distance: number): number {
  return Math.round((distance / 40) * 60);
}

function calculateEfficiency(route: Location[], totalDistance: number): number {
  const avgDistance = totalDistance / (route.length - 1 || 1);
  if (avgDistance < 5) return 100;
  if (avgDistance < 10) return 80;
  if (avgDistance < 15) return 60;
  return 40;
}
