import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockRpc = vi.fn()

vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}))

import { inspectorsService } from '@/services/inspectors.service'

describe('inspectorsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAll', () => {
    it('should return all inspectors including inactive by default', async () => {
      const mockInspectors = [
        { id: '1', full_name: 'Alice', status: 'active' },
        { id: '2', full_name: 'Bob', status: 'inactive' },
      ]
      const mockOrder = vi.fn().mockResolvedValue({ data: mockInspectors, error: null })
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })
      mockFrom.mockReturnValue({ select: mockSelect })

      const result = await inspectorsService.getAll()

      expect(mockFrom).toHaveBeenCalledWith('inspectors')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockOrder).toHaveBeenCalledWith('full_name')
      expect(result).toEqual(mockInspectors)
    })

    it('should filter by active status when includeInactive is false', async () => {
      const mockInspectors = [{ id: '1', full_name: 'Alice', status: 'active' }]
      const mockOrder = vi.fn().mockResolvedValue({ data: mockInspectors, error: null })
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ select: mockSelect })

      const result = await inspectorsService.getAll(false)

      expect(mockFrom).toHaveBeenCalledWith('inspectors')
      expect(mockEq).toHaveBeenCalledWith('status', 'active')
      expect(mockOrder).toHaveBeenCalledWith('full_name')
      expect(result).toEqual(mockInspectors)
    })

    it('should throw on error', async () => {
      const mockError = { message: 'Database error', code: '500' }
      const mockOrder = vi.fn().mockResolvedValue({ data: null, error: mockError })
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })
      mockFrom.mockReturnValue({ select: mockSelect })

      await expect(inspectorsService.getAll()).rejects.toEqual(mockError)
    })
  })

  describe('getActive', () => {
    it('should return only active inspectors', async () => {
      const mockActive = [
        { id: '1', full_name: 'Alice', status: 'active' },
        { id: '3', full_name: 'Charlie', status: 'active' },
      ]
      const mockOrder = vi.fn().mockResolvedValue({ data: mockActive, error: null })
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ select: mockSelect })

      const result = await inspectorsService.getActive()

      expect(mockFrom).toHaveBeenCalledWith('inspectors')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq).toHaveBeenCalledWith('status', 'active')
      expect(mockOrder).toHaveBeenCalledWith('full_name')
      expect(result).toEqual(mockActive)
    })

    it('should throw on error', async () => {
      const mockError = { message: 'Query failed', code: '500' }
      const mockOrder = vi.fn().mockResolvedValue({ data: null, error: mockError })
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ select: mockSelect })

      await expect(inspectorsService.getActive()).rejects.toEqual(mockError)
    })
  })

  describe('getById', () => {
    it('should return a single inspector by id', async () => {
      const mockInspector = { id: 'insp-1', full_name: 'Alice', status: 'active' }
      const mockSingle = vi.fn().mockResolvedValue({ data: mockInspector, error: null })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ select: mockSelect })

      const result = await inspectorsService.getById('insp-1')

      expect(mockFrom).toHaveBeenCalledWith('inspectors')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq).toHaveBeenCalledWith('id', 'insp-1')
      expect(result).toEqual(mockInspector)
    })

    it('should throw on error', async () => {
      const mockError = { message: 'Not found', code: 'PGRST116' }
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ select: mockSelect })

      await expect(inspectorsService.getById('nonexistent')).rejects.toEqual(mockError)
    })
  })

  describe('create', () => {
    it('should create an inspector and return the result', async () => {
      const inputData = {
        full_name: 'Dave Inspector',
        email: 'dave@example.com',
        phone: '+995555111222',
        specialty: 'fire_safety',
        status: 'active' as const,
      }
      const createdInspector = { id: 'new-insp-1', ...inputData }
      const mockSingle = vi.fn().mockResolvedValue({ data: createdInspector, error: null })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
      mockFrom.mockReturnValue({ insert: mockInsert })

      const result = await inspectorsService.create(inputData)

      expect(mockFrom).toHaveBeenCalledWith('inspectors')
      expect(mockInsert).toHaveBeenCalledWith(inputData)
      expect(result).toEqual(createdInspector)
    })

    it('should throw on error', async () => {
      const mockError = { message: 'Duplicate email', code: '23505' }
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
      mockFrom.mockReturnValue({ insert: mockInsert })

      await expect(
        inspectorsService.create({
          full_name: 'Dup',
          email: 'dup@test.com',
          phone: '123',
          specialty: 'fire_safety',
          status: 'active',
        })
      ).rejects.toEqual(mockError)
    })
  })

  describe('update', () => {
    it('should update an inspector and return the result', async () => {
      const updates = { full_name: 'Updated Name' }
      const updatedInspector = { id: 'insp-1', full_name: 'Updated Name', status: 'active' }
      const mockSingle = vi.fn().mockResolvedValue({ data: updatedInspector, error: null })
      const mockSelectAfter = vi.fn().mockReturnValue({ single: mockSingle })
      const mockEq = vi.fn().mockReturnValue({ select: mockSelectAfter })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ update: mockUpdate })

      const result = await inspectorsService.update('insp-1', updates)

      expect(mockFrom).toHaveBeenCalledWith('inspectors')
      expect(mockUpdate).toHaveBeenCalledWith(updates)
      expect(mockEq).toHaveBeenCalledWith('id', 'insp-1')
      expect(result).toEqual(updatedInspector)
    })
  })

  describe('delete', () => {
    it('should delete an inspector by id', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null })
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ delete: mockDelete })

      await inspectorsService.delete('insp-1')

      expect(mockFrom).toHaveBeenCalledWith('inspectors')
      expect(mockEq).toHaveBeenCalledWith('id', 'insp-1')
    })

    it('should throw on error', async () => {
      const mockError = { message: 'FK constraint', code: '23503' }
      const mockEq = vi.fn().mockResolvedValue({ error: mockError })
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ delete: mockDelete })

      await expect(inspectorsService.delete('insp-1')).rejects.toEqual(mockError)
    })
  })
})
