/**
 * Route Schema Validation Tests
 */

import { describe, it, expect } from 'vitest'
import { 
  createRouteSchema, 
  updateRouteSchema,
  reassignRouteSchema,
  routeStatusSchema 
} from '@/lib/validations/route.schema'

describe('createRouteSchema', () => {
  it('should validate a valid route', () => {
    const validRoute = {
      name: 'Morning Route',
      date: '2025-10-15',
      start_time: '09:00',
      inspector_id: '123e4567-e89b-12d3-a456-426614174000',
      stops: [
        {
          company: {
            id: '123e4567-e89b-12d3-a456-426614174001',
            name: 'Company A',
            lat: 41.7151,
            lng: 44.8271,
          },
          position: 1,
        },
      ],
      total_distance_km: 25.5,
    }

    const result = createRouteSchema.safeParse(validRoute)
    expect(result.success).toBe(true)
  })

  it('should reject invalid date format', () => {
    const invalidRoute = {
      name: 'Test Route',
      date: '10/15/2025', // Wrong format
      start_time: '09:00',
      inspector_id: '123e4567-e89b-12d3-a456-426614174000',
      stops: [
        {
          company: {
            id: '123e4567-e89b-12d3-a456-426614174001',
            name: 'Company A',
            lat: 41.7151,
            lng: 44.8271,
          },
          position: 1,
        },
      ],
      total_distance_km: 25.5,
    }

    const result = createRouteSchema.safeParse(invalidRoute)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('date')
    }
  })

  it('should reject invalid time format', () => {
    const invalidRoute = {
      name: 'Test Route',
      date: '2025-10-15',
      start_time: '9:00 AM', // Wrong format
      inspector_id: '123e4567-e89b-12d3-a456-426614174000',
      stops: [
        {
          company: {
            id: '123e4567-e89b-12d3-a456-426614174001',
            name: 'Company A',
            lat: 41.7151,
            lng: 44.8271,
          },
          position: 1,
        },
      ],
      total_distance_km: 25.5,
    }

    const result = createRouteSchema.safeParse(invalidRoute)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('start_time')
    }
  })

  it('should reject route with no stops', () => {
    const invalidRoute = {
      name: 'Test Route',
      date: '2025-10-15',
      start_time: '09:00',
      inspector_id: '123e4567-e89b-12d3-a456-426614174000',
      stops: [], // Empty
      total_distance_km: 0,
    }

    const result = createRouteSchema.safeParse(invalidRoute)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('stops')
    }
  })

  it('should reject route name that is too short', () => {
    const invalidRoute = {
      name: 'AB', // Too short
      date: '2025-10-15',
      start_time: '09:00',
      inspector_id: '123e4567-e89b-12d3-a456-426614174000',
      stops: [
        {
          company: {
            id: '123e4567-e89b-12d3-a456-426614174001',
            name: 'Company A',
            lat: 41.7151,
            lng: 44.8271,
          },
          position: 1,
        },
      ],
      total_distance_km: 25.5,
    }

    const result = createRouteSchema.safeParse(invalidRoute)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name')
    }
  })

  it('should reject invalid coordinates', () => {
    const invalidRoute = {
      name: 'Test Route',
      date: '2025-10-15',
      start_time: '09:00',
      inspector_id: '123e4567-e89b-12d3-a456-426614174000',
      stops: [
        {
          company: {
            id: '123e4567-e89b-12d3-a456-426614174001',
            name: 'Company A',
            lat: 100, // Invalid latitude
            lng: 44.8271,
          },
          position: 1,
        },
      ],
      total_distance_km: 25.5,
    }

    const result = createRouteSchema.safeParse(invalidRoute)
    expect(result.success).toBe(false)
  })

  it('should reject invalid UUID', () => {
    const invalidRoute = {
      name: 'Test Route',
      date: '2025-10-15',
      start_time: '09:00',
      inspector_id: 'not-a-uuid', // Invalid UUID
      stops: [
        {
          company: {
            id: '123e4567-e89b-12d3-a456-426614174001',
            name: 'Company A',
            lat: 41.7151,
            lng: 44.8271,
          },
          position: 1,
        },
      ],
      total_distance_km: 25.5,
    }

    const result = createRouteSchema.safeParse(invalidRoute)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('inspector_id')
    }
  })
})

describe('updateRouteSchema', () => {
  it('should allow partial updates', () => {
    const partialUpdate = {
      name: 'Updated Route Name',
    }

    const result = updateRouteSchema.safeParse(partialUpdate)
    expect(result.success).toBe(true)
  })

  it('should validate updated fields', () => {
    const invalidUpdate = {
      date: 'invalid-date',
    }

    const result = updateRouteSchema.safeParse(invalidUpdate)
    expect(result.success).toBe(false)
  })
})

describe('reassignRouteSchema', () => {
  it('should validate reassignment', () => {
    const reassignment = {
      route_id: '123e4567-e89b-12d3-a456-426614174000',
      new_inspector_id: '123e4567-e89b-12d3-a456-426614174001',
    }

    const result = reassignRouteSchema.safeParse(reassignment)
    expect(result.success).toBe(true)
  })

  it('should reject invalid UUIDs', () => {
    const invalidReassignment = {
      route_id: 'not-a-uuid',
      new_inspector_id: '123e4567-e89b-12d3-a456-426614174001',
    }

    const result = reassignRouteSchema.safeParse(invalidReassignment)
    expect(result.success).toBe(false)
  })
})

describe('routeStatusSchema', () => {
  it('should accept valid statuses', () => {
    const validStatuses = ['planned', 'in_progress', 'completed', 'cancelled']
    
    validStatuses.forEach(status => {
      const result = routeStatusSchema.safeParse(status)
      expect(result.success).toBe(true)
    })
  })

  it('should reject invalid status', () => {
    const result = routeStatusSchema.safeParse('invalid_status')
    expect(result.success).toBe(false)
  })
})
