# @geosafety/route-optimizer

Route optimization package using hybrid algorithms with real road distance support.

## Overview

This package provides intelligent route optimization for field service operations. It combines the Nearest Neighbor heuristic with 2-opt improvement to find efficient routes, optionally using real road distances from OSRM (OpenStreetMap Routing Machine).

## Installation

```bash
npm install @geosafety/route-optimizer
```

Or use from the monorepo:

```json
{
  "dependencies": {
    "@geosafety/route-optimizer": "*"
  }
}
```

## Usage

```typescript
import { optimizeRoute } from '@geosafety/route-optimizer';

const locations = [
  { id: '1', name: 'Office', latitude: 41.7151, longitude: 44.8271 },
  { id: '2', name: 'Client A', latitude: 41.7251, longitude: 44.7871 },
  { id: '3', name: 'Client B', latitude: 41.6951, longitude: 44.8071 },
  { id: '4', name: 'Client C', latitude: 41.7051, longitude: 44.8571 },
];

const result = await optimizeRoute(locations, {
  algorithm: 'hybrid',    // 'nearest-neighbor' | '2-opt' | 'hybrid'
  useRealRoads: true,     // Use OSRM for real road distances
  maxStops: 50,           // Maximum stops to optimize
});

console.log(result);
// {
//   stops: [...],           // Optimized order with positions
//   totalDistance: 12.5,    // Total route distance (km)
//   originalDistance: 18.2, // Original order distance (km)
//   improvement: 31.3,      // Improvement percentage
//   algorithm: 'hybrid',
//   metadata: {
//     numLocations: 4,
//     usingRealRoads: true,
//     routeGeometry: [[lat, lng], ...] // For map display
//   }
// }
```

## API

### `optimizeRoute(locations, options)`

Optimizes a route through the given locations.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `locations` | `Location[]` | Array of locations to visit |
| `options` | `OptimizationOptions` | Optional configuration |

#### Location

```typescript
interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
}
```

#### OptimizationOptions

```typescript
interface OptimizationOptions {
  algorithm?: 'nearest-neighbor' | '2-opt' | 'hybrid';  // Default: 'hybrid'
  useRealRoads?: boolean;  // Use OSRM for road distances. Default: true
  maxStops?: number;       // Maximum locations to process. Default: 50
}
```

#### Returns

```typescript
interface OptimizedRoute {
  stops: RouteStop[];        // Ordered stops with metadata
  totalDistance: number;     // Total distance in km
  originalDistance: number;  // Original order distance in km
  improvement: number;       // Improvement percentage
  algorithm: string;         // Algorithm used
  metadata: {
    numLocations: number;
    usingRealRoads: boolean;
    routeGeometry: number[][] | null;  // [lat, lng] pairs for map
  };
}

interface RouteStop extends Location {
  position: number;            // 1-based position in route
  distanceFromPrevious: number; // Distance from previous stop (km)
  serviceDuration: number;     // Estimated service time (minutes)
}
```

## Algorithms

### Nearest Neighbor

Fast greedy algorithm that always visits the closest unvisited location. O(n²) complexity.

```typescript
const result = await optimizeRoute(locations, { algorithm: 'nearest-neighbor' });
```

### 2-opt

Improvement algorithm that iteratively reverses route segments to reduce total distance. Starts from the original order.

```typescript
const result = await optimizeRoute(locations, { algorithm: '2-opt' });
```

### Hybrid (Recommended)

Combines both algorithms: runs Nearest Neighbor first, then improves with 2-opt. Provides the best results.

```typescript
const result = await optimizeRoute(locations, { algorithm: 'hybrid' });
```

## Distance Calculation

### OSRM (Real Roads)

When `useRealRoads: true` (default), the package uses the public OSRM demo server to calculate actual road distances. This provides accurate results but requires internet connectivity.

- Supports up to 100 locations efficiently
- Falls back to Haversine if OSRM fails
- Route geometry available for <= 25 stops

### Haversine (Direct Distance)

When OSRM is unavailable or disabled, uses the Haversine formula to calculate straight-line distances between coordinates. Fast but less accurate for road-based routes.

```typescript
import { calculateDistance } from '@geosafety/route-optimizer';

const distance = calculateDistance(
  { latitude: 41.7151, longitude: 44.8271 },
  { latitude: 41.7251, longitude: 44.7871 }
);
// Returns distance in kilometers
```

## Utilities

### Distance Matrix

```typescript
import { createDistanceMatrix } from '@geosafety/route-optimizer';

const matrix = createDistanceMatrix(locations);
// Returns 2D array of distances between all location pairs
```

### OSRM Integration

```typescript
import { getOSRMDistanceMatrix, getRouteWithGeometry } from '@geosafety/route-optimizer';

// Get distance matrix from OSRM
const matrix = await getOSRMDistanceMatrix(locations);

// Get route with geometry for map display
const route = await getRouteWithGeometry(locations);
// { distance: 12.5, duration: 45, geometry: [[lat, lng], ...] }
```

## Dependencies

- `@turf/turf` - Geospatial calculations

## Performance

| Locations | Nearest Neighbor | Hybrid |
|-----------|-----------------|--------|
| 10 | ~5ms | ~10ms |
| 25 | ~15ms | ~50ms |
| 50 | ~50ms | ~200ms |

*Times exclude OSRM network requests*

## Limitations

- OSRM Table API works efficiently for up to ~100 locations
- Route geometry only available for <= 25 stops (OSRM Route API limit)
- Uses public OSRM demo server (rate-limited, not for production)

For production use, consider hosting your own OSRM instance.

## License

MIT - See root [LICENSE](../../LICENSE)
