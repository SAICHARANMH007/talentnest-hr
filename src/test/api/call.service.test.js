import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('../../api/client.js', () => ({ req: vi.fn() }))
import { callService } from '../../api/services/call.service.js'
import { req } from '../../api/client.js'

describe('callService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('getCallThread', () => {
    it('calls correct endpoint with userId', async () => {
      req.mockResolvedValue({ data: [] })
      await callService.getCallThread('user-123')
      expect(req).toHaveBeenCalledWith('GET', '/calls/thread/user-123')
    })

    it('returns data array when response has array data', async () => {
      const mockData = [
        { id: 'call-1', duration: 120, status: 'completed' },
        { id: 'call-2', duration: 60, status: 'missed' },
      ]
      req.mockResolvedValue({ data: mockData })
      const result = await callService.getCallThread('user-abc')
      expect(result).toEqual(mockData)
    })

    it('returns empty array when response data is not an array', async () => {
      req.mockResolvedValue({ data: null })
      const result = await callService.getCallThread('user-456')
      expect(result).toEqual([])
    })

    it('returns empty array when response data is an object', async () => {
      req.mockResolvedValue({ data: { id: 'call-1' } })
      const result = await callService.getCallThread('user-789')
      expect(result).toEqual([])
    })

    it('returns empty array when response is null', async () => {
      req.mockResolvedValue(null)
      const result = await callService.getCallThread('user-000')
      expect(result).toEqual([])
    })

    it('returns empty array when response is undefined', async () => {
      req.mockResolvedValue(undefined)
      const result = await callService.getCallThread('user-001')
      expect(result).toEqual([])
    })

    it('returns empty array when response has no data property', async () => {
      req.mockResolvedValue({})
      const result = await callService.getCallThread('user-002')
      expect(result).toEqual([])
    })

    it('propagates userId as part of URL path correctly', async () => {
      req.mockResolvedValue({ data: [] })
      await callService.getCallThread('special-user-id')
      expect(req).toHaveBeenCalledWith('GET', '/calls/thread/special-user-id')
    })

    it('returns the resolved value from req', async () => {
      const mockData = [{ id: 'call-99', type: 'inbound' }]
      req.mockResolvedValue({ data: mockData })
      const result = await callService.getCallThread('user-xyz')
      expect(result).toBe(mockData)
    })

    it('propagates error when req rejects', async () => {
      req.mockRejectedValue(new Error('Network error'))
      await expect(callService.getCallThread('user-err')).rejects.toThrow('Network error')
    })
  })
})
