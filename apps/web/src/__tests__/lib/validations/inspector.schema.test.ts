/**
 * Inspector Schema Validation Tests
 */

import { describe, it, expect } from 'vitest'
import { createInspectorSchema, updateInspectorSchema } from '@/lib/validations/inspector.schema'

describe('createInspectorSchema', () => {
  it('should validate valid inspector data', () => {
    const validInspector = {
      name: 'Giorgi Beridze',
      phone: '+995599123456',
      email: 'giorgi@example.com',
      is_active: true,
      vehicle_type: 'Sedan',
      license_plate: 'AA-123-BB',
      notes: 'Experienced inspector',
      user_id: '123e4567-e89b-12d3-a456-426614174000',
    }

    const result = createInspectorSchema.safeParse(validInspector)
    expect(result.success).toBe(true)
  })

  it('should reject name that is too short (1 char)', () => {
    const invalidInspector = {
      name: 'G',
    }

    const result = createInspectorSchema.safeParse(invalidInspector)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name')
      expect(result.error.issues[0].message).toBe('Name must be at least 2 characters')
    }
  })

  it('should reject name that is too long (101 chars)', () => {
    const invalidInspector = {
      name: 'A'.repeat(101),
    }

    const result = createInspectorSchema.safeParse(invalidInspector)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name')
      expect(result.error.issues[0].message).toBe('Name must be less than 100 characters')
    }
  })

  it('should reject invalid phone format', () => {
    const invalidInspector = {
      name: 'Giorgi Beridze',
      phone: '12345',
    }

    const result = createInspectorSchema.safeParse(invalidInspector)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('phone')
      expect(result.error.issues[0].message).toBe(
        'Invalid Georgian phone number (format: +995XXXXXXXXX)'
      )
    }
  })

  it('should accept valid Georgian phone number (+995XXXXXXXXX)', () => {
    const validInspector = {
      name: 'Giorgi Beridze',
      phone: '+995599123456',
    }

    const result = createInspectorSchema.safeParse(validInspector)
    expect(result.success).toBe(true)
  })

  it('should accept Georgian phone without plus prefix (995XXXXXXXXX)', () => {
    const validInspector = {
      name: 'Giorgi Beridze',
      phone: '995599123456',
    }

    const result = createInspectorSchema.safeParse(validInspector)
    expect(result.success).toBe(true)
  })

  it('should accept local Georgian phone (9 digits)', () => {
    const validInspector = {
      name: 'Giorgi Beridze',
      phone: '599123456',
    }

    const result = createInspectorSchema.safeParse(validInspector)
    expect(result.success).toBe(true)
  })

  it('should default is_active to true when not provided', () => {
    const inspector = {
      name: 'Giorgi Beridze',
    }

    const result = createInspectorSchema.safeParse(inspector)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.is_active).toBe(true)
    }
  })

  it('should accept undefined for all optional fields', () => {
    const minimalInspector = {
      name: 'Giorgi Beridze',
    }

    const result = createInspectorSchema.safeParse(minimalInspector)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.phone).toBeUndefined()
      expect(result.data.email).toBeUndefined()
      expect(result.data.vehicle_type).toBeUndefined()
      expect(result.data.license_plate).toBeUndefined()
      expect(result.data.notes).toBeUndefined()
      expect(result.data.user_id).toBeUndefined()
    }
  })

  it('should reject invalid user_id UUID', () => {
    const invalidInspector = {
      name: 'Giorgi Beridze',
      user_id: 'not-a-uuid',
    }

    const result = createInspectorSchema.safeParse(invalidInspector)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('user_id')
    }
  })

  it('should reject invalid email format', () => {
    const invalidInspector = {
      name: 'Giorgi Beridze',
      email: 'not-an-email',
    }

    const result = createInspectorSchema.safeParse(invalidInspector)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('email')
    }
  })
})

describe('updateInspectorSchema', () => {
  it('should accept partial update with just phone', () => {
    const partialUpdate = {
      phone: '+995599123456',
    }

    const result = updateInspectorSchema.safeParse(partialUpdate)
    expect(result.success).toBe(true)
  })

  it('should accept empty object', () => {
    const result = updateInspectorSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('should still validate field constraints on partial update', () => {
    const invalidUpdate = {
      name: 'G', // Too short
    }

    const result = updateInspectorSchema.safeParse(invalidUpdate)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name')
    }
  })
})
