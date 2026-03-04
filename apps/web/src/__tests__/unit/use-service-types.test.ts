import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const mockFrom = vi.fn()

vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

import { useServiceTypes } from '@/hooks/useServiceTypes'

describe('useServiceTypes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should start with loading true and empty serviceTypes', () => {
    // Set up a mock that never resolves to keep loading state
    const mockOrder = vi.fn().mockReturnValue(new Promise(() => {}))
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })

    const { result } = renderHook(() => useServiceTypes())

    expect(result.current.loading).toBe(true)
    expect(result.current.serviceTypes).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('should fetch service types on mount', async () => {
    const mockServiceTypes = [
      { id: '1', name: 'Fire Safety', name_ka: 'ხანძარი', is_active: true },
      { id: '2', name: 'Gas Inspection', name_ka: 'გაზი', is_active: true },
    ]
    const mockOrder = vi.fn().mockResolvedValue({ data: mockServiceTypes, error: null })
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })

    const { result } = renderHook(() => useServiceTypes())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.serviceTypes).toEqual(mockServiceTypes)
    expect(result.current.error).toBeNull()
    expect(mockFrom).toHaveBeenCalledWith('service_types')
    expect(mockSelect).toHaveBeenCalledWith('*')
    expect(mockEq).toHaveBeenCalledWith('is_active', true)
    expect(mockOrder).toHaveBeenCalledWith('name', { ascending: true })
  })

  it('should handle errors and set error state', async () => {
    const mockError = new Error('Failed to fetch service types')
    const mockOrder = vi.fn().mockResolvedValue({ data: null, error: mockError })
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })

    const { result } = renderHook(() => useServiceTypes())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toEqual(mockError)
    expect(result.current.serviceTypes).toEqual([])
  })

  it('should return empty array when data is null', async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: null, error: null })
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })

    const { result } = renderHook(() => useServiceTypes())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.serviceTypes).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('should expose a refresh function', async () => {
    const mockServiceTypes = [{ id: '1', name: 'Fire Safety', name_ka: 'ხანძარი', is_active: true }]
    const mockOrder = vi.fn().mockResolvedValue({ data: mockServiceTypes, error: null })
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })

    const { result } = renderHook(() => useServiceTypes())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(typeof result.current.refresh).toBe('function')

    // Call refresh to trigger a re-fetch
    const updatedTypes = [
      { id: '1', name: 'Fire Safety', name_ka: 'ხანძარი', is_active: true },
      { id: '3', name: 'Elevator', name_ka: 'ლიფტი', is_active: true },
    ]
    const mockOrder2 = vi.fn().mockResolvedValue({ data: updatedTypes, error: null })
    const mockEq2 = vi.fn().mockReturnValue({ order: mockOrder2 })
    const mockSelect2 = vi.fn().mockReturnValue({ eq: mockEq2 })
    mockFrom.mockReturnValue({ select: mockSelect2 })

    await result.current.refresh()

    await waitFor(() => {
      expect(result.current.serviceTypes).toEqual(updatedTypes)
    })
  })
})
