import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/client.js', () => ({
  req: vi.fn(),
}))

import { importedCandidateService } from '../../api/services/importedCandidate.service.js'
import { req } from '../../api/client.js'

describe('importedCandidateService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // ── getImportedCandidates ─────────────────────────────────────────────────
  describe('getImportedCandidates', () => {
    it('calls GET /imported-candidates with no params when called with undefined', async () => {
      req.mockResolvedValue({ data: [] })
      await importedCandidateService.getImportedCandidates()
      expect(req).toHaveBeenCalledWith('GET', '/imported-candidates?')
    })

    it('calls GET /imported-candidates with no params when called with null', async () => {
      req.mockResolvedValue({ data: [] })
      await importedCandidateService.getImportedCandidates(null)
      expect(req).toHaveBeenCalledWith('GET', '/imported-candidates?')
    })

    it('calls GET /imported-candidates with no params when called with empty object', async () => {
      req.mockResolvedValue({ data: [] })
      await importedCandidateService.getImportedCandidates({})
      expect(req).toHaveBeenCalledWith('GET', '/imported-candidates?')
    })

    it('appends page param to URL', async () => {
      req.mockResolvedValue({ data: [] })
      await importedCandidateService.getImportedCandidates({ page: 2 })
      const url = req.mock.calls[0][1]
      expect(url).toContain('page=2')
    })

    it('appends limit param to URL', async () => {
      req.mockResolvedValue({ data: [] })
      await importedCandidateService.getImportedCandidates({ limit: 25 })
      const url = req.mock.calls[0][1]
      expect(url).toContain('limit=25')
    })

    it('appends status param to URL', async () => {
      req.mockResolvedValue({ data: [] })
      await importedCandidateService.getImportedCandidates({ status: 'pending' })
      const url = req.mock.calls[0][1]
      expect(url).toContain('status=pending')
    })

    it('appends search param to URL', async () => {
      req.mockResolvedValue({ data: [] })
      await importedCandidateService.getImportedCandidates({ search: 'john' })
      const url = req.mock.calls[0][1]
      expect(url).toContain('search=john')
    })

    it('appends all params when all are provided', async () => {
      req.mockResolvedValue({ data: [] })
      await importedCandidateService.getImportedCandidates({ page: 1, limit: 10, status: 'invited', search: 'jane' })
      const url = req.mock.calls[0][1]
      expect(url).toContain('page=1')
      expect(url).toContain('limit=10')
      expect(url).toContain('status=invited')
      expect(url).toContain('search=jane')
    })

    it('omits params with undefined value', async () => {
      req.mockResolvedValue({ data: [] })
      await importedCandidateService.getImportedCandidates({ page: 1, status: undefined })
      const url = req.mock.calls[0][1]
      expect(url).toContain('page=1')
      expect(url).not.toContain('status')
    })

    it('omits params with null value', async () => {
      req.mockResolvedValue({ data: [] })
      await importedCandidateService.getImportedCandidates({ page: 1, status: null })
      const url = req.mock.calls[0][1]
      expect(url).toContain('page=1')
      expect(url).not.toContain('status')
    })

    it('omits params with empty string value', async () => {
      req.mockResolvedValue({ data: [] })
      await importedCandidateService.getImportedCandidates({ page: 1, search: '' })
      const url = req.mock.calls[0][1]
      expect(url).toContain('page=1')
      expect(url).not.toContain('search')
    })

    it('coerces numeric values to strings in the query', async () => {
      req.mockResolvedValue({ data: [] })
      await importedCandidateService.getImportedCandidates({ page: 3, limit: 50 })
      const url = req.mock.calls[0][1]
      expect(url).toContain('page=3')
      expect(url).toContain('limit=50')
    })

    it('returns the value resolved by req', async () => {
      const mockResponse = { data: [{ _id: 'c1' }], total: 1 }
      req.mockResolvedValue(mockResponse)
      const result = await importedCandidateService.getImportedCandidates({ page: 1 })
      expect(result).toEqual(mockResponse)
    })

    it('uses GET as the HTTP method', async () => {
      req.mockResolvedValue({})
      await importedCandidateService.getImportedCandidates({ page: 1 })
      expect(req.mock.calls[0][0]).toBe('GET')
    })

    it('URL starts with /imported-candidates?', async () => {
      req.mockResolvedValue({})
      await importedCandidateService.getImportedCandidates({ page: 1 })
      expect(req.mock.calls[0][1]).toMatch(/^\/imported-candidates\?/)
    })
  })

  // ── bulkImportRaw ─────────────────────────────────────────────────────────
  describe('bulkImportRaw', () => {
    it('calls POST /imported-candidates/bulk with rows in body', async () => {
      const rows = [{ name: 'Alice', email: 'alice@example.com' }, { name: 'Bob', email: 'bob@example.com' }]
      req.mockResolvedValue({ inserted: 2 })
      await importedCandidateService.bulkImportRaw(rows)
      expect(req).toHaveBeenCalledWith('POST', '/imported-candidates/bulk', { rows })
    })

    it('passes an empty array when rows is empty', async () => {
      req.mockResolvedValue({ inserted: 0 })
      await importedCandidateService.bulkImportRaw([])
      expect(req).toHaveBeenCalledWith('POST', '/imported-candidates/bulk', { rows: [] })
    })

    it('returns the value resolved by req', async () => {
      const mockResponse = { inserted: 5, errors: [] }
      req.mockResolvedValue(mockResponse)
      const rows = [{ name: 'Test' }]
      const result = await importedCandidateService.bulkImportRaw(rows)
      expect(result).toEqual(mockResponse)
    })

    it('uses POST as the HTTP method', async () => {
      req.mockResolvedValue({})
      await importedCandidateService.bulkImportRaw([{ name: 'X' }])
      expect(req.mock.calls[0][0]).toBe('POST')
    })

    it('sends exactly the rows provided without modification', async () => {
      req.mockResolvedValue({})
      const rows = [{ name: 'A', skills: ['JS', 'React'], experience: 3 }]
      await importedCandidateService.bulkImportRaw(rows)
      const body = req.mock.calls[0][2]
      expect(body.rows).toEqual(rows)
    })
  })

  // ── sendImportedInvites ───────────────────────────────────────────────────
  describe('sendImportedInvites', () => {
    it('calls POST /imported-candidates/invite with ids in body', async () => {
      const ids = ['id1', 'id2', 'id3']
      req.mockResolvedValue({ sent: 3 })
      await importedCandidateService.sendImportedInvites(ids)
      expect(req).toHaveBeenCalledWith('POST', '/imported-candidates/invite', { ids })
    })

    it('passes a single-element array correctly', async () => {
      req.mockResolvedValue({ sent: 1 })
      await importedCandidateService.sendImportedInvites(['onlyId'])
      expect(req).toHaveBeenCalledWith('POST', '/imported-candidates/invite', { ids: ['onlyId'] })
    })

    it('passes an empty array when ids is empty', async () => {
      req.mockResolvedValue({ sent: 0 })
      await importedCandidateService.sendImportedInvites([])
      expect(req).toHaveBeenCalledWith('POST', '/imported-candidates/invite', { ids: [] })
    })

    it('returns the value resolved by req', async () => {
      const mockResponse = { sent: 2, failed: 0 }
      req.mockResolvedValue(mockResponse)
      const result = await importedCandidateService.sendImportedInvites(['a', 'b'])
      expect(result).toEqual(mockResponse)
    })

    it('uses POST as the HTTP method', async () => {
      req.mockResolvedValue({})
      await importedCandidateService.sendImportedInvites(['x'])
      expect(req.mock.calls[0][0]).toBe('POST')
    })

    it('calls exactly one endpoint', async () => {
      req.mockResolvedValue({})
      await importedCandidateService.sendImportedInvites(['x', 'y'])
      expect(req).toHaveBeenCalledTimes(1)
    })
  })

  // ── clearImportedDatabase ─────────────────────────────────────────────────
  describe('clearImportedDatabase', () => {
    it('calls DELETE /imported-candidates', async () => {
      req.mockResolvedValue({ deleted: 42 })
      await importedCandidateService.clearImportedDatabase()
      expect(req).toHaveBeenCalledWith('DELETE', '/imported-candidates')
    })

    it('uses DELETE as the HTTP method', async () => {
      req.mockResolvedValue({})
      await importedCandidateService.clearImportedDatabase()
      expect(req.mock.calls[0][0]).toBe('DELETE')
    })

    it('calls exactly one endpoint with no body', async () => {
      req.mockResolvedValue({})
      await importedCandidateService.clearImportedDatabase()
      expect(req).toHaveBeenCalledTimes(1)
      expect(req.mock.calls[0]).toHaveLength(2)
    })

    it('returns the value resolved by req', async () => {
      const mockResponse = { deleted: 100, message: 'Cleared' }
      req.mockResolvedValue(mockResponse)
      const result = await importedCandidateService.clearImportedDatabase()
      expect(result).toEqual(mockResponse)
    })

    it('propagates rejection when req rejects', async () => {
      req.mockRejectedValue(new Error('Network error'))
      await expect(importedCandidateService.clearImportedDatabase()).rejects.toThrow('Network error')
    })
  })
})
