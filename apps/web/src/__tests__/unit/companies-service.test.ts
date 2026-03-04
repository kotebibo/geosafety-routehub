import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockRpc = vi.fn()

vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}))

import { companiesService } from '@/services/companies.service'

describe('companiesService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAll', () => {
    it('should return all companies ordered by name', async () => {
      const mockCompanies = [
        { id: '1', name: 'Alpha Corp', address: '123 Main St' },
        { id: '2', name: 'Beta LLC', address: '456 Oak Ave' },
      ]
      const mockOrder = vi.fn().mockResolvedValue({ data: mockCompanies, error: null })
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })
      mockFrom.mockReturnValue({ select: mockSelect })

      const result = await companiesService.getAll()

      expect(mockFrom).toHaveBeenCalledWith('companies')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockOrder).toHaveBeenCalledWith('name')
      expect(result).toEqual(mockCompanies)
    })

    it('should throw on error', async () => {
      const mockError = { message: 'Database error', code: '500' }
      const mockOrder = vi.fn().mockResolvedValue({ data: null, error: mockError })
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })
      mockFrom.mockReturnValue({ select: mockSelect })

      await expect(companiesService.getAll()).rejects.toEqual(mockError)
    })
  })

  describe('getById', () => {
    it('should return a single company by id', async () => {
      const mockCompany = { id: 'comp-1', name: 'Test Co', address: '789 Pine' }
      const mockSingle = vi.fn().mockResolvedValue({ data: mockCompany, error: null })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ select: mockSelect })

      const result = await companiesService.getById('comp-1')

      expect(mockFrom).toHaveBeenCalledWith('companies')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq).toHaveBeenCalledWith('id', 'comp-1')
      expect(result).toEqual(mockCompany)
    })

    it('should throw on error', async () => {
      const mockError = { message: 'Not found', code: 'PGRST116' }
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ select: mockSelect })

      await expect(companiesService.getById('nonexistent')).rejects.toEqual(mockError)
    })
  })

  describe('create', () => {
    it('should create a company and return the result', async () => {
      const inputData = { name: 'New Company', address: '100 New St' }
      const createdCompany = { id: 'new-1', ...inputData }
      const mockSingle = vi.fn().mockResolvedValue({ data: createdCompany, error: null })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
      mockFrom.mockReturnValue({ insert: mockInsert })

      const result = await companiesService.create(inputData)

      expect(mockFrom).toHaveBeenCalledWith('companies')
      expect(mockInsert).toHaveBeenCalledWith({ ...inputData, address: inputData.address })
      expect(result).toEqual(createdCompany)
    })

    it('should default address to empty string when not provided', async () => {
      const inputData = { name: 'No Address Co' }
      const createdCompany = { id: 'new-2', name: 'No Address Co', address: '' }
      const mockSingle = vi.fn().mockResolvedValue({ data: createdCompany, error: null })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
      mockFrom.mockReturnValue({ insert: mockInsert })

      await companiesService.create(inputData)

      expect(mockInsert).toHaveBeenCalledWith({ name: 'No Address Co', address: '' })
    })

    it('should throw on error', async () => {
      const mockError = { message: 'Duplicate name', code: '23505' }
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
      mockFrom.mockReturnValue({ insert: mockInsert })

      await expect(companiesService.create({ name: 'Dup Co' })).rejects.toEqual(mockError)
    })
  })

  describe('update', () => {
    it('should update a company and return the result', async () => {
      const updates = { name: 'Updated Name' }
      const updatedCompany = { id: 'comp-1', name: 'Updated Name', address: '123 St' }
      const mockSingle = vi.fn().mockResolvedValue({ data: updatedCompany, error: null })
      const mockSelectAfter = vi.fn().mockReturnValue({ single: mockSingle })
      const mockEq = vi.fn().mockReturnValue({ select: mockSelectAfter })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ update: mockUpdate })

      const result = await companiesService.update('comp-1', updates)

      expect(mockFrom).toHaveBeenCalledWith('companies')
      expect(mockUpdate).toHaveBeenCalledWith(updates)
      expect(mockEq).toHaveBeenCalledWith('id', 'comp-1')
      expect(result).toEqual(updatedCompany)
    })

    it('should throw on error', async () => {
      const mockError = { message: 'Update failed', code: '500' }
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError })
      const mockSelectAfter = vi.fn().mockReturnValue({ single: mockSingle })
      const mockEq = vi.fn().mockReturnValue({ select: mockSelectAfter })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ update: mockUpdate })

      await expect(companiesService.update('comp-1', { name: 'X' })).rejects.toEqual(mockError)
    })
  })

  describe('delete', () => {
    it('should delete a company by id', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null })
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ delete: mockDelete })

      await companiesService.delete('comp-1')

      expect(mockFrom).toHaveBeenCalledWith('companies')
      expect(mockEq).toHaveBeenCalledWith('id', 'comp-1')
    })

    it('should throw on error', async () => {
      const mockError = { message: 'FK constraint', code: '23503' }
      const mockEq = vi.fn().mockResolvedValue({ error: mockError })
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ delete: mockDelete })

      await expect(companiesService.delete('comp-1')).rejects.toEqual(mockError)
    })
  })
})
