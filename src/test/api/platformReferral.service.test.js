import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/client.js', () => ({ req: vi.fn() }))

import { platformReferralService } from '../../api/services/platformReferral.service.js'
import { req } from '../../api/client.js'

describe('platformReferralService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('getPlatformReferralStats', () => {
    it('calls GET /platform-referrals/my-stats', async () => {
      req.mockResolvedValue({ referrals: 5 })
      const result = await platformReferralService.getPlatformReferralStats()
      expect(req).toHaveBeenCalledWith('GET', '/platform-referrals/my-stats')
      expect(req).toHaveBeenCalledTimes(1)
    })

    it('returns the value from req', async () => {
      const mockData = { referrals: 5, credits: 100 }
      req.mockResolvedValue(mockData)
      const result = await platformReferralService.getPlatformReferralStats()
      expect(result).toEqual(mockData)
    })

    it('propagates errors from req', async () => {
      req.mockRejectedValue(new Error('Network error'))
      await expect(platformReferralService.getPlatformReferralStats()).rejects.toThrow('Network error')
    })
  })

  describe('trackPlatformInvite', () => {
    it('calls POST /platform-referrals/track-invite with empty body', async () => {
      req.mockResolvedValue({ success: true })
      await platformReferralService.trackPlatformInvite()
      expect(req).toHaveBeenCalledWith('POST', '/platform-referrals/track-invite', {})
      expect(req).toHaveBeenCalledTimes(1)
    })

    it('returns the value from req', async () => {
      const mockData = { success: true, inviteId: 'abc123' }
      req.mockResolvedValue(mockData)
      const result = await platformReferralService.trackPlatformInvite()
      expect(result).toEqual(mockData)
    })

    it('propagates errors from req', async () => {
      req.mockRejectedValue(new Error('Server error'))
      await expect(platformReferralService.trackPlatformInvite()).rejects.toThrow('Server error')
    })
  })

  describe('creditPlatformReferral', () => {
    it('calls POST /platform-referrals/credit with provided body', async () => {
      req.mockResolvedValue({ credited: true })
      const body = { userId: 'user123', amount: 50 }
      await platformReferralService.creditPlatformReferral(body)
      expect(req).toHaveBeenCalledWith('POST', '/platform-referrals/credit', body)
      expect(req).toHaveBeenCalledTimes(1)
    })

    it('passes the body through correctly', async () => {
      req.mockResolvedValue({})
      const body = { referralCode: 'REF-XYZ', userId: 'u456', tier: 'gold' }
      await platformReferralService.creditPlatformReferral(body)
      expect(req).toHaveBeenCalledWith('POST', '/platform-referrals/credit', body)
    })

    it('returns the value from req', async () => {
      const mockData = { credited: true, newBalance: 200 }
      req.mockResolvedValue(mockData)
      const result = await platformReferralService.creditPlatformReferral({ userId: 'u1' })
      expect(result).toEqual(mockData)
    })

    it('propagates errors from req', async () => {
      req.mockRejectedValue(new Error('Credit failed'))
      await expect(platformReferralService.creditPlatformReferral({ userId: 'u1' })).rejects.toThrow('Credit failed')
    })
  })

  describe('redeemVerifiedBadge', () => {
    it('calls POST /platform-referrals/redeem-verified-badge with empty body', async () => {
      req.mockResolvedValue({ badge: 'verified' })
      await platformReferralService.redeemVerifiedBadge()
      expect(req).toHaveBeenCalledWith('POST', '/platform-referrals/redeem-verified-badge', {})
      expect(req).toHaveBeenCalledTimes(1)
    })

    it('returns the value from req', async () => {
      const mockData = { badge: 'verified', redeemedAt: '2026-06-29T00:00:00Z' }
      req.mockResolvedValue(mockData)
      const result = await platformReferralService.redeemVerifiedBadge()
      expect(result).toEqual(mockData)
    })

    it('propagates errors from req', async () => {
      req.mockRejectedValue(new Error('Redemption failed'))
      await expect(platformReferralService.redeemVerifiedBadge()).rejects.toThrow('Redemption failed')
    })
  })

  describe('getAdminPlatformReferrals', () => {
    it('calls GET /platform-referrals/admin/all without query string when no params', async () => {
      req.mockResolvedValue([])
      await platformReferralService.getAdminPlatformReferrals()
      expect(req).toHaveBeenCalledWith('GET', '/platform-referrals/admin/all')
      expect(req).toHaveBeenCalledTimes(1)
    })

    it('calls GET /platform-referrals/admin/all without query string when empty params object', async () => {
      req.mockResolvedValue([])
      await platformReferralService.getAdminPlatformReferrals({})
      expect(req).toHaveBeenCalledWith('GET', '/platform-referrals/admin/all')
    })

    it('appends query string for valid params', async () => {
      req.mockResolvedValue([])
      await platformReferralService.getAdminPlatformReferrals({ page: 1, limit: 20 })
      const callArg = req.mock.calls[0][1]
      expect(callArg).toContain('/platform-referrals/admin/all?')
      expect(callArg).toContain('page=1')
      expect(callArg).toContain('limit=20')
    })

    it('filters out undefined and null values from params', async () => {
      req.mockResolvedValue([])
      await platformReferralService.getAdminPlatformReferrals({ page: 1, status: undefined, type: null, limit: 10 })
      const callArg = req.mock.calls[0][1]
      expect(callArg).toContain('page=1')
      expect(callArg).toContain('limit=10')
      expect(callArg).not.toContain('status')
      expect(callArg).not.toContain('type')
    })

    it('passes a single param correctly', async () => {
      req.mockResolvedValue([])
      await platformReferralService.getAdminPlatformReferrals({ status: 'active' })
      expect(req).toHaveBeenCalledWith('GET', '/platform-referrals/admin/all?status=active')
    })

    it('returns the value from req', async () => {
      const mockData = [{ id: '1', userId: 'u1' }, { id: '2', userId: 'u2' }]
      req.mockResolvedValue(mockData)
      const result = await platformReferralService.getAdminPlatformReferrals({ page: 1 })
      expect(result).toEqual(mockData)
    })

    it('propagates errors from req', async () => {
      req.mockRejectedValue(new Error('Unauthorized'))
      await expect(platformReferralService.getAdminPlatformReferrals()).rejects.toThrow('Unauthorized')
    })
  })

  describe('getAdminPlatformReferralStats', () => {
    it('calls GET /platform-referrals/admin/stats', async () => {
      req.mockResolvedValue({ total: 100 })
      await platformReferralService.getAdminPlatformReferralStats()
      expect(req).toHaveBeenCalledWith('GET', '/platform-referrals/admin/stats')
      expect(req).toHaveBeenCalledTimes(1)
    })

    it('returns the value from req', async () => {
      const mockData = { total: 100, credited: 80, pending: 20 }
      req.mockResolvedValue(mockData)
      const result = await platformReferralService.getAdminPlatformReferralStats()
      expect(result).toEqual(mockData)
    })

    it('propagates errors from req', async () => {
      req.mockRejectedValue(new Error('Forbidden'))
      await expect(platformReferralService.getAdminPlatformReferralStats()).rejects.toThrow('Forbidden')
    })
  })
})
