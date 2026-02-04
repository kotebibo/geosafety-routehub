/**
 * Validation Schemas Index
 * 
 * Exports all validation schemas for easy importing
 */

export * from './route.schema'
export * from './inspector.schema'
export * from './company.schema'
export * from './service-type.schema'

// Re-export zod for convenience
export { z } from 'zod'
