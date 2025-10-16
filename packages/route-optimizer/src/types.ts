/**
 * Route Optimization Package - Type Definitions
 */

export interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  priority?: number;
  timeWindow?: {
    start: string; // HH:mm format
    end: string;
  };
  serviceDuration?: number; // minutes
}

export interface OptimizationOptions {
  algorithm?: 'nearest-neighbor' | '2-opt' | 'hybrid';
  useRealRoads?: boolean; // Use OSRM for real road distances
  maxStops?: number;
  constraints?: RouteConstraints;
}

export interface RouteConstraints {
  startTime?: string; // HH:mm format
  endTime?: string; // HH:mm format
  maxStops?: number;
  maxDistance?: number; // kilometers
  breakDuration?: number; // minutes
  breakAfter?: number; // hours
}

export interface RouteStop extends Location {
  position: number;
  distanceFromPrevious: number; // km
  serviceDuration: number; // minutes
}

export interface OptimizedRoute {
  stops: RouteStop[];
  totalDistance: number; // kilometers
  originalDistance: number; // kilometers (before optimization)
  improvement: number; // percentage
  algorithm: string;
  metadata: {
    numLocations: number;
    usingRealRoads: boolean;
    routeGeometry?: number[][] | null; // [lng, lat] pairs for map
  };
}

export interface RouteStats {
  totalStops: number;
  totalDistance: number;
  totalDuration: number;
  averageStopDistance: number;
  longestSegment: number;
}
