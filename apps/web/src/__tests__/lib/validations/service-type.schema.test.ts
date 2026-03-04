/**
 * Service Type Schema Validation Tests
 */

import { describe, it, expect } from 'vitest'
import {
  createServiceTypeSchema,
  updateServiceTypeSchema,
  companyServiceSchema,
} from '@/lib/validations/service-type.schema'

describe('createServiceTypeSchema', () => {
  const validServiceType = {
    name: 'Fire Safety Inspection',
    name_ka: 'სახანძრო უსაფრთხოების ინსპექტირება',
    description: 'Annual fire safety compliance check',
    description_ka: 'სახანძრო უსაფრთხოების წლიური შემოწმება',
    default_frequency_days: 365,
  }

  it('should validate valid service type data', () => {
    const result = createServiceTypeSchema.safeParse(validServiceType)
    expect(result.success).toBe(true)
  })

  it('should reject empty name', () => {
    const data = {
      ...validServiceType,
      name: '',
    }

    const result = createServiceTypeSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name')
      expect(result.error.issues[0].message).toBe('Name is required')
    }
  })

  it('should reject name that is too long (over 100 chars)', () => {
    const data = {
      ...validServiceType,
      name: 'A'.repeat(101),
    }

    const result = createServiceTypeSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name')
      expect(result.error.issues[0].message).toBe('Name is too long')
    }
  })

  it('should reject empty Georgian name', () => {
    const data = {
      ...validServiceType,
      name_ka: '',
    }

    const result = createServiceTypeSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name_ka')
      expect(result.error.issues[0].message).toBe('Georgian name is required')
    }
  })

  it('should reject frequency of 0 (min is 1)', () => {
    const data = {
      ...validServiceType,
      default_frequency_days: 0,
    }

    const result = createServiceTypeSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('default_frequency_days')
    }
  })

  it('should reject frequency over 365', () => {
    const data = {
      ...validServiceType,
      default_frequency_days: 400,
    }

    const result = createServiceTypeSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('default_frequency_days')
    }
  })

  it('should default regulatory_requirement to false', () => {
    const data = {
      name: 'Test Service',
      name_ka: 'ტესტი',
    }

    const result = createServiceTypeSchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.regulatory_requirement).toBe(false)
    }
  })

  it('should default is_active to true', () => {
    const data = {
      name: 'Test Service',
      name_ka: 'ტესტი',
    }

    const result = createServiceTypeSchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.is_active).toBe(true)
    }
  })

  it('should accept nullable optional fields', () => {
    const data = {
      name: 'Test Service',
      name_ka: 'ტესტი',
      description: null,
      description_ka: null,
      required_inspector_type: null,
      default_frequency_days: null,
      sort_order: null,
    }

    const result = createServiceTypeSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('should reject description that is too long', () => {
    const data = {
      ...validServiceType,
      description: 'A'.repeat(501),
    }

    const result = createServiceTypeSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('description')
      expect(result.error.issues[0].message).toBe('Description is too long')
    }
  })
})

describe('updateServiceTypeSchema', () => {
  it('should accept partial update with just name', () => {
    const result = updateServiceTypeSchema.safeParse({
      name: 'Updated Name',
    })
    expect(result.success).toBe(true)
  })

  it('should accept empty object', () => {
    const result = updateServiceTypeSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('should still validate field constraints on partial update', () => {
    const result = updateServiceTypeSchema.safeParse({
      name: '', // min(1) should fail
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name')
    }
  })

  it('should accept nullable fields', () => {
    const result = updateServiceTypeSchema.safeParse({
      description: null,
      default_frequency_days: null,
    })
    expect(result.success).toBe(true)
  })
})

describe('companyServiceSchema', () => {
  const validCompanyService = {
    service_type_id: '123e4567-e89b-12d3-a456-426614174000',
    inspection_frequency_days: 30,
    priority: 'high' as const,
    notes: 'Priority client',
  }

  it('should validate valid company service data', () => {
    const result = companyServiceSchema.safeParse(validCompanyService)
    expect(result.success).toBe(true)
  })

  it('should reject invalid service_type_id UUID', () => {
    const data = {
      ...validCompanyService,
      service_type_id: 'not-a-uuid',
    }

    const result = companyServiceSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('service_type_id')
      expect(result.error.issues[0].message).toBe('Invalid service type ID')
    }
  })

  it('should reject invalid priority enum value', () => {
    const data = {
      ...validCompanyService,
      priority: 'urgent',
    }

    const result = companyServiceSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('priority')
    }
  })

  it('should default status to active', () => {
    const data = {
      service_type_id: '123e4567-e89b-12d3-a456-426614174000',
    }

    const result = companyServiceSchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('active')
    }
  })

  it('should accept all valid status values', () => {
    const statuses = ['active', 'inactive', 'suspended'] as const

    statuses.forEach(status => {
      const result = companyServiceSchema.safeParse({
        service_type_id: '123e4567-e89b-12d3-a456-426614174000',
        status,
      })
      expect(result.success).toBe(true)
    })
  })

  it('should accept all valid priority values', () => {
    const priorities = ['low', 'medium', 'high'] as const

    priorities.forEach(priority => {
      const result = companyServiceSchema.safeParse({
        service_type_id: '123e4567-e89b-12d3-a456-426614174000',
        priority,
      })
      expect(result.success).toBe(true)
    })
  })

  it('should reject invalid assigned_inspector_id UUID', () => {
    const data = {
      service_type_id: '123e4567-e89b-12d3-a456-426614174000',
      assigned_inspector_id: 'not-a-uuid',
    }

    const result = companyServiceSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('assigned_inspector_id')
    }
  })

  it('should reject notes that are too long', () => {
    const data = {
      service_type_id: '123e4567-e89b-12d3-a456-426614174000',
      notes: 'A'.repeat(1001),
    }

    const result = companyServiceSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('notes')
    }
  })

  it('should accept nullable optional fields', () => {
    const data = {
      service_type_id: '123e4567-e89b-12d3-a456-426614174000',
      inspection_frequency_days: null,
      priority: null,
      assigned_inspector_id: null,
      notes: null,
    }

    const result = companyServiceSchema.safeParse(data)
    expect(result.success).toBe(true)
  })
})
