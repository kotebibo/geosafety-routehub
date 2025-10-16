/**
 * Test Utilities and Helpers
 * 
 * Common utilities for writing tests
 */

import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'

// Mock data generators
export const mockCompany = (overrides = {}) => ({
  id: 'company-1',
  name: 'Test Company',
  address: '123 Test Street, Tbilisi',
  lat: 41.7151,
  lng: 44.8271,
  status: 'active',
  priority: 'medium',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

export const mockInspector = (overrides = {}) => ({
  id: 'inspector-1',
  email: 'inspector@test.com',
  full_name: 'Test Inspector',
  phone: '+995555123456',
  role: 'inspector',
  status: 'active',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

export const mockRoute = (overrides = {}) => ({
  id: 'route-1',
  name: 'Test Route',
  date: '2025-10-15',
  inspector_id: 'inspector-1',
  status: 'planned',
  start_time: '09:00',
  total_distance_km: 25.5,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

export const mockRouteStop = (overrides = {}) => ({
  id: 'stop-1',
  route_id: 'route-1',
  company_id: 'company-1',
  position: 1,
  status: 'pending',
  scheduled_arrival_time: '09:30',
  ...overrides,
})

export const mockUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'user@test.com',
  role: 'admin',
  ...overrides,
})

export const mockSession = (overrides = {}) => ({
  access_token: 'mock-token',
  refresh_token: 'mock-refresh-token',
  user: mockUser(),
  ...overrides,
})

// Custom render function with providers
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, {
    ...options,
  })
}

// Wait utilities
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Mock Supabase response
export const mockSupabaseResponse = (data: any, error: any = null) => ({
  data,
  error,
  count: null,
  status: error ? 400 : 200,
  statusText: error ? 'Bad Request' : 'OK',
})

// Mock Supabase error
export const mockSupabaseError = (message: string, code: string = 'PGRST') => ({
  message,
  code,
  details: null,
  hint: null,
})
