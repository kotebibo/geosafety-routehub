import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockRpc = vi.fn()

vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}))

import { announcementsService } from '@/services/announcements.service'

describe('announcementsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAll', () => {
    it('should return announcements from rpc', async () => {
      const mockAnnouncements = [
        { id: '1', title: 'Announcement 1', content: 'Content 1' },
        { id: '2', title: 'Announcement 2', content: 'Content 2' },
      ]
      mockRpc.mockResolvedValue({ data: mockAnnouncements, error: null })

      const result = await announcementsService.getAll()

      expect(mockRpc).toHaveBeenCalledWith('get_announcements_with_read_status')
      expect(result).toEqual(mockAnnouncements)
    })

    it('should return empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })

      const result = await announcementsService.getAll()

      expect(result).toEqual([])
    })

    it('should throw on error', async () => {
      const mockError = { message: 'Database error', code: '500' }
      mockRpc.mockResolvedValue({ data: null, error: mockError })

      await expect(announcementsService.getAll()).rejects.toEqual(mockError)
    })
  })

  describe('getById', () => {
    it('should return an announcement by id', async () => {
      const mockAnnouncement = { id: 'abc-123', title: 'Test', content: 'Body' }
      const mockSingle = vi.fn().mockResolvedValue({ data: mockAnnouncement, error: null })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ select: mockSelect })

      const result = await announcementsService.getById('abc-123')

      expect(mockFrom).toHaveBeenCalledWith('announcements')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq).toHaveBeenCalledWith('id', 'abc-123')
      expect(result).toEqual(mockAnnouncement)
    })

    it('should return null when error code is PGRST116 (not found)', async () => {
      const notFoundError = { message: 'Not found', code: 'PGRST116' }
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: notFoundError })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ select: mockSelect })

      const result = await announcementsService.getById('nonexistent')

      expect(result).toBeNull()
    })

    it('should throw for other error codes', async () => {
      const serverError = { message: 'Server error', code: '500' }
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: serverError })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ select: mockSelect })

      await expect(announcementsService.getById('abc-123')).rejects.toEqual(serverError)
    })
  })

  describe('getUnreadCount', () => {
    it('should return unread count from rpc', async () => {
      mockRpc.mockResolvedValue({ data: 5, error: null })

      const result = await announcementsService.getUnreadCount()

      expect(mockRpc).toHaveBeenCalledWith('get_unread_announcements_count')
      expect(result).toBe(5)
    })

    it('should return 0 when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })

      const result = await announcementsService.getUnreadCount()

      expect(result).toBe(0)
    })

    it('should throw on error', async () => {
      const mockError = { message: 'RPC error', code: '500' }
      mockRpc.mockResolvedValue({ data: null, error: mockError })

      await expect(announcementsService.getUnreadCount()).rejects.toEqual(mockError)
    })
  })

  describe('markAsRead', () => {
    it('should call rpc with correct announcement id', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null })

      const result = await announcementsService.markAsRead('ann-456')

      expect(mockRpc).toHaveBeenCalledWith('mark_announcement_read', {
        p_announcement_id: 'ann-456',
      })
      expect(result).toBe(true)
    })

    it('should return true when rpc returns null data', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })

      const result = await announcementsService.markAsRead('ann-789')

      expect(result).toBe(true)
    })

    it('should throw on error', async () => {
      const mockError = { message: 'RPC failed', code: '500' }
      mockRpc.mockResolvedValue({ data: null, error: mockError })

      await expect(announcementsService.markAsRead('ann-456')).rejects.toEqual(mockError)
    })
  })
})
