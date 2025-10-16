/**
 * Inspector Validation Schemas
 * 
 * Zod schemas for validating inspector-related data
 */

import { z } from 'zod'

// Phone number regex (Georgian format)
const phoneRegex = /^(\+995|995)?[0-9]{9}$/

// Create inspector schema
export const createInspectorSchema = z.object({
  user_id: z.string().uuid('Invalid user ID').optional(),
  
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  
  phone: z.string()
    .regex(phoneRegex, 'Invalid Georgian phone number (format: +995XXXXXXXXX)')
    .optional(),
  
  email: z.string()
    .email('Invalid email address')
    .optional(),
  
  is_active: z.boolean().default(true),
  
  vehicle_type: z.string()
    .max(50, 'Vehicle type must be less than 50 characters')
    .optional(),
  
  license_plate: z.string()
    .max(20, 'License plate must be less than 20 characters')
    .optional(),
  
  notes: z.string()
    .max(500, 'Notes must be less than 500 characters')
    .optional(),
})

// Update inspector schema (partial)
export const updateInspectorSchema = createInspectorSchema.partial()

// Types derived from schemas
export type CreateInspectorInput = z.infer<typeof createInspectorSchema>
export type UpdateInspectorInput = z.infer<typeof updateInspectorSchema>
