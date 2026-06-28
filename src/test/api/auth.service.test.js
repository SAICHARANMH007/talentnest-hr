import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authService } from '../../api/services/auth.service.js'

vi.mock('../../api/client.js', () => ({
  req: vi.fn(),
  setToken: vi.fn(),
  clearToken: vi.fn(),
  initAuth: vi.fn(),
}))

vi.mock('../../utils/audit.js', () => ({
  logAudit: vi.fn(),
}))

import { req, setToken, clearToken, initAuth } from '../../api/client.js'

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    localStorage.clear()
  })

  // ── login ──────────────────────────────────────────────────────────────────
  describe('login', () => {
    it('calls req with correct method, path and body', async () => {
      req.mockResolvedValue({ token: 'tok', user: { name: 'Alice', role: 'candidate' } })
      await authService.login('a@b.com', 'pass')
      expect(req).toHaveBeenCalledWith('POST', '/auth/login', { email: 'a@b.com', password: 'pass' }, false)
    })

    it('calls setToken when token present in response', async () => {
      req.mockResolvedValue({ token: 'tok123', user: { name: 'Alice', role: 'candidate' } })
      await authService.login('a@b.com', 'pass')
      expect(setToken).toHaveBeenCalledWith('tok123')
    })

    it('stores user in sessionStorage and localStorage', async () => {
      const user = { name: 'Alice', role: 'candidate' }
      req.mockResolvedValue({ token: 'tok', user })
      await authService.login('a@b.com', 'pass')
      expect(JSON.parse(sessionStorage.getItem('tn_user'))).toEqual(user)
      expect(JSON.parse(localStorage.getItem('tn_user'))).toEqual(user)
    })

    it('does NOT call setToken when no token in response (e.g. requires2FA)', async () => {
      req.mockResolvedValue({ requires2FA: true })
      await authService.login('a@b.com', 'pass')
      expect(setToken).not.toHaveBeenCalled()
    })

    it('does NOT store user when response has no user', async () => {
      req.mockResolvedValue({ token: 'tok' })
      await authService.login('a@b.com', 'pass')
      expect(sessionStorage.getItem('tn_user')).toBeNull()
    })

    it('returns the raw response from req', async () => {
      const resp = { token: 'tok', user: { name: 'X', role: 'admin' } }
      req.mockResolvedValue(resp)
      const result = await authService.login('a@b.com', 'pass')
      expect(result).toEqual(resp)
    })
  })

  // ── logout ─────────────────────────────────────────────────────────────────
  describe('logout', () => {
    it('calls clearToken and removes user from both storages', async () => {
      req.mockResolvedValue({})
      sessionStorage.setItem('tn_user', '{"name":"Alice"}')
      localStorage.setItem('tn_user', '{"name":"Alice"}')
      await authService.logout()
      expect(clearToken).toHaveBeenCalled()
      expect(sessionStorage.getItem('tn_user')).toBeNull()
      expect(localStorage.getItem('tn_user')).toBeNull()
    })

    it('does NOT throw even if the logout request fails (network error)', async () => {
      req.mockRejectedValue(new Error('network error'))
      await expect(authService.logout()).resolves.toBeUndefined()
      expect(clearToken).toHaveBeenCalled()
    })
  })

  // ── verifyOtp ──────────────────────────────────────────────────────────────
  describe('verifyOtp', () => {
    it('calls req with correct args', async () => {
      req.mockResolvedValue({ token: 'tok', user: { name: 'X' } })
      await authService.verifyOtp('x@y.com', '123456')
      expect(req).toHaveBeenCalledWith('POST', '/auth/verify-otp', { email: 'x@y.com', otp: '123456' }, false)
    })

    it('calls setToken when response contains a token', async () => {
      req.mockResolvedValue({ token: 'otp-tok', user: { name: 'X', role: 'candidate' } })
      await authService.verifyOtp('x@y.com', '123456')
      expect(setToken).toHaveBeenCalledWith('otp-tok')
    })

    it('stores user in storage after successful OTP verification', async () => {
      const user = { name: 'Y', role: 'recruiter' }
      req.mockResolvedValue({ token: 'tok', user })
      await authService.verifyOtp('x@y.com', '654321')
      expect(JSON.parse(sessionStorage.getItem('tn_user'))).toEqual(user)
    })
  })

  // ── register ───────────────────────────────────────────────────────────────
  describe('register', () => {
    it('calls req with the full payload', async () => {
      const payload = { name: 'Bob', email: 'b@c.com', password: 'pass', role: 'candidate' }
      req.mockResolvedValue({ token: 'tok', user: payload })
      await authService.register(payload)
      expect(req).toHaveBeenCalledWith('POST', '/auth/register', payload, false)
    })

    it('calls setToken after successful registration', async () => {
      req.mockResolvedValue({ token: 'reg-tok', user: { name: 'Bob' } })
      await authService.register({ name: 'Bob' })
      expect(setToken).toHaveBeenCalledWith('reg-tok')
    })
  })

  // ── googleAuth ─────────────────────────────────────────────────────────────
  describe('googleAuth', () => {
    it('calls POST /auth/google with credential and role', async () => {
      req.mockResolvedValue({ token: 'g-tok', user: { name: 'G' } })
      await authService.googleAuth('google-credential-xyz', 'recruiter')
      expect(req).toHaveBeenCalledWith('POST', '/auth/google', { credential: 'google-credential-xyz', role: 'recruiter' }, false)
    })

    it('defaults role to candidate when not specified', async () => {
      req.mockResolvedValue({ token: 'g-tok', user: {} })
      await authService.googleAuth('cred')
      expect(req).toHaveBeenCalledWith('POST', '/auth/google', { credential: 'cred', role: 'candidate' }, false)
    })
  })

  // ── simple passthrough methods ─────────────────────────────────────────────
  describe('passthrough methods', () => {
    it('forgotPassword calls correct endpoint without auth', async () => {
      req.mockResolvedValue({ message: 'sent' })
      await authService.forgotPassword('a@b.com')
      expect(req).toHaveBeenCalledWith('POST', '/auth/forgot-password', { email: 'a@b.com' }, false)
    })

    it('changePassword calls correct endpoint (with auth — no false flag)', async () => {
      req.mockResolvedValue({ message: 'ok' })
      await authService.changePassword('old', 'new')
      expect(req).toHaveBeenCalledWith('POST', '/auth/change-password', { currentPassword: 'old', newPassword: 'new' })
    })

    it('initAuth delegates to client initAuth', async () => {
      initAuth.mockResolvedValue({ token: 'x', user: {} })
      const result = await authService.initAuth()
      expect(initAuth).toHaveBeenCalled()
      expect(result).toEqual({ token: 'x', user: {} })
    })

    it('verifyDomain calls POST /auth/verify-domain', async () => {
      req.mockResolvedValue({ valid: true })
      await authService.verifyDomain('acme.com')
      expect(req).toHaveBeenCalledWith('POST', '/auth/verify-domain', { domain: 'acme.com' }, false)
    })

    it('resendOtp calls POST /auth/resend-otp', async () => {
      req.mockResolvedValue({})
      await authService.resendOtp('a@b.com')
      expect(req).toHaveBeenCalledWith('POST', '/auth/resend-otp', { email: 'a@b.com' }, false)
    })
  })
})
