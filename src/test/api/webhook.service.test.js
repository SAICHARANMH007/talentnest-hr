import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/client.js', () => ({ req: vi.fn() }))

import { webhookService } from '../../api/services/webhook.service.js'
import { req } from '../../api/client.js'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('webhookService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Webhook CRUD ────────────────────────────────────────────────────────────

  describe('getWebhooks', () => {
    it('calls GET /webhooks', async () => {
      req.mockResolvedValue({ data: [] })
      await webhookService.getWebhooks()
      expect(req).toHaveBeenCalledWith('GET', '/webhooks')
    })

    it('returns r.data when present', async () => {
      req.mockResolvedValue({ data: [{ id: '1' }] })
      const result = await webhookService.getWebhooks()
      expect(result).toEqual([{ id: '1' }])
    })

    it('returns r directly when data is absent', async () => {
      req.mockResolvedValue([{ id: '2' }])
      const result = await webhookService.getWebhooks()
      expect(result).toEqual([{ id: '2' }])
    })
  })

  describe('createWebhook', () => {
    it('calls POST /webhooks with payload', async () => {
      req.mockResolvedValue({ data: { id: 'new' } })
      const payload = { url: 'https://example.com', events: ['job.created'] }
      await webhookService.createWebhook(payload)
      expect(req).toHaveBeenCalledWith('POST', '/webhooks', payload)
    })

    it('returns r.data when present', async () => {
      const created = { id: 'new', url: 'https://example.com' }
      req.mockResolvedValue({ data: created })
      const result = await webhookService.createWebhook({ url: 'https://example.com' })
      expect(result).toEqual(created)
    })

    it('returns r directly when data is absent', async () => {
      const created = { id: 'new' }
      req.mockResolvedValue(created)
      const result = await webhookService.createWebhook({ url: 'https://example.com' })
      expect(result).toEqual(created)
    })
  })

  describe('updateWebhook', () => {
    it('calls PUT /webhooks/:id with payload', async () => {
      req.mockResolvedValue({ data: { id: 'wh1' } })
      const payload = { url: 'https://new.example.com' }
      await webhookService.updateWebhook('wh1', payload)
      expect(req).toHaveBeenCalledWith('PUT', '/webhooks/wh1', payload)
    })

    it('returns r.data when present', async () => {
      const updated = { id: 'wh1', url: 'https://new.example.com' }
      req.mockResolvedValue({ data: updated })
      const result = await webhookService.updateWebhook('wh1', { url: 'https://new.example.com' })
      expect(result).toEqual(updated)
    })

    it('returns r directly when data is absent', async () => {
      const updated = { id: 'wh1' }
      req.mockResolvedValue(updated)
      const result = await webhookService.updateWebhook('wh1', {})
      expect(result).toEqual(updated)
    })
  })

  describe('deleteWebhook', () => {
    it('calls DELETE /webhooks/:id', async () => {
      req.mockResolvedValue({ success: true })
      await webhookService.deleteWebhook('wh1')
      expect(req).toHaveBeenCalledWith('DELETE', '/webhooks/wh1')
    })

    it('returns the raw response', async () => {
      req.mockResolvedValue({ success: true })
      const result = await webhookService.deleteWebhook('wh1')
      expect(result).toEqual({ success: true })
    })
  })

  describe('testWebhook', () => {
    it('calls POST /webhooks/:id/test', async () => {
      req.mockResolvedValue({ data: { status: 'ok' } })
      await webhookService.testWebhook('wh1')
      expect(req).toHaveBeenCalledWith('POST', '/webhooks/wh1/test')
    })

    it('returns r.data when present', async () => {
      req.mockResolvedValue({ data: { status: 'ok' } })
      const result = await webhookService.testWebhook('wh1')
      expect(result).toEqual({ status: 'ok' })
    })

    it('returns r directly when data is absent', async () => {
      req.mockResolvedValue({ status: 'ok' })
      const result = await webhookService.testWebhook('wh1')
      expect(result).toEqual({ status: 'ok' })
    })
  })

  describe('getWebhookEvents', () => {
    it('calls GET /webhooks/events', async () => {
      req.mockResolvedValue({ data: [] })
      await webhookService.getWebhookEvents()
      expect(req).toHaveBeenCalledWith('GET', '/webhooks/events')
    })

    it('returns r.data when present', async () => {
      req.mockResolvedValue({ data: ['job.created', 'job.updated'] })
      const result = await webhookService.getWebhookEvents()
      expect(result).toEqual(['job.created', 'job.updated'])
    })

    it('returns r directly when data is absent', async () => {
      req.mockResolvedValue(['job.created'])
      const result = await webhookService.getWebhookEvents()
      expect(result).toEqual(['job.created'])
    })
  })

  describe('seedWebhooks', () => {
    it('calls POST /webhooks/seed with empty object', async () => {
      req.mockResolvedValue({ seeded: 5 })
      await webhookService.seedWebhooks()
      expect(req).toHaveBeenCalledWith('POST', '/webhooks/seed', {})
    })

    it('returns the raw response', async () => {
      req.mockResolvedValue({ seeded: 5 })
      const result = await webhookService.seedWebhooks()
      expect(result).toEqual({ seeded: 5 })
    })
  })

  // ── Company Reviews – public (fetch-based) ──────────────────────────────────

  describe('getPublicReviews', () => {
    it('fetches the correct URL for the given orgSlug', async () => {
      const reviews = [{ id: 'r1', rating: 5 }]
      mockFetch.mockResolvedValue({ json: () => Promise.resolve(reviews) })
      await webhookService.getPublicReviews('acme-corp')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/company-reviews/public/acme-corp')
      )
    })

    it('returns the parsed JSON response', async () => {
      const reviews = [{ id: 'r1', rating: 5 }]
      mockFetch.mockResolvedValue({ json: () => Promise.resolve(reviews) })
      const result = await webhookService.getPublicReviews('acme-corp')
      expect(result).toEqual(reviews)
    })
  })

  describe('submitReview', () => {
    it('POSTs to the correct URL with JSON headers and body', async () => {
      const payload = { rating: 4, comment: 'Great place' }
      const response = { id: 'rev1' }
      mockFetch.mockResolvedValue({ json: () => Promise.resolve(response) })

      await webhookService.submitReview('acme-corp', payload)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/company-reviews/public/acme-corp'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Requested-With': 'TalentNest',
          }),
          body: JSON.stringify(payload),
        })
      )
    })

    it('returns the parsed JSON response', async () => {
      const response = { id: 'rev1', rating: 4 }
      mockFetch.mockResolvedValue({ json: () => Promise.resolve(response) })
      const result = await webhookService.submitReview('acme-corp', { rating: 4 })
      expect(result).toEqual(response)
    })
  })

  // ── Company Reviews – authenticated (req-based) ─────────────────────────────

  describe('getMyOrgReviews', () => {
    it('calls GET /company-reviews/my-org', async () => {
      req.mockResolvedValue([])
      await webhookService.getMyOrgReviews()
      expect(req).toHaveBeenCalledWith('GET', '/company-reviews/my-org')
    })

    it('returns the raw response', async () => {
      req.mockResolvedValue([{ id: 'r1' }])
      const result = await webhookService.getMyOrgReviews()
      expect(result).toEqual([{ id: 'r1' }])
    })
  })

  describe('getCompanyReviewsByName', () => {
    it('calls GET /company-reviews/by-company/:encodedName', async () => {
      req.mockResolvedValue([])
      await webhookService.getCompanyReviewsByName('Acme Corp')
      expect(req).toHaveBeenCalledWith(
        'GET',
        `/company-reviews/by-company/${encodeURIComponent('Acme Corp')}`
      )
    })

    it('URL-encodes company names with special characters', async () => {
      req.mockResolvedValue([])
      await webhookService.getCompanyReviewsByName('Big & Bold Co.')
      expect(req).toHaveBeenCalledWith(
        'GET',
        `/company-reviews/by-company/${encodeURIComponent('Big & Bold Co.')}`
      )
    })

    it('returns the raw response', async () => {
      req.mockResolvedValue([{ id: 'r2' }])
      const result = await webhookService.getCompanyReviewsByName('Acme')
      expect(result).toEqual([{ id: 'r2' }])
    })
  })

  describe('submitMyOrgReview', () => {
    it('calls POST /company-reviews/my-org with data', async () => {
      req.mockResolvedValue({ id: 'rev2' })
      const payload = { rating: 3, comment: 'It was okay' }
      await webhookService.submitMyOrgReview(payload)
      expect(req).toHaveBeenCalledWith('POST', '/company-reviews/my-org', payload)
    })

    it('returns the raw response', async () => {
      req.mockResolvedValue({ id: 'rev2' })
      const result = await webhookService.submitMyOrgReview({ rating: 3 })
      expect(result).toEqual({ id: 'rev2' })
    })
  })

  describe('getAdminReviews', () => {
    it('calls GET /company-reviews', async () => {
      req.mockResolvedValue({ data: [] })
      await webhookService.getAdminReviews()
      expect(req).toHaveBeenCalledWith('GET', '/company-reviews')
    })

    it('returns r.data when present', async () => {
      req.mockResolvedValue({ data: [{ id: 'r3' }] })
      const result = await webhookService.getAdminReviews()
      expect(result).toEqual([{ id: 'r3' }])
    })

    it('returns r directly when data is absent', async () => {
      req.mockResolvedValue([{ id: 'r3' }])
      const result = await webhookService.getAdminReviews()
      expect(result).toEqual([{ id: 'r3' }])
    })
  })

  describe('getReportedReviews', () => {
    it('calls GET /company-reviews/reported', async () => {
      req.mockResolvedValue({ data: [] })
      await webhookService.getReportedReviews()
      expect(req).toHaveBeenCalledWith('GET', '/company-reviews/reported')
    })

    it('returns r.data when present', async () => {
      req.mockResolvedValue({ data: [{ id: 'r4', reported: true }] })
      const result = await webhookService.getReportedReviews()
      expect(result).toEqual([{ id: 'r4', reported: true }])
    })

    it('returns r directly when data is absent', async () => {
      req.mockResolvedValue([{ id: 'r4' }])
      const result = await webhookService.getReportedReviews()
      expect(result).toEqual([{ id: 'r4' }])
    })
  })

  describe('reportReview', () => {
    it('calls PATCH /company-reviews/:id/report with reason', async () => {
      req.mockResolvedValue({ success: true })
      await webhookService.reportReview('rev1', 'spam')
      expect(req).toHaveBeenCalledWith('PATCH', '/company-reviews/rev1/report', { reason: 'spam' })
    })

    it('passes through the reason correctly', async () => {
      req.mockResolvedValue({ success: true })
      await webhookService.reportReview('rev2', 'inappropriate content')
      expect(req).toHaveBeenCalledWith('PATCH', '/company-reviews/rev2/report', {
        reason: 'inappropriate content',
      })
    })

    it('returns the raw response', async () => {
      req.mockResolvedValue({ success: true })
      const result = await webhookService.reportReview('rev1', 'spam')
      expect(result).toEqual({ success: true })
    })
  })

  describe('unreportReview', () => {
    it('calls PATCH /company-reviews/:id/unreport', async () => {
      req.mockResolvedValue({ success: true })
      await webhookService.unreportReview('rev1')
      expect(req).toHaveBeenCalledWith('PATCH', '/company-reviews/rev1/unreport')
    })

    it('returns the raw response', async () => {
      req.mockResolvedValue({ success: true })
      const result = await webhookService.unreportReview('rev1')
      expect(result).toEqual({ success: true })
    })
  })

  describe('deleteReview', () => {
    it('calls DELETE /company-reviews/:id', async () => {
      req.mockResolvedValue({ deleted: true })
      await webhookService.deleteReview('rev1')
      expect(req).toHaveBeenCalledWith('DELETE', '/company-reviews/rev1')
    })

    it('returns the raw response', async () => {
      req.mockResolvedValue({ deleted: true })
      const result = await webhookService.deleteReview('rev1')
      expect(result).toEqual({ deleted: true })
    })
  })

  describe('seedReviews', () => {
    it('calls POST /company-reviews/seed with empty object', async () => {
      req.mockResolvedValue({ seeded: 10 })
      await webhookService.seedReviews()
      expect(req).toHaveBeenCalledWith('POST', '/company-reviews/seed', {})
    })

    it('returns the raw response', async () => {
      req.mockResolvedValue({ seeded: 10 })
      const result = await webhookService.seedReviews()
      expect(result).toEqual({ seeded: 10 })
    })
  })
})
