/**
 * Service Type Validation Schemas
 *
 * Validates service type data for API operations
 */

import { z } from 'zod'

// Create service type schema
export const createServiceTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  name_ka: z.string().min(1, 'Georgian name is required').max(100, 'Georgian name is too long'),
  description: z.string().max(500, 'Description is too long').optional().nullable(),
  description_ka: z.string().max(500, 'Georgian description is too long').optional().nullable(),
  required_inspector_type: z.string().max(50).optional().nullable(),
  default_frequency_days: z.number().int().min(1).max(365).optional().nullable(),
  regulatory_requirement: z.boolean().optional().default(false),
  is_active: z.boolean().optional().default(true),
  sort_order: z.number().int().min(0).optional().nullable(),
})

// Update service type schema (all fields optional)
export const updateServiceTypeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  name_ka: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  description_ka: z.string().max(500).optional().nullable(),
  required_inspector_type: z.string().max(50).optional().nullable(),
  default_frequency_days: z.number().int().min(1).max(365).optional().nullable(),
  regulatory_requirement: z.boolean().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional().nullable(),
})

// Company service schema
export const companyServiceSchema = z.object({
  service_type_id: z.string().uuid('Invalid service type ID'),
  inspection_frequency_days: z.number().int().min(1).max(365).optional().nullable(),
  priority: z.enum(['low', 'medium', 'high']).optional().nullable(),
  status: z.enum(['active', 'inactive', 'suspended']).optional().default('active'),
  assigned_inspector_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
})

// Update company services request schema
export const updateCompanyServicesSchema = z.object({
  companyId: z.string().uuid('Invalid company ID'),
  services: z.array(companyServiceSchema),
})

export type CreateServiceTypeInput = z.infer<typeof createServiceTypeSchema>
export type UpdateServiceTypeInput = z.infer<typeof updateServiceTypeSchema>
export type CompanyServiceInput = z.infer<typeof companyServiceSchema>
export type UpdateCompanyServicesInput = z.infer<typeof updateCompanyServicesSchema>
