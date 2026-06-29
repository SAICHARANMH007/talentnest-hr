import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('../../api/client.js', () => ({ req: vi.fn() }))
import { connectionService } from '../../api/services/connection.service.js'
import { req } from '../../api/client.js'

describe('connectionService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('getConnections', () => {
    it('calls correct endpoint', async () => {
      req.mockResolvedValue([])
      await connectionService.getConnections()
      expect(req).toHaveBeenCalledWith('GET', '/connections')
    })

    it('returns the response value', async () => {
      const mockData = [{ id: 1, name: 'Alice' }]
      req.mockResolvedValue(mockData)
      const result = await connectionService.getConnections()
      expect(result).toEqual(mockData)
    })

    it('propagates errors', async () => {
      req.mockRejectedValue(new Error('Network error'))
      await expect(connectionService.getConnections()).rejects.toThrow('Network error')
    })
  })

  describe('getPendingRequests', () => {
    it('calls correct endpoint', async () => {
      req.mockResolvedValue([])
      await connectionService.getPendingRequests()
      expect(req).toHaveBeenCalledWith('GET', '/connections/pending')
    })

    it('returns the response value', async () => {
      const mockData = [{ id: 2, fromUser: 'Bob' }]
      req.mockResolvedValue(mockData)
      const result = await connectionService.getPendingRequests()
      expect(result).toEqual(mockData)
    })

    it('propagates errors', async () => {
      req.mockRejectedValue(new Error('Unauthorized'))
      await expect(connectionService.getPendingRequests()).rejects.toThrow('Unauthorized')
    })
  })

  describe('getSentRequests', () => {
    it('calls correct endpoint', async () => {
      req.mockResolvedValue([])
      await connectionService.getSentRequests()
      expect(req).toHaveBeenCalledWith('GET', '/connections/sent')
    })

    it('returns the response value', async () => {
      const mockData = [{ id: 3, toUser: 'Carol' }]
      req.mockResolvedValue(mockData)
      const result = await connectionService.getSentRequests()
      expect(result).toEqual(mockData)
    })

    it('propagates errors', async () => {
      req.mockRejectedValue(new Error('Server error'))
      await expect(connectionService.getSentRequests()).rejects.toThrow('Server error')
    })
  })

  describe('getConnectionSuggestions', () => {
    it('calls correct endpoint', async () => {
      req.mockResolvedValue([])
      await connectionService.getConnectionSuggestions()
      expect(req).toHaveBeenCalledWith('GET', '/connections/suggestions')
    })

    it('returns the response value', async () => {
      const mockData = [{ id: 4, name: 'Dave' }, { id: 5, name: 'Eve' }]
      req.mockResolvedValue(mockData)
      const result = await connectionService.getConnectionSuggestions()
      expect(result).toEqual(mockData)
    })

    it('propagates errors', async () => {
      req.mockRejectedValue(new Error('Not found'))
      await expect(connectionService.getConnectionSuggestions()).rejects.toThrow('Not found')
    })
  })

  describe('searchPeople', () => {
    it('calls correct endpoint with encoded query', async () => {
      req.mockResolvedValue([])
      await connectionService.searchPeople('john doe')
      expect(req).toHaveBeenCalledWith('GET', '/connections/search?q=john%20doe')
    })

    it('encodes special characters in query', async () => {
      req.mockResolvedValue([])
      await connectionService.searchPeople('alice & bob')
      expect(req).toHaveBeenCalledWith('GET', '/connections/search?q=alice%20%26%20bob')
    })

    it('passes plain query without modification when no special chars', async () => {
      req.mockResolvedValue([])
      await connectionService.searchPeople('alice')
      expect(req).toHaveBeenCalledWith('GET', '/connections/search?q=alice')
    })

    it('returns the response value', async () => {
      const mockData = [{ id: 6, name: 'John Doe' }]
      req.mockResolvedValue(mockData)
      const result = await connectionService.searchPeople('john')
      expect(result).toEqual(mockData)
    })

    it('propagates errors', async () => {
      req.mockRejectedValue(new Error('Search failed'))
      await expect(connectionService.searchPeople('test')).rejects.toThrow('Search failed')
    })
  })

  describe('sendConnectionRequest', () => {
    it('calls correct endpoint with userId', async () => {
      req.mockResolvedValue({ success: true })
      await connectionService.sendConnectionRequest('user-123')
      expect(req).toHaveBeenCalledWith('POST', '/connections/request/user-123')
    })

    it('uses POST method', async () => {
      req.mockResolvedValue({})
      await connectionService.sendConnectionRequest('abc')
      expect(req).toHaveBeenCalledWith('POST', expect.stringContaining('/connections/request/'))
    })

    it('returns the response value', async () => {
      const mockData = { requestId: 'req-1', status: 'pending' }
      req.mockResolvedValue(mockData)
      const result = await connectionService.sendConnectionRequest('user-123')
      expect(result).toEqual(mockData)
    })

    it('propagates errors', async () => {
      req.mockRejectedValue(new Error('Already connected'))
      await expect(connectionService.sendConnectionRequest('user-123')).rejects.toThrow('Already connected')
    })
  })

  describe('acceptConnectionRequest', () => {
    it('calls correct endpoint with requestId', async () => {
      req.mockResolvedValue({ success: true })
      await connectionService.acceptConnectionRequest('req-456')
      expect(req).toHaveBeenCalledWith('POST', '/connections/accept/req-456')
    })

    it('uses POST method', async () => {
      req.mockResolvedValue({})
      await connectionService.acceptConnectionRequest('req-1')
      expect(req).toHaveBeenCalledWith('POST', expect.stringContaining('/connections/accept/'))
    })

    it('returns the response value', async () => {
      const mockData = { status: 'accepted' }
      req.mockResolvedValue(mockData)
      const result = await connectionService.acceptConnectionRequest('req-456')
      expect(result).toEqual(mockData)
    })

    it('propagates errors', async () => {
      req.mockRejectedValue(new Error('Request not found'))
      await expect(connectionService.acceptConnectionRequest('req-456')).rejects.toThrow('Request not found')
    })
  })

  describe('rejectConnectionRequest', () => {
    it('calls correct endpoint with requestId', async () => {
      req.mockResolvedValue({ success: true })
      await connectionService.rejectConnectionRequest('req-789')
      expect(req).toHaveBeenCalledWith('POST', '/connections/reject/req-789')
    })

    it('uses POST method', async () => {
      req.mockResolvedValue({})
      await connectionService.rejectConnectionRequest('req-2')
      expect(req).toHaveBeenCalledWith('POST', expect.stringContaining('/connections/reject/'))
    })

    it('returns the response value', async () => {
      const mockData = { status: 'rejected' }
      req.mockResolvedValue(mockData)
      const result = await connectionService.rejectConnectionRequest('req-789')
      expect(result).toEqual(mockData)
    })

    it('propagates errors', async () => {
      req.mockRejectedValue(new Error('Request expired'))
      await expect(connectionService.rejectConnectionRequest('req-789')).rejects.toThrow('Request expired')
    })
  })

  describe('removeConnection', () => {
    it('calls correct endpoint with userId', async () => {
      req.mockResolvedValue({ success: true })
      await connectionService.removeConnection('user-101')
      expect(req).toHaveBeenCalledWith('DELETE', '/connections/remove/user-101')
    })

    it('uses DELETE method', async () => {
      req.mockResolvedValue({})
      await connectionService.removeConnection('user-x')
      expect(req).toHaveBeenCalledWith('DELETE', expect.stringContaining('/connections/remove/'))
    })

    it('returns the response value', async () => {
      const mockData = { removed: true }
      req.mockResolvedValue(mockData)
      const result = await connectionService.removeConnection('user-101')
      expect(result).toEqual(mockData)
    })

    it('propagates errors', async () => {
      req.mockRejectedValue(new Error('Connection not found'))
      await expect(connectionService.removeConnection('user-101')).rejects.toThrow('Connection not found')
    })
  })

  describe('cancelConnectionRequest', () => {
    it('calls correct endpoint with requestId', async () => {
      req.mockResolvedValue({ success: true })
      await connectionService.cancelConnectionRequest('req-202')
      expect(req).toHaveBeenCalledWith('DELETE', '/connections/cancel/req-202')
    })

    it('uses DELETE method', async () => {
      req.mockResolvedValue({})
      await connectionService.cancelConnectionRequest('req-3')
      expect(req).toHaveBeenCalledWith('DELETE', expect.stringContaining('/connections/cancel/'))
    })

    it('returns the response value', async () => {
      const mockData = { cancelled: true }
      req.mockResolvedValue(mockData)
      const result = await connectionService.cancelConnectionRequest('req-202')
      expect(result).toEqual(mockData)
    })

    it('propagates errors', async () => {
      req.mockRejectedValue(new Error('Request already accepted'))
      await expect(connectionService.cancelConnectionRequest('req-202')).rejects.toThrow('Request already accepted')
    })
  })

  describe('syncContacts', () => {
    it('calls correct endpoint with contacts payload', async () => {
      req.mockResolvedValue({ synced: 3 })
      const contacts = [{ email: 'a@example.com' }, { email: 'b@example.com' }]
      await connectionService.syncContacts(contacts)
      expect(req).toHaveBeenCalledWith('POST', '/connections/sync-contacts', { contacts })
    })

    it('uses POST method', async () => {
      req.mockResolvedValue({})
      await connectionService.syncContacts([])
      expect(req).toHaveBeenCalledWith('POST', '/connections/sync-contacts', expect.any(Object))
    })

    it('passes contacts array correctly inside body', async () => {
      req.mockResolvedValue({})
      const contacts = [{ email: 'test@test.com', name: 'Test User' }]
      await connectionService.syncContacts(contacts)
      expect(req).toHaveBeenCalledWith('POST', '/connections/sync-contacts', { contacts })
    })

    it('works with empty contacts array', async () => {
      req.mockResolvedValue({ synced: 0 })
      await connectionService.syncContacts([])
      expect(req).toHaveBeenCalledWith('POST', '/connections/sync-contacts', { contacts: [] })
    })

    it('returns the response value', async () => {
      const mockData = { synced: 5, matched: 3 }
      req.mockResolvedValue(mockData)
      const result = await connectionService.syncContacts([{ email: 'x@y.com' }])
      expect(result).toEqual(mockData)
    })

    it('propagates errors', async () => {
      req.mockRejectedValue(new Error('Sync failed'))
      await expect(connectionService.syncContacts([])).rejects.toThrow('Sync failed')
    })
  })

  describe('getPublicProfile', () => {
    it('calls correct endpoint with userId', async () => {
      req.mockResolvedValue({ id: 'user-303', name: 'Frank' })
      await connectionService.getPublicProfile('user-303')
      expect(req).toHaveBeenCalledWith('GET', '/users/user-303')
    })

    it('uses GET method', async () => {
      req.mockResolvedValue({})
      await connectionService.getPublicProfile('user-y')
      expect(req).toHaveBeenCalledWith('GET', expect.stringContaining('/users/'))
    })

    it('returns the response value', async () => {
      const mockData = { id: 'user-303', name: 'Frank', title: 'Engineer' }
      req.mockResolvedValue(mockData)
      const result = await connectionService.getPublicProfile('user-303')
      expect(result).toEqual(mockData)
    })

    it('propagates errors', async () => {
      req.mockRejectedValue(new Error('Profile not found'))
      await expect(connectionService.getPublicProfile('user-303')).rejects.toThrow('Profile not found')
    })
  })
})
