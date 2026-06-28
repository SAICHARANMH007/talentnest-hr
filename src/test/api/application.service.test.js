import { describe, it, expect, vi, beforeEach } from 'vitest'
import { applicationService } from '../../api/services/application.service.js'

vi.mock('../../api/client.js', () => ({
  req: vi.fn(),
}))

import { req } from '../../api/client.js'

describe('applicationService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // ── getMyApplications ───────────────────────────────────────────────────────
  describe('getMyApplications', () => {
    it('returns data array when response has {data:[...]} wrapper', async () => {
      req.mockResolvedValue({ data: [{ _id: 'a1' }, { _id: 'a2' }] })
      const result = await applicationService.getMyApplications()
      expect(result).toEqual([{ _id: 'a1' }, { _id: 'a2' }])
    })

    it('returns flat array when response is already an array', async () => {
      req.mockResolvedValue([{ _id: 'a1' }])
      const result = await applicationService.getMyApplications()
      expect(result).toEqual([{ _id: 'a1' }])
    })

    it('returns empty array when response is null', async () => {
      req.mockResolvedValue(null)
      const result = await applicationService.getMyApplications()
      expect(result).toEqual([])
    })

    it('returns empty array when response is an empty object', async () => {
      req.mockResolvedValue({})
      const result = await applicationService.getMyApplications()
      expect(result).toEqual([])
    })

    it('calls GET /applications/mine', async () => {
      req.mockResolvedValue({ data: [] })
      await applicationService.getMyApplications()
      expect(req).toHaveBeenCalledWith('GET', '/applications/mine')
    })
  })

  // ── getApplications ─────────────────────────────────────────────────────────
  describe('getApplications', () => {
    it('calls /applications with default limit=10000000 when opts empty', async () => {
      req.mockResolvedValue([])
      await applicationService.getApplications()
      const url = req.mock.calls[0][1]
      expect(url).toContain('/applications')
      expect(url).toContain('limit=10000000')
    })

    it('builds correct URLSearchParams for all provided fields', async () => {
      req.mockResolvedValue([])
      await applicationService.getApplications({ jobId: 'j1', stage: 'Interview', limit: 20, candidateId: 'c1' })
      const url = req.mock.calls[0][1]
      expect(url).toContain('jobId=j1')
      expect(url).toContain('stage=Interview')
      expect(url).toContain('limit=20')
      expect(url).toContain('candidateId=c1')
    })

    it('omits falsy params from URL', async () => {
      req.mockResolvedValue([])
      await applicationService.getApplications({ jobId: 'j1' })
      const url = req.mock.calls[0][1]
      expect(url).not.toContain('stage=')
      expect(url).not.toContain('candidateId=')
    })

    it('includes startDate and endDate when provided', async () => {
      req.mockResolvedValue([])
      await applicationService.getApplications({ startDate: '2025-01-01', endDate: '2025-12-31' })
      const url = req.mock.calls[0][1]
      expect(url).toContain('startDate=2025-01-01')
      expect(url).toContain('endDate=2025-12-31')
    })

    it('includes platform=true when platform flag set', async () => {
      req.mockResolvedValue([])
      await applicationService.getApplications({ platform: true })
      const url = req.mock.calls[0][1]
      expect(url).toContain('platform=true')
    })
  })

  // ── getApplication ──────────────────────────────────────────────────────────
  describe('getApplication', () => {
    it('returns r.data when response has data wrapper', async () => {
      req.mockResolvedValue({ data: { _id: 'a1', stage: 'Shortlisted' } })
      const result = await applicationService.getApplication('a1')
      expect(result).toEqual({ _id: 'a1', stage: 'Shortlisted' })
    })

    it('returns raw response when no data wrapper', async () => {
      req.mockResolvedValue({ _id: 'a1' })
      const result = await applicationService.getApplication('a1')
      expect(result).toEqual({ _id: 'a1' })
    })

    it('calls GET /applications/:appId', async () => {
      req.mockResolvedValue({ _id: 'a1' })
      await applicationService.getApplication('a1')
      expect(req).toHaveBeenCalledWith('GET', '/applications/a1')
    })
  })

  // ── applyToJob ──────────────────────────────────────────────────────────────
  describe('applyToJob', () => {
    it('calls POST /applications with jobId and candidateId', async () => {
      req.mockResolvedValue({ _id: 'app1' })
      await applicationService.applyToJob('j1', 'c1')
      expect(req).toHaveBeenCalledWith('POST', '/applications', { jobId: 'j1', candidateId: 'c1' })
    })

    it('includes geo fields when geo object provided', async () => {
      req.mockResolvedValue({})
      await applicationService.applyToJob('j1', 'c1', null, { lat: 12.9, lng: 77.5, accuracy: 10, city: 'BLR', country: 'IN' })
      const body = req.mock.calls[0][2]
      expect(body.geoLat).toBe(12.9)
      expect(body.geoLng).toBe(77.5)
      expect(body.geoAccuracy).toBe(10)
      expect(body.geoCity).toBe('BLR')
      expect(body.geoCountry).toBe('IN')
    })

    it('omits geo fields when geo is null', async () => {
      req.mockResolvedValue({})
      await applicationService.applyToJob('j1', 'c1', null, null)
      const body = req.mock.calls[0][2]
      expect(body).not.toHaveProperty('geoLat')
      expect(body).not.toHaveProperty('geoLng')
    })

    it('includes screeningAnswers when provided', async () => {
      req.mockResolvedValue({})
      const answers = [{ q: 'Do you have 2+ years exp?', a: 'Yes' }]
      await applicationService.applyToJob('j1', 'c1', answers)
      const body = req.mock.calls[0][2]
      expect(body.screeningAnswers).toEqual(answers)
    })

    it('omits screeningAnswers key when falsy', async () => {
      req.mockResolvedValue({})
      await applicationService.applyToJob('j1', 'c1', null)
      const body = req.mock.calls[0][2]
      expect(body).not.toHaveProperty('screeningAnswers')
    })
  })

  // ── applyPublic ─────────────────────────────────────────────────────────────
  describe('applyPublic', () => {
    it('calls POST /applications/public without auth (false flag)', async () => {
      req.mockResolvedValue({})
      await applicationService.applyPublic('j1', { name: 'Alice', email: 'a@b.com' })
      expect(req).toHaveBeenCalledWith('POST', '/applications/public', { jobId: 'j1', name: 'Alice', email: 'a@b.com' }, false)
    })

    it('spreads form fields into the body alongside jobId', async () => {
      req.mockResolvedValue({})
      await applicationService.applyPublic('j1', { phone: '1234', resume: 'r.pdf' })
      const body = req.mock.calls[0][2]
      expect(body.jobId).toBe('j1')
      expect(body.phone).toBe('1234')
      expect(body.resume).toBe('r.pdf')
    })
  })

  // ── updateStage ─────────────────────────────────────────────────────────────
  describe('updateStage', () => {
    it('calls PATCH /applications/:id/stage with stage and notes', async () => {
      req.mockResolvedValue({})
      await applicationService.updateStage('a1', 'Interview', 'Passed phone screen')
      expect(req).toHaveBeenCalledWith('PATCH', '/applications/a1/stage', { stage: 'Interview', notes: 'Passed phone screen' })
    })

    it('defaults notes to empty string when not provided', async () => {
      req.mockResolvedValue({})
      await applicationService.updateStage('a1', 'Offer')
      const body = req.mock.calls[0][2]
      expect(body.notes).toBe('')
    })

    it('merges extra fields into the body', async () => {
      req.mockResolvedValue({})
      await applicationService.updateStage('a1', 'Hired', '', { offerId: 'o1' })
      const body = req.mock.calls[0][2]
      expect(body.offerId).toBe('o1')
    })
  })

  // ── getScorecards ───────────────────────────────────────────────────────────
  describe('getScorecards', () => {
    it('returns data array when response has data wrapper', async () => {
      req.mockResolvedValue({ data: [{ score: 85, interviewer: 'Alice' }] })
      const result = await applicationService.getScorecards('j1')
      expect(result).toEqual([{ score: 85, interviewer: 'Alice' }])
    })

    it('returns empty array when response has no data', async () => {
      req.mockResolvedValue({})
      const result = await applicationService.getScorecards('j1')
      expect(result).toEqual([])
    })

    it('calls correct endpoint', async () => {
      req.mockResolvedValue({ data: [] })
      await applicationService.getScorecards('j1')
      expect(req).toHaveBeenCalledWith('GET', '/applications/scorecards?jobId=j1')
    })
  })

  // ── withdrawApplication ─────────────────────────────────────────────────────
  describe('withdrawApplication', () => {
    it('calls DELETE /applications/:id', async () => {
      req.mockResolvedValue({})
      await applicationService.withdrawApplication('a1')
      expect(req).toHaveBeenCalledWith('DELETE', '/applications/a1', undefined)
    })

    it('includes reason when provided', async () => {
      req.mockResolvedValue({})
      await applicationService.withdrawApplication('a1', 'Found another job')
      expect(req).toHaveBeenCalledWith('DELETE', '/applications/a1', { reason: 'Found another job' })
    })
  })
})
