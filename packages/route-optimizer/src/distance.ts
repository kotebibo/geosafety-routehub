/**
 * Distance Calculator
 * Calculates distances between coordinates using Haversine formula
 */

import type { Location } from './types';

/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 Latitude of point 1
 * @param lng1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lng2 Longitude of point 2
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimals
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Create distance matrix for all locations
 * @param locations Array of locations with lat/lng
 * @returns 2D array of distances
 */
export function createDistanceMatrix(locations: Array<{ lat: number; lng: number }>): number[][] {
  const n = locations.length;
  const matrix: number[][] = Array(n)
    .fill(0)
    .map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 0;
      } else {
        matrix[i][j] = calculateDistance(
          locations[i].lat,
          locations[i].lng,
          locations[j].lat,
          locations[j].lng
        );
      }
    }
  }
  
  return matrix;
}

/**
 * Calculate total route distance
 * @param route Ordered array of locations with lat/lng
 * @returns Total distance in kilometers
 */
export function calculateRouteDistance(route: Array<{ lat: number; lng: number }>): number {
  let totalDistance = 0;
  
  for (let i = 0; i < route.length - 1; i++) {
    totalDistance += calculateDistance(
      route[i].lat,
      route[i].lng,
      route[i + 1].lat,
      route[i + 1].lng
    );
  }
  
  return Math.round(totalDistance * 100) / 100;
}

/**
 * Estimate travel time based on distance
 * Assumes average speed of 40 km/h in city traffic
 * @param distance Distance in kilometers
 * @returns Time in minutes
 */
export function estimateTravelTime(distance: number): number {
  const avgSpeed = 40; // km/h
  const timeInHours = distance / avgSpeed;
  return Math.round(timeInHours * 60);
}
