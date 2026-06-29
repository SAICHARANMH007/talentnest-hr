import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/client.js', () => ({
  req: vi.fn(),
}))

import { faceService } from '../../api/services/face.service.js'
import { req } from '../../api/client.js'

describe('faceService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── getFaceStatus ────────────────────────────────────────────────────────────
  describe('getFaceStatus', () => {
    it('calls GET /face/status', async () => {
      req.mockResolvedValue({ enrolled: true })
      await faceService.getFaceStatus()
      expect(req).toHaveBeenCalledWith('GET', '/face/status')
    })

    it('returns the response from req', async () => {
      const resp = { enrolled: true, status: 'active' }
      req.mockResolvedValue(resp)
      const result = await faceService.getFaceStatus()
      expect(result).toEqual(resp)
    })
  })

  // ── enrollFace ───────────────────────────────────────────────────────────────
  describe('enrollFace', () => {
    it('calls POST /face/enroll with body', async () => {
      req.mockResolvedValue({ success: true })
      const body = { image: 'base64data' }
      await faceService.enrollFace(body)
      expect(req).toHaveBeenCalledWith('POST', '/face/enroll', body)
    })

    it('returns the response from req', async () => {
      const resp = { success: true, faceId: 'face-123' }
      req.mockResolvedValue(resp)
      const result = await faceService.enrollFace({ image: 'data' })
      expect(result).toEqual(resp)
    })
  })

  // ── uploadPhoto ──────────────────────────────────────────────────────────────
  describe('uploadPhoto', () => {
    it('calls POST /face/photo with body', async () => {
      req.mockResolvedValue({ url: 'https://example.com/photo.jpg' })
      const body = { photo: 'base64img' }
      await faceService.uploadPhoto(body)
      expect(req).toHaveBeenCalledWith('POST', '/face/photo', body)
    })

    it('returns the response from req', async () => {
      const resp = { url: 'https://example.com/photo.jpg' }
      req.mockResolvedValue(resp)
      const result = await faceService.uploadPhoto({ photo: 'data' })
      expect(result).toEqual(resp)
    })
  })

  // ── verifyFace ───────────────────────────────────────────────────────────────
  describe('verifyFace', () => {
    it('calls POST /face/verify with body', async () => {
      req.mockResolvedValue({ match: true, confidence: 0.97 })
      const body = { image: 'liveCapture' }
      await faceService.verifyFace(body)
      expect(req).toHaveBeenCalledWith('POST', '/face/verify', body)
    })

    it('returns the response from req', async () => {
      const resp = { match: true, confidence: 0.97 }
      req.mockResolvedValue(resp)
      const result = await faceService.verifyFace({ image: 'data' })
      expect(result).toEqual(resp)
    })
  })

  // ── removePhoto ──────────────────────────────────────────────────────────────
  describe('removePhoto', () => {
    it('calls DELETE /face/photo', async () => {
      req.mockResolvedValue({ deleted: true })
      await faceService.removePhoto()
      expect(req).toHaveBeenCalledWith('DELETE', '/face/photo')
    })

    it('returns the response from req', async () => {
      const resp = { deleted: true }
      req.mockResolvedValue(resp)
      const result = await faceService.removePhoto()
      expect(result).toEqual(resp)
    })
  })

  // ── deleteFace ───────────────────────────────────────────────────────────────
  describe('deleteFace', () => {
    it('calls DELETE /face/enroll', async () => {
      req.mockResolvedValue({ deleted: true })
      await faceService.deleteFace()
      expect(req).toHaveBeenCalledWith('DELETE', '/face/enroll')
    })

    it('returns the response from req', async () => {
      const resp = { deleted: true }
      req.mockResolvedValue(resp)
      const result = await faceService.deleteFace()
      expect(result).toEqual(resp)
    })
  })

  // ── proctorCheck ─────────────────────────────────────────────────────────────
  describe('proctorCheck', () => {
    it('calls POST /face/proctor-check with body', async () => {
      req.mockResolvedValue({ passed: true })
      const body = { sessionId: 'sess-1', image: 'frame' }
      await faceService.proctorCheck(body)
      expect(req).toHaveBeenCalledWith('POST', '/face/proctor-check', body)
    })

    it('returns the response from req', async () => {
      const resp = { passed: false, reason: 'multiple_faces' }
      req.mockResolvedValue(resp)
      const result = await faceService.proctorCheck({ sessionId: 'sess-1', image: 'frame' })
      expect(result).toEqual(resp)
    })
  })

  // ── updateFaceConsent ────────────────────────────────────────────────────────
  describe('updateFaceConsent', () => {
    it('calls POST /face/consent with body', async () => {
      req.mockResolvedValue({ updated: true })
      const body = { consent: true }
      await faceService.updateFaceConsent(body)
      expect(req).toHaveBeenCalledWith('POST', '/face/consent', body)
    })

    it('returns the response from req', async () => {
      const resp = { updated: true, consentDate: '2026-06-29' }
      req.mockResolvedValue(resp)
      const result = await faceService.updateFaceConsent({ consent: false })
      expect(result).toEqual(resp)
    })
  })

  // ── identifyFace (public — no auth) ─────────────────────────────────────────
  describe('identifyFace', () => {
    it('calls POST /face/identify with body and auth=false', async () => {
      req.mockResolvedValue({ userId: 'user-42' })
      const body = { image: 'capturedFrame' }
      await faceService.identifyFace(body)
      expect(req).toHaveBeenCalledWith('POST', '/face/identify', body, false)
    })

    it('returns the response from req', async () => {
      const resp = { userId: 'user-42', name: 'Alice' }
      req.mockResolvedValue(resp)
      const result = await faceService.identifyFace({ image: 'data' })
      expect(result).toEqual(resp)
    })
  })

  // ── faceLogin (public — no auth) ─────────────────────────────────────────────
  describe('faceLogin', () => {
    it('calls POST /face/login with body and auth=false', async () => {
      req.mockResolvedValue({ token: 'face-tok' })
      const body = { image: 'loginFrame' }
      await faceService.faceLogin(body)
      expect(req).toHaveBeenCalledWith('POST', '/face/login', body, false)
    })

    it('returns the response from req', async () => {
      const resp = { token: 'face-tok', user: { id: 'u1', role: 'candidate' } }
      req.mockResolvedValue(resp)
      const result = await faceService.faceLogin({ image: 'data' })
      expect(result).toEqual(resp)
    })
  })

  // ── checkEnrollment (public — no auth) ───────────────────────────────────────
  describe('checkEnrollment', () => {
    it('calls POST /face/check-enrolled with body and auth=false', async () => {
      req.mockResolvedValue({ enrolled: true })
      const body = { email: 'user@example.com' }
      await faceService.checkEnrollment(body)
      expect(req).toHaveBeenCalledWith('POST', '/face/check-enrolled', body, false)
    })

    it('returns the response from req', async () => {
      const resp = { enrolled: false }
      req.mockResolvedValue(resp)
      const result = await faceService.checkEnrollment({ email: 'new@example.com' })
      expect(result).toEqual(resp)
    })
  })

  // ── sendFaceOtp (public — no auth) ───────────────────────────────────────────
  describe('sendFaceOtp', () => {
    it('calls POST /face/send-otp with body and auth=false', async () => {
      req.mockResolvedValue({ sent: true })
      const body = { email: 'user@example.com' }
      await faceService.sendFaceOtp(body)
      expect(req).toHaveBeenCalledWith('POST', '/face/send-otp', body, false)
    })

    it('returns the response from req', async () => {
      const resp = { sent: true, expiresIn: 300 }
      req.mockResolvedValue(resp)
      const result = await faceService.sendFaceOtp({ email: 'user@example.com' })
      expect(result).toEqual(resp)
    })
  })

  // ── verifyFaceOtp (public — no auth) ─────────────────────────────────────────
  describe('verifyFaceOtp', () => {
    it('calls POST /face/verify-otp with body and auth=false', async () => {
      req.mockResolvedValue({ verified: true, token: 'otp-tok' })
      const body = { email: 'user@example.com', otp: '123456' }
      await faceService.verifyFaceOtp(body)
      expect(req).toHaveBeenCalledWith('POST', '/face/verify-otp', body, false)
    })

    it('returns the response from req', async () => {
      const resp = { verified: true, token: 'otp-tok' }
      req.mockResolvedValue(resp)
      const result = await faceService.verifyFaceOtp({ email: 'user@example.com', otp: '654321' })
      expect(result).toEqual(resp)
    })
  })

  // ── getDuplicateAlerts (admin) ────────────────────────────────────────────────
  describe('getDuplicateAlerts', () => {
    it('calls GET /face/admin/duplicates without query string when status is falsy', async () => {
      req.mockResolvedValue([])
      await faceService.getDuplicateAlerts()
      expect(req).toHaveBeenCalledWith('GET', '/face/admin/duplicates')
    })

    it('calls GET /face/admin/duplicates without query string when status is empty string', async () => {
      req.mockResolvedValue([])
      await faceService.getDuplicateAlerts('')
      expect(req).toHaveBeenCalledWith('GET', '/face/admin/duplicates')
    })

    it('appends ?status=pending when status is provided', async () => {
      req.mockResolvedValue([])
      await faceService.getDuplicateAlerts('pending')
      expect(req).toHaveBeenCalledWith('GET', '/face/admin/duplicates?status=pending')
    })

    it('appends ?status=resolved when status is resolved', async () => {
      req.mockResolvedValue([])
      await faceService.getDuplicateAlerts('resolved')
      expect(req).toHaveBeenCalledWith('GET', '/face/admin/duplicates?status=resolved')
    })

    it('returns the response from req', async () => {
      const resp = [{ id: 'dup-1', status: 'pending' }]
      req.mockResolvedValue(resp)
      const result = await faceService.getDuplicateAlerts('pending')
      expect(result).toEqual(resp)
    })
  })

  // ── getDuplicateCount (admin) ─────────────────────────────────────────────────
  describe('getDuplicateCount', () => {
    it('calls GET /face/admin/duplicates/count', async () => {
      req.mockResolvedValue({ count: 5 })
      await faceService.getDuplicateCount()
      expect(req).toHaveBeenCalledWith('GET', '/face/admin/duplicates/count')
    })

    it('returns the response from req', async () => {
      const resp = { count: 12 }
      req.mockResolvedValue(resp)
      const result = await faceService.getDuplicateCount()
      expect(result).toEqual(resp)
    })
  })

  // ── getDuplicateStats (admin) ─────────────────────────────────────────────────
  describe('getDuplicateStats', () => {
    it('calls GET /face/admin/duplicates/stats', async () => {
      req.mockResolvedValue({ total: 20, resolved: 15, pending: 5 })
      await faceService.getDuplicateStats()
      expect(req).toHaveBeenCalledWith('GET', '/face/admin/duplicates/stats')
    })

    it('returns the response from req', async () => {
      const resp = { total: 20, resolved: 15, pending: 5 }
      req.mockResolvedValue(resp)
      const result = await faceService.getDuplicateStats()
      expect(result).toEqual(resp)
    })
  })

  // ── reviewDuplicateAlert (admin) ──────────────────────────────────────────────
  describe('reviewDuplicateAlert', () => {
    it('calls PATCH /face/admin/duplicates/:id with body', async () => {
      req.mockResolvedValue({ updated: true })
      const body = { status: 'resolved', notes: 'confirmed duplicate' }
      await faceService.reviewDuplicateAlert('dup-99', body)
      expect(req).toHaveBeenCalledWith('PATCH', '/face/admin/duplicates/dup-99', body)
    })

    it('interpolates the id correctly into the URL', async () => {
      req.mockResolvedValue({})
      await faceService.reviewDuplicateAlert('alert-42', { status: 'dismissed' })
      expect(req).toHaveBeenCalledWith('PATCH', '/face/admin/duplicates/alert-42', { status: 'dismissed' })
    })

    it('returns the response from req', async () => {
      const resp = { updated: true, id: 'dup-99' }
      req.mockResolvedValue(resp)
      const result = await faceService.reviewDuplicateAlert('dup-99', { status: 'resolved' })
      expect(result).toEqual(resp)
    })
  })

  // ── purgeRetentionData (admin) ────────────────────────────────────────────────
  describe('purgeRetentionData', () => {
    it('calls POST /face/admin/purge-retention with body', async () => {
      req.mockResolvedValue({ purged: 10 })
      const body = { olderThanDays: 90 }
      await faceService.purgeRetentionData(body)
      expect(req).toHaveBeenCalledWith('POST', '/face/admin/purge-retention', body)
    })

    it('returns the response from req', async () => {
      const resp = { purged: 10, recordsDeleted: 10 }
      req.mockResolvedValue(resp)
      const result = await faceService.purgeRetentionData({ olderThanDays: 30 })
      expect(result).toEqual(resp)
    })
  })

  // ── getEdgeCaseHint (public — no auth) ───────────────────────────────────────
  describe('getEdgeCaseHint', () => {
    it('calls POST /face/edge-case-hint with { issue } and auth=false', async () => {
      req.mockResolvedValue({ hint: 'Try better lighting' })
      await faceService.getEdgeCaseHint('poor_lighting')
      expect(req).toHaveBeenCalledWith('POST', '/face/edge-case-hint', { issue: 'poor_lighting' }, false)
    })

    it('wraps the issue string in an object before passing to req', async () => {
      req.mockResolvedValue({ hint: 'Remove glasses' })
      await faceService.getEdgeCaseHint('glasses_detected')
      expect(req).toHaveBeenCalledWith('POST', '/face/edge-case-hint', { issue: 'glasses_detected' }, false)
    })

    it('returns the response from req', async () => {
      const resp = { hint: 'Ensure face is fully visible', severity: 'warning' }
      req.mockResolvedValue(resp)
      const result = await faceService.getEdgeCaseHint('partial_face')
      expect(result).toEqual(resp)
    })
  })
})
