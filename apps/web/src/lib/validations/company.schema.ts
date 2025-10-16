/**
 * Company validation schemas
 */

import { z } from 'zod'

// Base company schema
export const companyBaseSchema = z.object({
  name: z.string()
    .min(2, 'Company name must be at least 2 characters')
    .max(200, 'Company name must be less than 200 characters')
    .transform(val => val.trim()),
    
  address: z.string()
    .min(5, 'Address must be at least 5 characters')
    .max(500, 'Address must be less than 500 characters')
    .transform(val => val.trim()),
    
  lat: z.number()
    .min(-90, 'Invalid latitude')
    .max(90, 'Invalid latitude')
    .optional(),
    
  lng: z.number()
    .min(-180, 'Invalid longitude')
    .max(180, 'Invalid longitude')
    .optional(),
    
  type: z.enum(['commercial', 'residential', 'industrial', 'healthcare', 'education'])
    .optional(),
    
  priority: z.enum(['high', 'medium', 'low'])
    .default('medium'),
    
  contact_person: z.string()
    .max(100, 'Contact person name too long')
    .optional()
    .transform(val => val?.trim()),
    
  contact_phone: z.string()
    .regex(/^[+]?[\d\s()-]+$/, 'Invalid phone number format')
    .optional()
    .transform(val => val?.trim()),
    
  contact_email: z.string()
    .email('Invalid email address')
    .optional()
    .transform(val => val?.trim()),
    
  notes: z.string()
    .max(1000, 'Notes too long')
    .optional()
    .transform(val => val?.trim()),
})

// Create company schema
export const createCompanySchema = companyBaseSchema

// Update company schema
export const updateCompanySchema = companyBaseSchema.partial()

// Bulk update schema
export const bulkUpdateCompaniesSchema = z.object({
  companyIds: z.array(z.string().uuid('Invalid company ID')),
  updates: updateCompanySchema,
})

// Search params schema
export const searchCompaniesSchema = z.object({
  query: z.string().optional(),
  type: z.enum(['commercial', 'residential', 'industrial', 'healthcare', 'education']).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  hasCoordinates: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
})

export type CompanyInput = z.infer<typeof createCompanySchema>
export type CompanyUpdate = z.infer<typeof updateCompanySchema>
export type CompanySearch = z.infer<typeof searchCompaniesSchema>
