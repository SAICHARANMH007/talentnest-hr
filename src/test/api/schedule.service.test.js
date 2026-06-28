import { describe, it, expect, vi, beforeEach } from 'vitest'
import { scheduleService } from '../../api/services/schedule.service.js'

vi.mock('../../api/client.js', () => ({
  req: vi.fn(),
}))

import { req } from '../../api/client.js'

describe('scheduleService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── createSchedulingLink ────────────────────────────────────────────────────
  describe('createSchedulingLink', () => {
    it('calls POST /schedule with all provided fields', async () => {
      req.mockResolvedValue({ data: { token: 'abc123' } })
      const args = {
        applicationId: 'app1',
        slots: ['2025-07-01T10:00:00Z', '2025-07-01T14:00:00Z'],
        format: 'video',
        videoLink: 'https://meet.example.com/room',
        location: 'Remote',
        notes: 'Please bring portfolio',
      }
      await scheduleService.createSchedulingLink(args)
      expect(req).toHaveBeenCalledWith('POST', '/schedule', {
        applicationId: 'app1',
        slots: ['2025-07-01T10:00:00Z', '2025-07-01T14:00:00Z'],
        format: 'video',
        videoLink: 'https://meet.example.com/room',
        location: 'Remote',
        notes: 'Please bring portfolio',
      })
    })

    it('returns r.data when response has data property', async () => {
      const token = { token: 'tok1', expiresAt: '2025-08-01' }
      req.mockResolvedValue({ data: token })
      const result = await scheduleService.createSchedulingLink({
        applicationId: 'app1',
        slots: [],
        format: 'video',
        videoLink: '',
        location: '',
        notes: '',
      })
      expect(result).toEqual(token)
    })

    it('returns the raw response when there is no data wrapper', async () => {
      const raw = { token: 'tok2' }
      req.mockResolvedValue(raw)
      const result = await scheduleService.createSchedulingLink({
        applicationId: 'app2',
        slots: [],
        format: 'in-person',
        videoLink: null,
        location: 'Office HQ',
        notes: '',
      })
      expect(result).toEqual(raw)
    })

    it('passes undefined fields when not supplied (destructured as undefined)', async () => {
      req.mockResolvedValue({ data: {} })
      await scheduleService.createSchedulingLink({})
      const body = req.mock.calls[0][2]
      expect(body).toHaveProperty('applicationId', undefined)
      expect(body).toHaveProperty('slots', undefined)
    })

    it('propagates rejection from req', async () => {
      req.mockRejectedValue(new Error('network error'))
      await expect(
        scheduleService.createSchedulingLink({ applicationId: 'a1', slots: [], format: 'video', videoLink: '', location: '', notes: '' })
      ).rejects.toThrow('network error')
    })
  })

  // ── getSchedulingLink ───────────────────────────────────────────────────────
  describe('getSchedulingLink', () => {
    it('calls GET /schedule/:token', async () => {
      req.mockResolvedValue({ data: { slots: [] } })
      await scheduleService.getSchedulingLink('tok-abc')
      expect(req).toHaveBeenCalledWith('GET', '/schedule/tok-abc')
    })

    it('returns r.data when response wraps in data', async () => {
      const payload = { applicationId: 'a1', slots: ['2025-07-01T10:00:00Z'], format: 'video' }
      req.mockResolvedValue({ data: payload })
      const result = await scheduleService.getSchedulingLink('tok-abc')
      expect(result).toEqual(payload)
    })

    it('returns raw response when no data wrapper', async () => {
      const raw = { applicationId: 'a1', slots: [] }
      req.mockResolvedValue(raw)
      const result = await scheduleService.getSchedulingLink('tok-xyz')
      expect(result).toEqual(raw)
    })

    it('uses the token exactly as provided in the URL path', async () => {
      req.mockResolvedValue({})
      await scheduleService.getSchedulingLink('my-special-token-123')
      expect(req).toHaveBeenCalledWith('GET', '/schedule/my-special-token-123')
    })

    it('propagates rejection from req', async () => {
      req.mockRejectedValue(new Error('not found'))
      await expect(scheduleService.getSchedulingLink('bad-token')).rejects.toThrow('not found')
    })
  })

  // ── confirmSchedulingSlot ───────────────────────────────────────────────────
  describe('confirmSchedulingSlot', () => {
    it('calls POST /schedule/:token/confirm with selectedSlot', async () => {
      req.mockResolvedValue({ data: { confirmed: true } })
      await scheduleService.confirmSchedulingSlot('tok-abc', '2025-07-01T10:00:00Z')
      expect(req).toHaveBeenCalledWith('POST', '/schedule/tok-abc/confirm', {
        selectedSlot: '2025-07-01T10:00:00Z',
      })
    })

    it('returns r.data when response has data property', async () => {
      const payload = { confirmed: true, meetingUrl: 'https://meet.example.com' }
      req.mockResolvedValue({ data: payload })
      const result = await scheduleService.confirmSchedulingSlot('tok-abc', '2025-07-01T10:00:00Z')
      expect(result).toEqual(payload)
    })

    it('returns raw response when there is no data wrapper', async () => {
      const raw = { confirmed: true }
      req.mockResolvedValue(raw)
      const result = await scheduleService.confirmSchedulingSlot('tok-xyz', '2025-07-02T09:00:00Z')
      expect(result).toEqual(raw)
    })

    it('uses the token and slot exactly as provided', async () => {
      req.mockResolvedValue({})
      const token = 'unique-token-999'
      const slot = '2025-12-25T08:00:00Z'
      await scheduleService.confirmSchedulingSlot(token, slot)
      expect(req).toHaveBeenCalledWith('POST', `/schedule/${token}/confirm`, { selectedSlot: slot })
    })

    it('propagates rejection from req', async () => {
      req.mockRejectedValue(new Error('slot taken'))
      await expect(
        scheduleService.confirmSchedulingSlot('tok', '2025-07-01T10:00:00Z')
      ).rejects.toThrow('slot taken')
    })
  })

  // ── updateInterview ─────────────────────────────────────────────────────────
  describe('updateInterview', () => {
    it('calls PATCH /video-rooms/:roomId with data', async () => {
      req.mockResolvedValue({ data: { updated: true } })
      const data = { scheduledAt: '2025-07-05T11:00:00Z', duration: 60 }
      await scheduleService.updateInterview('room-123', data)
      expect(req).toHaveBeenCalledWith('PATCH', '/video-rooms/room-123', data)
    })

    it('returns r.data when response has data property', async () => {
      const payload = { id: 'room-123', scheduledAt: '2025-07-05T11:00:00Z' }
      req.mockResolvedValue({ data: payload })
      const result = await scheduleService.updateInterview('room-123', {})
      expect(result).toEqual(payload)
    })

    it('returns raw response when no data wrapper', async () => {
      const raw = { updated: true }
      req.mockResolvedValue(raw)
      const result = await scheduleService.updateInterview('room-456', { notes: 'reschedule' })
      expect(result).toEqual(raw)
    })

    it('passes the data object through to req unchanged', async () => {
      req.mockResolvedValue({})
      const data = { scheduledAt: '2025-08-01T15:00:00Z', format: 'video', notes: 'updated' }
      await scheduleService.updateInterview('room-789', data)
      expect(req.mock.calls[0][2]).toEqual(data)
    })

    it('propagates rejection from req', async () => {
      req.mockRejectedValue(new Error('room not found'))
      await expect(scheduleService.updateInterview('bad-room', {})).rejects.toThrow('room not found')
    })

    it('uses the roomId exactly as provided in the URL path', async () => {
      req.mockResolvedValue({})
      await scheduleService.updateInterview('special-room-id-abc', {})
      expect(req).toHaveBeenCalledWith('PATCH', '/video-rooms/special-room-id-abc', {})
    })
  })
})
