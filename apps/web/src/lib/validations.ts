/**
 * Zod Validation Schemas
 * Centralized validation schemas for API routes
 */

import { z } from 'zod'

// ==================== ROUTE SCHEMAS ====================

export const routeStopSchema = z.object({
  companyId: z.string().uuid('Invalid company ID'),
  companyServiceId: z.string().uuid().optional(),
  position: z.number().int().positive('Position must be a positive integer'),
  distanceFromPrevious: z.number().min(0).optional(),
  durationFromPrevious: z.number().min(0).optional(),
})

export const saveRouteSchema = z.object({
  name: z.string().min(1, 'Route name is required').max(255),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  inspectorId: z.string().uuid().optional().nullable(),
  serviceTypeId: z.string().uuid().optional().nullable(),
  startTime: z.string().optional().nullable(),
  totalDistance: z.number().min(0, 'Distance must be non-negative'),
  totalDuration: z.number().min(0).optional().nullable(),
  optimizationType: z.enum(['distance', 'time', 'balanced']).optional(),
  routeGeometry: z.any().optional().nullable(), // GeoJSON geometry
  stops: z.array(routeStopSchema).min(1, 'At least one stop is required'),
})

export type SaveRouteInput = z.infer<typeof saveRouteSchema>
export type RouteStop = z.infer<typeof routeStopSchema>

export const optimizeRouteSchema = z.object({
  locations: z.array(z.object({
    id: z.string(),
    name: z.string(),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    companyId: z.string().uuid().optional(),
  })).min(2, 'At least 2 locations required'),
  options: z.object({
    algorithm: z.enum(['nearest-neighbor', '2-opt', 'hybrid']).optional(),
    useRealRoads: z.boolean().optional(),
    maxStops: z.number().int().positive().max(100).optional(),
  }).optional(),
})

export type OptimizeRouteInput = z.infer<typeof optimizeRouteSchema>

// ==================== COMPANY SCHEMAS ====================

export const companySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(255),
  address: z.string().optional(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  type: z.enum(['commercial', 'residential', 'industrial', 'healthcare', 'education']).optional().nullable(),
  contact_name: z.string().max(255).optional().nullable(),
  contact_phone: z.string().max(50).optional().nullable(),
  contact_email: z.string().email().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  priority: z.enum(['low', 'medium', 'high']).optional().nullable(),
  status: z.enum(['active', 'inactive', 'pending']).optional().nullable(),
})

export type CompanyInput = z.infer<typeof companySchema>

export const companyLocationSchema = z.object({
  name: z.string().max(255).optional().nullable(),
  address: z.string().min(1, 'Address is required'),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  is_primary: z.boolean().optional(),
  notes: z.string().max(500).optional().nullable(),
})

export type CompanyLocationInput = z.infer<typeof companyLocationSchema>

// ==================== INSPECTOR SCHEMAS ====================

export const inspectorSchema = z.object({
  email: z.string().email('Invalid email address'),
  full_name: z.string().min(1, 'Name is required').max(255),
  phone: z.string().max(50).optional().nullable(),
  role: z.enum(['admin', 'dispatcher', 'inspector', 'manager']).optional().nullable(),
  specialty: z.string().max(100).optional().nullable(),
  zone: z.string().max(100).optional().nullable(),
  status: z.enum(['active', 'inactive', 'on_leave']).optional().nullable(),
})

export type InspectorInput = z.infer<typeof inspectorSchema>

export const createInspectorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email address').optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  is_active: z.boolean().optional().default(true),
  vehicle_type: z.string().max(100).optional().nullable(),
  license_plate: z.string().max(50).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
})

export type CreateInspectorInput = z.infer<typeof createInspectorSchema>

export const updateInspectorSchema = z.object({
  full_name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  role: z.enum(['admin', 'dispatcher', 'inspector', 'manager']).optional().nullable(),
  specialty: z.string().max(100).optional().nullable(),
  zone: z.string().max(100).optional().nullable(),
  status: z.enum(['active', 'inactive', 'on_leave']).optional().nullable(),
  vehicle_type: z.string().max(100).optional().nullable(),
  license_plate: z.string().max(50).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
})

export type UpdateInspectorInput = z.infer<typeof updateInspectorSchema>

// ==================== ASSIGNMENT SCHEMAS ====================

export const bulkAssignSchema = z.object({
  companyServiceIds: z.array(z.string().uuid()).min(1, 'At least one service is required'),
  inspectorId: z.string().uuid().nullable(),
})

export type BulkAssignInput = z.infer<typeof bulkAssignSchema>

// ==================== BOARD SCHEMAS ====================

export const createBoardSchema = z.object({
  name: z.string().min(1, 'Board name is required').max(255),
  name_ka: z.string().max(255).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  board_type: z.enum(['routes', 'companies', 'inspectors', 'inspections', 'custom']),
  icon: z.string().max(50).optional().nullable(),
  color: z.string().max(50).optional().nullable(),
  workspace_id: z.string().uuid().optional().nullable(),
})

export type CreateBoardInput = z.infer<typeof createBoardSchema>

export const updateBoardSchema = createBoardSchema.partial()

export type UpdateBoardInput = z.infer<typeof updateBoardSchema>

export const boardItemSchema = z.object({
  name: z.string().min(1, 'Item name is required').max(500),
  group_id: z.string().uuid().optional().nullable(),
  data: z.record(z.string(), z.any()).optional(),
  status: z.string().max(50).optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  due_date: z.string().optional().nullable(),
  priority: z.number().int().min(0).max(5).optional().nullable(),
})

export type BoardItemInput = z.infer<typeof boardItemSchema>

// ==================== USER SCHEMAS ====================

export const updateUserSchema = z.object({
  full_name: z.string().min(1).max(255).optional(),
  phone: z.string().max(50).optional().nullable(),
  is_active: z.boolean().optional(),
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>

export const userRoleSchema = z.object({
  userId: z.string().uuid(),
  roleName: z.string().min(1).max(50),
  inspectorId: z.string().uuid().optional().nullable(),
})

export type UserRoleInput = z.infer<typeof userRoleSchema>

// ==================== CUSTOM ROLE SCHEMAS ====================

export const createRoleSchema = z.object({
  name: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/, 'Name must be lowercase with underscores'),
  display_name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  color: z.string().max(7).regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  permissions: z.array(z.string()).optional(),
})

export type CreateRoleInput = z.infer<typeof createRoleSchema>

export const updateRoleSchema = createRoleSchema.partial().omit({ name: true })

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>

// ==================== WORKSPACE SCHEMAS ====================

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(100),
  description: z.string().max(500).optional().nullable(),
  color: z.string().max(50).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
})

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>

export const updateWorkspaceSchema = createWorkspaceSchema.partial()

export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>

// ==================== HELPER FUNCTIONS ====================

/**
 * Validate request body with Zod schema
 * Returns validated data or throws structured error
 */
export function validateBody<T extends z.ZodSchema>(
  schema: T,
  body: unknown
): z.infer<T> {
  return schema.parse(body)
}

/**
 * Safe parse that returns result object instead of throwing
 */
export function safeValidateBody<T extends z.ZodSchema>(
  schema: T,
  body: unknown
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(body)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}
