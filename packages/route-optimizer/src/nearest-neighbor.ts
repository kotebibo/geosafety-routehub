/**
 * Nearest Neighbor Algorithm
 * Simple greedy algorithm for route optimization
 */

import type { Location, OptimizedRoute, RouteConstraints } from './types';
import { calculateDistance, calculateRouteDistance, estimateTravelTime } from './distance';

/**
 * Optimize route using Nearest Neighbor algorithm
 * Starts from first location and always picks nearest unvisited location
 */
export function nearestNeighbor(
  locations: Location[],
  constraints?: RouteConstraints
): OptimizedRoute {
  if (locations.length === 0) {
    throw new Error('No locations provided');
  }
  
  if (locations.length === 1) {
    return {
      stops: locations,
      totalDistance: 0,
      totalDuration: locations[0].serviceDuration || 30,
      estimatedStart: constraints?.startTime || '09:00',
      estimatedEnd: calculateEndTime(
        constraints?.startTime || '09:00',
        locations[0].serviceDuration || 30
      ),
      efficiency: 100,
    };
  }
  
  const route: Location[] = [];
  const unvisited = new Set(locations.map((_, i) => i));
  
  // Start with first location
  let currentIndex = 0;
  route.push(locations[currentIndex]);
  unvisited.delete(currentIndex);
  
  // Build route by always choosing nearest unvisited location
  while (unvisited.size > 0) {
    let nearestIndex = -1;
    let nearestDistance = Infinity;
    
    const current = locations[currentIndex];
    
    for (const index of unvisited) {
      const distance = calculateDistance(
        current.lat,
        current.lng,
        locations[index].lat,
        locations[index].lng
      );
      
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }
    
    currentIndex = nearestIndex;
    route.push(locations[currentIndex]);
    unvisited.delete(currentIndex);
  }
  
  // Calculate metrics
  const totalDistance = calculateRouteDistance(route);
  const travelTime = estimateTravelTime(totalDistance);
  const serviceTime = route.reduce(
    (sum, loc) => sum + (loc.serviceDuration || 30),
    0
  );
  const totalDuration = travelTime + serviceTime;
  
  const startTime = constraints?.startTime || '09:00';
  const endTime = calculateEndTime(startTime, totalDuration);
  
  return {
    stops: route,
    totalDistance,
    totalDuration,
    estimatedStart: startTime,
    estimatedEnd: endTime,
    efficiency: calculateEfficiency(route, totalDistance),
  };
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

function calculateEfficiency(route: Location[], totalDistance: number): number {
  // Simple efficiency: fewer km per stop is better
  const avgDistance = totalDistance / (route.length - 1 || 1);
  
  // Scale: <5km = 100%, 5-10km = 80%, 10-15km = 60%, >15km = 40%
  if (avgDistance < 5) return 100;
  if (avgDistance < 10) return 80;
  if (avgDistance < 15) return 60;
  return 40;
}
