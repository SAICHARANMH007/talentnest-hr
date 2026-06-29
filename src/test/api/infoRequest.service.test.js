import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('../../api/client.js', () => ({ req: vi.fn() }))
import { infoRequestService } from '../../api/services/infoRequest.service.js'
import { req } from '../../api/client.js'

describe('infoRequestService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('requestInfo', () => {
    it('calls correct endpoint with userId', async () => {
      req.mockResolvedValue({ success: true })
      await infoRequestService.requestInfo('user-123')
      expect(req).toHaveBeenCalledWith('POST', '/info-requests/request/user-123', {})
    })

    it('uses POST method', async () => {
      req.mockResolvedValue({})
      await infoRequestService.requestInfo('abc')
      expect(req).toHaveBeenCalledWith('POST', expect.stringContaining('/info-requests/request/'), {})
    })

    it('passes an empty body object', async () => {
      req.mockResolvedValue({})
      await infoRequestService.requestInfo('user-456')
      const [, , body] = req.mock.calls[0]
      expect(body).toEqual({})
    })

    it('returns the response value', async () => {
      const mockData = { requestId: 'req-1', status: 'pending' }
      req.mockResolvedValue(mockData)
      const result = await infoRequestService.requestInfo('user-123')
      expect(result).toEqual(mockData)
    })

    it('propagates errors', async () => {
      req.mockRejectedValue(new Error('Request already sent'))
      await expect(infoRequestService.requestInfo('user-123')).rejects.toThrow('Request already sent')
    })
  })

  describe('getIncomingInfoRequests', () => {
    it('calls correct endpoint', async () => {
      req.mockResolvedValue([])
      await infoRequestService.getIncomingInfoRequests()
      expect(req).toHaveBeenCalledWith('GET', '/info-requests/incoming')
    })

    it('uses GET method', async () => {
      req.mockResolvedValue([])
      await infoRequestService.getIncomingInfoRequests()
      expect(req).toHaveBeenCalledWith('GET', expect.stringContaining('/info-requests/incoming'))
    })

    it('returns the response value', async () => {
      const mockData = [{ id: 'req-1', fromUser: 'Alice' }, { id: 'req-2', fromUser: 'Bob' }]
      req.mockResolvedValue(mockData)
      const result = await infoRequestService.getIncomingInfoRequests()
      expect(result).toEqual(mockData)
    })

    it('returns an empty array when there are no incoming requests', async () => {
      req.mockResolvedValue([])
      const result = await infoRequestService.getIncomingInfoRequests()
      expect(result).toEqual([])
    })

    it('propagates errors', async () => {
      req.mockRejectedValue(new Error('Unauthorized'))
      await expect(infoRequestService.getIncomingInfoRequests()).rejects.toThrow('Unauthorized')
    })
  })

  describe('getSentInfoRequests', () => {
    it('calls correct endpoint', async () => {
      req.mockResolvedValue([])
      await infoRequestService.getSentInfoRequests()
      expect(req).toHaveBeenCalledWith('GET', '/info-requests/sent')
    })

    it('uses GET method', async () => {
      req.mockResolvedValue([])
      await infoRequestService.getSentInfoRequests()
      expect(req).toHaveBeenCalledWith('GET', expect.stringContaining('/info-requests/sent'))
    })

    it('returns the response value', async () => {
      const mockData = [{ id: 'req-3', toUser: 'Carol', status: 'pending' }]
      req.mockResolvedValue(mockData)
      const result = await infoRequestService.getSentInfoRequests()
      expect(result).toEqual(mockData)
    })

    it('returns an empty array when there are no sent requests', async () => {
      req.mockResolvedValue([])
      const result = await infoRequestService.getSentInfoRequests()
      expect(result).toEqual([])
    })

    it('propagates errors', async () => {
      req.mockRejectedValue(new Error('Server error'))
      await expect(infoRequestService.getSentInfoRequests()).rejects.toThrow('Server error')
    })
  })

  describe('getInfoRequestStatus', () => {
    it('calls correct endpoint with userId', async () => {
      req.mockResolvedValue({ status: 'pending' })
      await infoRequestService.getInfoRequestStatus('user-789')
      expect(req).toHaveBeenCalledWith('GET', '/info-requests/status/user-789')
    })

    it('uses GET method', async () => {
      req.mockResolvedValue({})
      await infoRequestService.getInfoRequestStatus('user-x')
      expect(req).toHaveBeenCalledWith('GET', expect.stringContaining('/info-requests/status/'))
    })

    it('interpolates userId correctly into the URL', async () => {
      req.mockResolvedValue({})
      await infoRequestService.getInfoRequestStatus('abc-def-123')
      expect(req).toHaveBeenCalledWith('GET', '/info-requests/status/abc-def-123')
    })

    it('returns the response value', async () => {
      const mockData = { status: 'accepted', requestId: 'req-7' }
      req.mockResolvedValue(mockData)
      const result = await infoRequestService.getInfoRequestStatus('user-789')
      expect(result).toEqual(mockData)
    })

    it('propagates errors', async () => {
      req.mockRejectedValue(new Error('User not found'))
      await expect(infoRequestService.getInfoRequestStatus('user-789')).rejects.toThrow('User not found')
    })
  })

  describe('acceptInfoRequest', () => {
    it('calls correct endpoint with requestId', async () => {
      req.mockResolvedValue({ success: true })
      await infoRequestService.acceptInfoRequest('req-456')
      expect(req).toHaveBeenCalledWith('POST', '/info-requests/accept/req-456', {})
    })

    it('uses POST method', async () => {
      req.mockResolvedValue({})
      await infoRequestService.acceptInfoRequest('req-1')
      expect(req).toHaveBeenCalledWith('POST', expect.stringContaining('/info-requests/accept/'), {})
    })

    it('passes an empty body object', async () => {
      req.mockResolvedValue({})
      await infoRequestService.acceptInfoRequest('req-456')
      const [, , body] = req.mock.calls[0]
      expect(body).toEqual({})
    })

    it('interpolates requestId correctly into the URL', async () => {
      req.mockResolvedValue({})
      await infoRequestService.acceptInfoRequest('xyz-999')
      expect(req).toHaveBeenCalledWith('POST', '/info-requests/accept/xyz-999', {})
    })

    it('returns the response value', async () => {
      const mockData = { status: 'accepted', requestId: 'req-456' }
      req.mockResolvedValue(mockData)
      const result = await infoRequestService.acceptInfoRequest('req-456')
      expect(result).toEqual(mockData)
    })

    it('propagates errors', async () => {
      req.mockRejectedValue(new Error('Request not found'))
      await expect(infoRequestService.acceptInfoRequest('req-456')).rejects.toThrow('Request not found')
    })
  })

  describe('declineInfoRequest', () => {
    it('calls correct endpoint with requestId', async () => {
      req.mockResolvedValue({ success: true })
      await infoRequestService.declineInfoRequest('req-789')
      expect(req).toHaveBeenCalledWith('POST', '/info-requests/decline/req-789', {})
    })

    it('uses POST method', async () => {
      req.mockResolvedValue({})
      await infoRequestService.declineInfoRequest('req-2')
      expect(req).toHaveBeenCalledWith('POST', expect.stringContaining('/info-requests/decline/'), {})
    })

    it('passes an empty body object', async () => {
      req.mockResolvedValue({})
      await infoRequestService.declineInfoRequest('req-789')
      const [, , body] = req.mock.calls[0]
      expect(body).toEqual({})
    })

    it('interpolates requestId correctly into the URL', async () => {
      req.mockResolvedValue({})
      await infoRequestService.declineInfoRequest('abc-111')
      expect(req).toHaveBeenCalledWith('POST', '/info-requests/decline/abc-111', {})
    })

    it('returns the response value', async () => {
      const mockData = { status: 'declined', requestId: 'req-789' }
      req.mockResolvedValue(mockData)
      const result = await infoRequestService.declineInfoRequest('req-789')
      expect(result).toEqual(mockData)
    })

    it('propagates errors', async () => {
      req.mockRejectedValue(new Error('Request already processed'))
      await expect(infoRequestService.declineInfoRequest('req-789')).rejects.toThrow('Request already processed')
    })
  })
})
