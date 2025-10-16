import { describe, it, expect } from 'vitest'
import { 
  createCompanySchema,
  updateCompanySchema,
  searchCompaniesSchema
} from '@/lib/validations/company.schema'

describe('Company Validation Schemas', () => {
  describe('createCompanySchema', () => {
    it('should validate valid company data', () => {
      const validData = {
        name: 'Test Company',
        address: '123 Test Street, Tbilisi',
        lat: 41.7151,
        lng: 44.8271,
        type: 'commercial' as const,
        priority: 'medium' as const,
        contact_person: 'John Doe',
        contact_phone: '+995555123456',
        contact_email: 'john@example.com',
        notes: 'Test notes'
      }

      const result = createCompanySchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid company name', () => {
      const invalidData = {
        name: 'A', // Too short
        address: '123 Test Street'
      }

      const result = createCompanySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 2 characters')
      }
    })

    it('should reject invalid coordinates', () => {
      const invalidData = {
        name: 'Test Company',
        address: '123 Test Street',
        lat: 91, // Invalid latitude (> 90)
        lng: 44.8271
      }

      const result = createCompanySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should validate email format', () => {
      const invalidData = {
        name: 'Test Company',
        address: '123 Test Street',
        contact_email: 'notanemail'
      }

      const result = createCompanySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should trim whitespace from strings', () => {
      const dataWithWhitespace = {
        name: '  Test Company  ',
        address: '  123 Test Street  ',
        contact_person: '  John Doe  '
      }

      const result = createCompanySchema.safeParse(dataWithWhitespace)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Test Company')
        expect(result.data.address).toBe('123 Test Street')
        expect(result.data.contact_person).toBe('John Doe')
      }
    })
  })

  describe('searchCompaniesSchema', () => {
    it('should validate search parameters', () => {
      const validSearch = {
        query: 'test',
        type: 'commercial' as const,
        priority: 'high' as const,
        hasCoordinates: true,
        page: 1,
        limit: 20
      }

      const result = searchCompaniesSchema.safeParse(validSearch)
      expect(result.success).toBe(true)
    })

    it('should apply default values', () => {
      const emptySearch = {}
      const result = searchCompaniesSchema.safeParse(emptySearch)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(20)
      }
    })

    it('should reject invalid page number', () => {
      const invalidSearch = {
        page: 0 // Must be positive
      }

      const result = searchCompaniesSchema.safeParse(invalidSearch)
      expect(result.success).toBe(false)
    })

    it('should limit max results per page', () => {
      const invalidSearch = {
        limit: 200 // Max is 100
      }

      const result = searchCompaniesSchema.safeParse(invalidSearch)
      expect(result.success).toBe(false)
    })
  })
})
