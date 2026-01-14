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
      date: '2025-10-15T09:00:00.000Z', // ISO datetime format
      inspector_id: '123e4567-e89b-12d3-a456-426614174000',
      stops: [
        {
          company_id: '123e4567-e89b-12d3-a456-426614174001',
          position: 1,
        },
      ],
    }

    const result = createRouteSchema.safeParse(validRoute)
    expect(result.success).toBe(true)
  })

  it('should reject invalid date format', () => {
    const invalidRoute = {
      name: 'Test Route',
      date: '10/15/2025', // Wrong format (not ISO datetime)
      inspector_id: '123e4567-e89b-12d3-a456-426614174000',
      stops: [
        {
          company_id: '123e4567-e89b-12d3-a456-426614174001',
          position: 1,
        },
      ],
    }

    const result = createRouteSchema.safeParse(invalidRoute)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('date')
    }
  })

  it('should accept valid optional start_time', () => {
    const validRoute = {
      name: 'Test Route',
      date: '2025-10-15T09:00:00.000Z',
      start_time: '09:00',
      inspector_id: '123e4567-e89b-12d3-a456-426614174000',
      stops: [
        {
          company_id: '123e4567-e89b-12d3-a456-426614174001',
          position: 1,
        },
      ],
    }

    const result = createRouteSchema.safeParse(validRoute)
    expect(result.success).toBe(true)
  })

  it('should reject route with no stops', () => {
    const invalidRoute = {
      name: 'Test Route',
      date: '2025-10-15T09:00:00.000Z',
      inspector_id: '123e4567-e89b-12d3-a456-426614174000',
      stops: [], // Empty - should fail min(1)
    }

    const result = createRouteSchema.safeParse(invalidRoute)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('stops')
    }
  })

  it('should reject route name that is too short', () => {
    const invalidRoute = {
      name: 'AB', // Too short (min 3 chars)
      date: '2025-10-15T09:00:00.000Z',
      inspector_id: '123e4567-e89b-12d3-a456-426614174000',
      stops: [
        {
          company_id: '123e4567-e89b-12d3-a456-426614174001',
          position: 1,
        },
      ],
    }

    const result = createRouteSchema.safeParse(invalidRoute)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name')
    }
  })

  it('should reject invalid company_id UUID in stops', () => {
    const invalidRoute = {
      name: 'Test Route',
      date: '2025-10-15T09:00:00.000Z',
      inspector_id: '123e4567-e89b-12d3-a456-426614174000',
      stops: [
        {
          company_id: 'not-a-uuid', // Invalid UUID
          position: 1,
        },
      ],
    }

    const result = createRouteSchema.safeParse(invalidRoute)
    expect(result.success).toBe(false)
  })

  it('should reject invalid inspector_id UUID', () => {
    const invalidRoute = {
      name: 'Test Route',
      date: '2025-10-15T09:00:00.000Z',
      inspector_id: 'not-a-uuid', // Invalid UUID
      stops: [
        {
          company_id: '123e4567-e89b-12d3-a456-426614174001',
          position: 1,
        },
      ],
    }

    const result = createRouteSchema.safeParse(invalidRoute)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('inspector_id')
    }
  })

  it('should reject invalid stop position', () => {
    const invalidRoute = {
      name: 'Test Route',
      date: '2025-10-15T09:00:00.000Z',
      inspector_id: '123e4567-e89b-12d3-a456-426614174000',
      stops: [
        {
          company_id: '123e4567-e89b-12d3-a456-426614174001',
          position: -1, // Invalid - must be positive
        },
      ],
    }

    const result = createRouteSchema.safeParse(invalidRoute)
    expect(result.success).toBe(false)
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

  it('should allow empty object (no updates)', () => {
    const result = updateRouteSchema.safeParse({})
    expect(result.success).toBe(true)
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
