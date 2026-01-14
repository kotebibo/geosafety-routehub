/**
 * Route validation schemas
 */

import { z } from 'zod'

// Route stop schema
export const routeStopSchema = z.object({
  company_id: z.string().uuid('Invalid company ID'),
  position: z.number().int().positive('Position must be positive'),
  estimated_duration: z.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
})

// Create route schema  
export const createRouteSchema = z.object({
  name: z.string()
    .min(3, 'Route name must be at least 3 characters')
    .max(100, 'Route name too long')
    .transform(val => val.trim()),
    
  date: z.string().datetime('Invalid date format'),
  
  inspector_id: z.string().uuid('Invalid inspector ID'),
  
  stops: z.array(routeStopSchema)
    .min(1, 'Route must have at least one stop')
    .max(50, 'Too many stops in route'),
    
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  
  notes: z.string().max(1000).optional(),
})

// Update route schema
export const updateRouteSchema = createRouteSchema.partial()

// Route optimization request schema
export const optimizeRouteSchema = z.object({
  start_location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  
  company_ids: z.array(z.string().uuid())
    .min(2, 'Need at least 2 stops to optimize')
    .max(25, 'Too many stops for optimization'),
    
  return_to_start: z.boolean().default(true),
  
  optimization_mode: z.enum(['distance', 'time']).default('distance'),
})

// Update route status schema
export const updateRouteStatusSchema = z.object({
  status: z.enum(['planned', 'in_progress', 'completed', 'cancelled']),
  notes: z.string().max(500).optional(),
})

// Update stop status schema
export const updateStopStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'skipped', 'failed']),
  actual_arrival_time: z.string().datetime().optional(),
  actual_departure_time: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
})

// Reassign route schema
export const reassignRouteSchema = z.object({
  route_id: z.string().uuid('Invalid route ID'),
  new_inspector_id: z.string().uuid('Invalid inspector ID'),
})

// Simple route status enum schema (for direct status validation)
export const routeStatusSchema = z.enum(['planned', 'in_progress', 'completed', 'cancelled'])

// Save route API schema (camelCase for frontend API)
export const saveRouteSchema = z.object({
  name: z.string()
    .min(1, 'Route name is required')
    .max(100, 'Route name too long'),
  date: z.string().min(1, 'Date is required'),
  inspectorId: z.string().uuid('Invalid inspector ID').optional(),
  serviceTypeId: z.string().uuid('Invalid service type ID').optional(),
  startTime: z.string().optional(),
  totalDistance: z.number().nonnegative(),
  totalDuration: z.number().nonnegative().optional(),
  optimizationType: z.string().optional(),
  routeGeometry: z.array(z.array(z.number())).optional(),
  stops: z.array(z.object({
    companyId: z.string().uuid('Invalid company ID'),
    companyServiceId: z.string().uuid().optional(),
    position: z.number().int().positive(),
    distanceFromPrevious: z.number().nonnegative().optional(),
    durationFromPrevious: z.number().nonnegative().optional(),
  })).min(1, 'Route must have at least one stop'),
})

export type RouteInput = z.infer<typeof createRouteSchema>
export type RouteUpdate = z.infer<typeof updateRouteSchema>
export type OptimizeRouteRequest = z.infer<typeof optimizeRouteSchema>
export type RouteStatusUpdate = z.infer<typeof updateRouteStatusSchema>
export type StopStatusUpdate = z.infer<typeof updateStopStatusSchema>
export type ReassignRoute = z.infer<typeof reassignRouteSchema>
export type SaveRouteInput = z.infer<typeof saveRouteSchema>
