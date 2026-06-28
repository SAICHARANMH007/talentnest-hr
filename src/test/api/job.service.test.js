import { describe, it, expect, vi, beforeEach } from 'vitest'
import { jobService } from '../../api/services/job.service.js'

vi.mock('../../api/client.js', () => ({
  req: vi.fn(),
}))

import { req } from '../../api/client.js'

describe('jobService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // ── getJobs ─────────────────────────────────────────────────────────────────
  describe('getJobs', () => {
    it('with no args → GET /jobs?limit=10000000', async () => {
      req.mockResolvedValue([])
      await jobService.getJobs()
      expect(req).toHaveBeenCalledWith('GET', '/jobs?limit=10000000')
    })

    it('with null → GET /jobs?limit=10000000', async () => {
      req.mockResolvedValue([])
      await jobService.getJobs(null)
      expect(req).toHaveBeenCalledWith('GET', '/jobs?limit=10000000')
    })

    it('with recruiterId string → appends recruiterId param', async () => {
      req.mockResolvedValue([])
      await jobService.getJobs('rid123')
      expect(req).toHaveBeenCalledWith('GET', '/jobs?limit=10000000&recruiterId=rid123')
    })

    it('with opts object builds URLSearchParams with all provided fields', async () => {
      req.mockResolvedValue([])
      await jobService.getJobs({ recruiterId: 'r1', status: 'active', search: 'dev', limit: 50, page: 2 })
      const url = req.mock.calls[0][1]
      expect(url).toContain('recruiterId=r1')
      expect(url).toContain('status=active')
      expect(url).toContain('search=dev')
      expect(url).toContain('limit=50')
      expect(url).toContain('page=2')
    })

    it('omits falsy opts params from URL', async () => {
      req.mockResolvedValue([])
      await jobService.getJobs({ limit: 10 })
      const url = req.mock.calls[0][1]
      expect(url).not.toContain('recruiterId')
      expect(url).not.toContain('status')
      expect(url).not.toContain('search')
    })

    it('includes platform=true when platform flag set', async () => {
      req.mockResolvedValue([])
      await jobService.getJobs({ platform: true })
      const url = req.mock.calls[0][1]
      expect(url).toContain('platform=true')
    })

    it('includes minimal=true when minimal flag set', async () => {
      req.mockResolvedValue([])
      await jobService.getJobs({ minimal: true })
      const url = req.mock.calls[0][1]
      expect(url).toContain('minimal=true')
    })
  })

  // ── getJob ──────────────────────────────────────────────────────────────────
  describe('getJob', () => {
    it('calls GET /jobs/:id', async () => {
      req.mockResolvedValue({ _id: 'j1', title: 'Dev' })
      await jobService.getJob('j1')
      expect(req).toHaveBeenCalledWith('GET', '/jobs/j1')
    })

    it('returns the response', async () => {
      const job = { _id: 'j1', title: 'Dev' }
      req.mockResolvedValue(job)
      const result = await jobService.getJob('j1')
      expect(result).toEqual(job)
    })
  })

  // ── createJob ───────────────────────────────────────────────────────────────
  describe('createJob', () => {
    it('calls POST /jobs with data', async () => {
      req.mockResolvedValue({ _id: 'new' })
      const data = { title: 'Dev', skills: ['JS'], location: 'Remote' }
      await jobService.createJob(data)
      expect(req).toHaveBeenCalledWith('POST', '/jobs', data)
    })
  })

  // ── patchJob ────────────────────────────────────────────────────────────────
  describe('patchJob', () => {
    it('calls PATCH /jobs/:id with data', async () => {
      req.mockResolvedValue({ _id: 'j1' })
      await jobService.patchJob('j1', { status: 'closed' })
      expect(req).toHaveBeenCalledWith('PATCH', '/jobs/j1', { status: 'closed' })
    })
  })

  // ── deleteJob ───────────────────────────────────────────────────────────────
  describe('deleteJob', () => {
    it('calls DELETE /jobs/:id', async () => {
      req.mockResolvedValue({})
      await jobService.deleteJob('j1')
      expect(req).toHaveBeenCalledWith('DELETE', '/jobs/j1')
    })
  })

  // ── approveJob ──────────────────────────────────────────────────────────────
  describe('approveJob', () => {
    it('calls PATCH /jobs/:id/approve with action', async () => {
      req.mockResolvedValue({})
      await jobService.approveJob('j1', 'approve')
      expect(req).toHaveBeenCalledWith('PATCH', '/jobs/j1/approve', { action: 'approve' })
    })

    it('includes reason when provided', async () => {
      req.mockResolvedValue({})
      await jobService.approveJob('j1', 'reject', 'Duplicate posting')
      expect(req).toHaveBeenCalledWith('PATCH', '/jobs/j1/approve', { action: 'reject', reason: 'Duplicate posting' })
    })

    it('omits reason key when reason is falsy', async () => {
      req.mockResolvedValue({})
      await jobService.approveJob('j1', 'approve', '')
      const body = req.mock.calls[0][2]
      expect(body).not.toHaveProperty('reason')
    })
  })

  // ── assignRecruiterToJob ────────────────────────────────────────────────────
  describe('assignRecruiterToJob', () => {
    it('calls POST /jobs/:id/assign with recruiterId', async () => {
      req.mockResolvedValue({})
      await jobService.assignRecruiterToJob('j1', 'r1')
      expect(req).toHaveBeenCalledWith('POST', '/jobs/j1/assign', { recruiterId: 'r1' })
    })
  })

  // ── getMatchedJobs ──────────────────────────────────────────────────────────
  describe('getMatchedJobs', () => {
    it('calls 3 endpoints: user, public jobs, my applications', async () => {
      req
        .mockResolvedValueOnce({ skills: ['javascript'] })
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [] })
      await jobService.getMatchedJobs('cand1')
      expect(req).toHaveBeenCalledTimes(3)
      expect(req).toHaveBeenCalledWith('GET', '/users/cand1')
      expect(req).toHaveBeenCalledWith('GET', '/jobs/public?limit=200', null, false)
      expect(req).toHaveBeenCalledWith('GET', '/applications/mine')
    })

    it('returns jobs sorted by matchScore desc', async () => {
      req
        .mockResolvedValueOnce({ skills: ['javascript', 'react'] })
        .mockResolvedValueOnce({ data: [
          { _id: 'j1', skills: ['python'] },         // 0 matches → low score
          { _id: 'j2', skills: ['javascript', 'react'] }, // 2 matches → highest score
          { _id: 'j3', skills: ['javascript'] },      // 1 match → middle
        ]})
        .mockResolvedValueOnce({ data: [] })
      const result = await jobService.getMatchedJobs('cand1')
      expect(result[0]._id).toBe('j2')
      expect(result[1]._id).toBe('j3')
      expect(result[2]._id).toBe('j1')
    })

    it('filters out jobs the candidate already applied to', async () => {
      req
        .mockResolvedValueOnce({ skills: ['javascript'] })
        .mockResolvedValueOnce({ data: [
          { _id: 'j1', skills: ['javascript'] },
          { _id: 'j2', skills: ['javascript'] },
        ]})
        .mockResolvedValueOnce({ data: [{ jobId: { _id: 'j1' } }] })
      const result = await jobService.getMatchedJobs('cand1')
      expect(result.every(j => j._id !== 'j1')).toBe(true)
      expect(result.some(j => j._id === 'j2')).toBe(true)
    })

    it('caps matchScore at 99', async () => {
      req
        .mockResolvedValueOnce({ skills: ['a', 'b', 'c', 'd', 'e', 'f'] })
        .mockResolvedValueOnce({ data: [{ _id: 'j1', skills: ['a', 'b', 'c', 'd', 'e', 'f'] }] })
        .mockResolvedValueOnce({ data: [] })
      const result = await jobService.getMatchedJobs('cand1')
      expect(result[0].matchScore).toBeLessThanOrEqual(99)
    })

    it('returns empty array when no public jobs', async () => {
      req
        .mockResolvedValueOnce({ skills: ['js'] })
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [] })
      const result = await jobService.getMatchedJobs('cand1')
      expect(result).toEqual([])
    })

    it('degrades gracefully when applications/mine fails', async () => {
      req
        .mockResolvedValueOnce({ skills: ['js'] })
        .mockResolvedValueOnce({ data: [{ _id: 'j1', skills: ['js'] }] })
        .mockResolvedValueOnce([]) // flat array instead of {data:[]}
      const result = await jobService.getMatchedJobs('cand1')
      expect(result).toHaveLength(1)
    })
  })

  // ── getPendingApprovalJobs ──────────────────────────────────────────────────
  describe('getPendingApprovalJobs', () => {
    it('calls GET /jobs/pending-approval with cache-buster', async () => {
      req.mockResolvedValue([])
      await jobService.getPendingApprovalJobs()
      const url = req.mock.calls[0][1]
      expect(url).toContain('/jobs/pending-approval')
      expect(url).toContain('_t=')
    })
  })

  // ── getPublicJobs ───────────────────────────────────────────────────────────
  describe('getPublicJobs', () => {
    it('calls GET /jobs/public without auth', async () => {
      req.mockResolvedValue([])
      await jobService.getPublicJobs()
      expect(req).toHaveBeenCalledWith('GET', '/jobs/public?limit=10000', null, false)
    })

    it('accepts custom query string', async () => {
      req.mockResolvedValue([])
      await jobService.getPublicJobs('?location=remote&limit=20')
      expect(req).toHaveBeenCalledWith('GET', '/jobs/public?location=remote&limit=20', null, false)
    })
  })
})
