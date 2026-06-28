import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/client.js', () => ({
  req: vi.fn(),
}))

import { userService } from '../../api/services/user.service.js'
import { req } from '../../api/client.js'

describe('userService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // ── Presence ─────────────────────────────────────────────────────────────────
  describe('sendHeartbeat', () => {
    it('calls POST /presence/heartbeat with empty body', async () => {
      req.mockResolvedValue({})
      await userService.sendHeartbeat()
      expect(req).toHaveBeenCalledWith('POST', '/presence/heartbeat', {})
    })

    it('returns the response value', async () => {
      req.mockResolvedValue({ ok: true })
      const result = await userService.sendHeartbeat()
      expect(result).toEqual({ ok: true })
    })
  })

  describe('getOnlineUsers', () => {
    it('calls GET /presence/online', async () => {
      req.mockResolvedValue([])
      await userService.getOnlineUsers()
      expect(req).toHaveBeenCalledWith('GET', '/presence/online')
    })

    it('returns the list from the response', async () => {
      const users = [{ id: 'u1' }, { id: 'u2' }]
      req.mockResolvedValue(users)
      const result = await userService.getOnlineUsers()
      expect(result).toEqual(users)
    })
  })

  // ── Profile ───────────────────────────────────────────────────────────────────
  describe('getProfile', () => {
    it('calls GET /users/me', async () => {
      req.mockResolvedValue({})
      await userService.getProfile()
      expect(req).toHaveBeenCalledWith('GET', '/users/me')
    })

    it('returns the profile data', async () => {
      const profile = { _id: 'u1', name: 'Alice' }
      req.mockResolvedValue(profile)
      const result = await userService.getProfile()
      expect(result).toEqual(profile)
    })
  })

  describe('updateProfile', () => {
    it('calls PATCH /users/me with the provided data', async () => {
      req.mockResolvedValue({})
      const data = { name: 'Bob', phone: '1234' }
      await userService.updateProfile(data)
      expect(req).toHaveBeenCalledWith('PATCH', '/users/me', data)
    })

    it('returns the updated profile', async () => {
      const updated = { name: 'Bob' }
      req.mockResolvedValue(updated)
      const result = await userService.updateProfile({ name: 'Bob' })
      expect(result).toEqual(updated)
    })
  })

  describe('verifyInvite', () => {
    it('calls GET with encoded token and email, no auth', async () => {
      req.mockResolvedValue({})
      await userService.verifyInvite('abc123', 'user@example.com')
      expect(req).toHaveBeenCalledWith(
        'GET',
        '/auth/verify-invite?token=abc123&email=user%40example.com',
        null,
        false
      )
    })

    it('URL-encodes special characters in token', async () => {
      req.mockResolvedValue({})
      await userService.verifyInvite('tok en+1', 'a@b.com')
      const url = req.mock.calls[0][1]
      expect(url).toContain('token=tok%20en%2B1')
    })

    it('passes false as 4th argument to skip auth', async () => {
      req.mockResolvedValue({})
      await userService.verifyInvite('t', 'e@e.com')
      expect(req.mock.calls[0][3]).toBe(false)
    })
  })

  // ── Invites ───────────────────────────────────────────────────────────────────
  describe('inviteAdmin', () => {
    it('calls POST /admin/invite-admin with data', async () => {
      req.mockResolvedValue({})
      const data = { email: 'admin@co.com', name: 'Admin' }
      await userService.inviteAdmin(data)
      expect(req).toHaveBeenCalledWith('POST', '/admin/invite-admin', data)
    })
  })

  describe('inviteRecruiter', () => {
    it('calls POST /admin/invite-recruiter with data', async () => {
      req.mockResolvedValue({})
      const data = { email: 'rec@co.com' }
      await userService.inviteRecruiter(data)
      expect(req).toHaveBeenCalledWith('POST', '/admin/invite-recruiter', data)
    })
  })

  describe('inviteCandidate', () => {
    it('calls POST /recruiter/invite-candidate with data', async () => {
      req.mockResolvedValue({})
      const data = { email: 'cand@co.com' }
      await userService.inviteCandidate(data)
      expect(req).toHaveBeenCalledWith('POST', '/recruiter/invite-candidate', data)
    })
  })

  describe('resendInvite', () => {
    it('calls POST /admin/resend-invite with userId in body', async () => {
      req.mockResolvedValue({})
      await userService.resendInvite('u99')
      expect(req).toHaveBeenCalledWith('POST', '/admin/resend-invite', { userId: 'u99' })
    })
  })

  describe('revokeInvite', () => {
    it('calls DELETE /admin/revoke-invite/:userId', async () => {
      req.mockResolvedValue({})
      await userService.revokeInvite('u42')
      expect(req).toHaveBeenCalledWith('DELETE', '/admin/revoke-invite/u42')
    })
  })

  describe('getPendingInvites', () => {
    it('calls GET /admin/pending-invites', async () => {
      req.mockResolvedValue([])
      await userService.getPendingInvites()
      expect(req).toHaveBeenCalledWith('GET', '/admin/pending-invites')
    })
  })

  // ── Settings & Org ────────────────────────────────────────────────────────────
  describe('updateSettings', () => {
    it('calls PATCH /users/me/settings wrapping settings in object', async () => {
      req.mockResolvedValue({})
      const settings = { theme: 'dark', notifications: true }
      await userService.updateSettings(settings)
      expect(req).toHaveBeenCalledWith('PATCH', '/users/me/settings', { settings })
    })
  })

  describe('getOrgLogo', () => {
    it('calls GET /orgs/logo', async () => {
      req.mockResolvedValue({})
      await userService.getOrgLogo()
      expect(req).toHaveBeenCalledWith('GET', '/orgs/logo')
    })
  })

  describe('uploadOrgLogo', () => {
    it('calls POST /orgs/logo/upload with logoUrl', async () => {
      req.mockResolvedValue({})
      await userService.uploadOrgLogo('https://cdn.example.com/logo.png')
      expect(req).toHaveBeenCalledWith('POST', '/orgs/logo/upload', { logoUrl: 'https://cdn.example.com/logo.png' })
    })
  })

  describe('deleteOrgLogo', () => {
    it('calls DELETE /orgs/logo', async () => {
      req.mockResolvedValue({})
      await userService.deleteOrgLogo()
      expect(req).toHaveBeenCalledWith('DELETE', '/orgs/logo')
    })
  })

  describe('getOrg', () => {
    it('calls GET /orgs/:id', async () => {
      req.mockResolvedValue({})
      await userService.getOrg('org1')
      expect(req).toHaveBeenCalledWith('GET', '/orgs/org1')
    })
  })

  describe('createOrg', () => {
    it('calls POST /orgs with data', async () => {
      req.mockResolvedValue({})
      const data = { name: 'ACME Corp' }
      await userService.createOrg(data)
      expect(req).toHaveBeenCalledWith('POST', '/orgs', data)
    })
  })

  describe('updateOrg', () => {
    it('calls PATCH /orgs/:id with data', async () => {
      req.mockResolvedValue({})
      const data = { name: 'New Name' }
      await userService.updateOrg('org1', data)
      expect(req).toHaveBeenCalledWith('PATCH', '/orgs/org1', data)
    })
  })

  describe('deleteOrg', () => {
    it('calls DELETE /orgs/:id', async () => {
      req.mockResolvedValue({})
      await userService.deleteOrg('org1')
      expect(req).toHaveBeenCalledWith('DELETE', '/orgs/org1')
    })
  })

  describe('updateOrgPlan', () => {
    it('calls PATCH /orgs/:orgId/plan with payload', async () => {
      req.mockResolvedValue({})
      const payload = { plan: 'pro' }
      await userService.updateOrgPlan('org1', payload)
      expect(req).toHaveBeenCalledWith('PATCH', '/orgs/org1/plan', payload)
    })
  })

  // ── Member Management ─────────────────────────────────────────────────────────
  describe('updateMyLoginLocation', () => {
    it('calls PATCH /users/me/location with lat, lng, city, country', async () => {
      req.mockResolvedValue({})
      await userService.updateMyLoginLocation({ lat: 12.34, lng: 56.78, city: 'Mumbai', country: 'India' })
      expect(req).toHaveBeenCalledWith('PATCH', '/users/me/location', {
        lat: 12.34, lng: 56.78, city: 'Mumbai', country: 'India'
      })
    })

    it('defaults city and country to empty string when not provided', async () => {
      req.mockResolvedValue({})
      await userService.updateMyLoginLocation({ lat: 1.0, lng: 2.0 })
      expect(req).toHaveBeenCalledWith('PATCH', '/users/me/location', {
        lat: 1.0, lng: 2.0, city: '', country: ''
      })
    })
  })

  describe('getUser', () => {
    it('calls GET /users/:id', async () => {
      req.mockResolvedValue({})
      await userService.getUser('u5')
      expect(req).toHaveBeenCalledWith('GET', '/users/u5')
    })
  })

  describe('updateUser', () => {
    it('calls PATCH /users/:id with data', async () => {
      req.mockResolvedValue({})
      await userService.updateUser('u5', { name: 'Alice' })
      expect(req).toHaveBeenCalledWith('PATCH', '/users/u5', { name: 'Alice' })
    })
  })

  describe('getUsers', () => {
    it('with string "candidate" → calls GET /users/candidates?limit=10000000 and returns array', async () => {
      req.mockResolvedValue([{ _id: 'c1' }])
      const result = await userService.getUsers('candidate')
      expect(req).toHaveBeenCalledWith('GET', '/users/candidates?limit=10000000')
      expect(Array.isArray(result)).toBe(true)
    })

    it('with other role string → calls GET /users?role=<role>&limit=10000000', async () => {
      req.mockResolvedValue([{ _id: 'u1' }])
      await userService.getUsers('recruiter')
      expect(req).toHaveBeenCalledWith('GET', '/users?role=recruiter&limit=10000000')
    })

    it('with object params → builds URLSearchParams URL', async () => {
      req.mockResolvedValue({ data: [{ _id: 'u1' }] })
      await userService.getUsers({ role: 'admin', limit: 50 })
      const url = req.mock.calls[0][1]
      expect(url).toContain('role=admin')
      expect(url).toContain('limit=50')
    })

    it('with role=candidate in params object → uses /users/candidates URL', async () => {
      req.mockResolvedValue({ candidates: [{ _id: 'c1' }] })
      const result = await userService.getUsers({ role: 'candidate' })
      const url = req.mock.calls[0][1]
      expect(url).toContain('/users/candidates')
      expect(Array.isArray(result)).toBe(true)
    })

    it('with fullResponse=true → returns raw response object', async () => {
      const raw = { data: [{ _id: 'u1' }], total: 1 }
      req.mockResolvedValue(raw)
      const result = await userService.getUsers({ fullResponse: true })
      expect(result).toEqual(raw)
    })

    it('omits empty-string and undefined values from query params', async () => {
      req.mockResolvedValue([])
      await userService.getUsers({ role: 'admin', search: '', status: undefined })
      const url = req.mock.calls[0][1]
      expect(url).not.toContain('search=')
      expect(url).not.toContain('status=')
    })
  })

  describe('getUsersList', () => {
    it('calls GET /users? with default limit when no params given', async () => {
      req.mockResolvedValue({ data: [] })
      await userService.getUsersList()
      const url = req.mock.calls[0][1]
      expect(url).toMatch(/^\/users\?/)
      expect(url).toContain('limit=10000000')
    })

    it('includes provided params in query string', async () => {
      req.mockResolvedValue({ data: [] })
      await userService.getUsersList({ role: 'recruiter', page: 2 })
      const url = req.mock.calls[0][1]
      expect(url).toContain('role=recruiter')
      expect(url).toContain('page=2')
    })

    it('skips empty-string and null values', async () => {
      req.mockResolvedValue({ data: [] })
      await userService.getUsersList({ role: 'admin', search: '', status: null })
      const url = req.mock.calls[0][1]
      expect(url).not.toContain('search=')
      expect(url).not.toContain('status=')
    })
  })

  describe('getUserCount', () => {
    it('calls GET /users/count without role param when no role given', async () => {
      req.mockResolvedValue({ count: 10 })
      await userService.getUserCount()
      expect(req).toHaveBeenCalledWith('GET', '/users/count')
    })

    it('calls GET /users/count?role=<role> when role is provided', async () => {
      req.mockResolvedValue({ count: 5 })
      await userService.getUserCount('candidate')
      expect(req).toHaveBeenCalledWith('GET', '/users/count?role=candidate')
    })
  })

  describe('createUser', () => {
    it('calls POST /users with data', async () => {
      req.mockResolvedValue({ _id: 'new' })
      const data = { email: 'new@co.com', role: 'recruiter' }
      await userService.createUser(data)
      expect(req).toHaveBeenCalledWith('POST', '/users', data)
    })
  })

  describe('deleteUser', () => {
    it('calls DELETE /users/:id', async () => {
      req.mockResolvedValue({})
      await userService.deleteUser('u7')
      expect(req).toHaveBeenCalledWith('DELETE', '/users/u7')
    })
  })

  describe('resendUserInvite', () => {
    it('calls POST /users/:id/resend-invite with empty body', async () => {
      req.mockResolvedValue({})
      await userService.resendUserInvite('u8')
      expect(req).toHaveBeenCalledWith('POST', '/users/u8/resend-invite', {})
    })
  })

  // ── Bulk & Advanced ───────────────────────────────────────────────────────────
  describe('bulkImportCandidates', () => {
    it('calls POST /users/bulk-import with candidates wrapped in object', async () => {
      req.mockResolvedValue({})
      const candidates = [{ email: 'a@b.com' }, { email: 'c@d.com' }]
      await userService.bulkImportCandidates(candidates)
      expect(req).toHaveBeenCalledWith('POST', '/users/bulk-import', { candidates })
    })
  })

  describe('inviteGuestCandidates', () => {
    it('calls POST /users/invite-guests with candidates wrapped in object', async () => {
      req.mockResolvedValue({})
      const candidates = [{ email: 'g@b.com', name: 'Guest' }]
      await userService.inviteGuestCandidates(candidates)
      expect(req).toHaveBeenCalledWith('POST', '/users/invite-guests', { candidates })
    })
  })

  describe('bulkUpdateTA', () => {
    it('calls PATCH /users/bulk-ta with body', async () => {
      req.mockResolvedValue({})
      const body = { userIds: ['u1', 'u2'], taId: 'ta1' }
      await userService.bulkUpdateTA(body)
      expect(req).toHaveBeenCalledWith('PATCH', '/users/bulk-ta', body)
    })
  })

  describe('markReachOut', () => {
    it('calls PATCH /users/:id/reach-out with note in body', async () => {
      req.mockResolvedValue({})
      await userService.markReachOut('u10', 'Follow up next week')
      expect(req).toHaveBeenCalledWith('PATCH', '/users/u10/reach-out', { note: 'Follow up next week' })
    })
  })

  describe('assignCandidate', () => {
    it('calls PATCH /users/:id/assign with recruiterId in body', async () => {
      req.mockResolvedValue({})
      await userService.assignCandidate('u11', 'r3')
      expect(req).toHaveBeenCalledWith('PATCH', '/users/u11/assign', { recruiterId: 'r3' })
    })
  })

  describe('mergeUsers', () => {
    it('calls POST /users/merge with primaryId and duplicateId', async () => {
      req.mockResolvedValue({})
      await userService.mergeUsers('primary1', 'dup1')
      expect(req).toHaveBeenCalledWith('POST', '/users/merge', { primaryId: 'primary1', duplicateId: 'dup1' })
    })
  })

  describe('mergeCandidates', () => {
    it('calls POST /candidates/merge with payload', async () => {
      req.mockResolvedValue({})
      const payload = { primaryId: 'p1', duplicateIds: ['d1', 'd2'] }
      await userService.mergeCandidates(payload)
      expect(req).toHaveBeenCalledWith('POST', '/candidates/merge', payload)
    })
  })

  describe('findDuplicateCandidates', () => {
    it('calls GET /candidates/find-duplicates', async () => {
      req.mockResolvedValue({ data: [] })
      await userService.findDuplicateCandidates()
      expect(req).toHaveBeenCalledWith('GET', '/candidates/find-duplicates')
    })

    it('returns r.data when present', async () => {
      const dupes = [{ _id: 'd1' }, { _id: 'd2' }]
      req.mockResolvedValue({ data: dupes })
      const result = await userService.findDuplicateCandidates()
      expect(result).toEqual(dupes)
    })

    it('returns empty array when response has no data property', async () => {
      req.mockResolvedValue({})
      const result = await userService.findDuplicateCandidates()
      expect(result).toEqual([])
    })

    it('returns empty array when response is null', async () => {
      req.mockResolvedValue(null)
      const result = await userService.findDuplicateCandidates()
      expect(result).toEqual([])
    })
  })

  describe('adminResetPassword', () => {
    it('calls PATCH /users/:userId/change-password with newPassword in body', async () => {
      req.mockResolvedValue({})
      await userService.adminResetPassword('u12', 'Secret123!')
      expect(req).toHaveBeenCalledWith('PATCH', '/users/u12/change-password', { newPassword: 'Secret123!' })
    })
  })

  // ── Candidate Model ───────────────────────────────────────────────────────────
  describe('getCandidates', () => {
    it('calls GET /candidates? with no params gives empty query string', async () => {
      req.mockResolvedValue({ data: [] })
      await userService.getCandidates()
      const url = req.mock.calls[0][1]
      expect(url).toMatch(/^\/candidates\?/)
    })

    it('builds query string from provided params', async () => {
      req.mockResolvedValue({ data: [] })
      await userService.getCandidates({ status: 'active', limit: 100 })
      const url = req.mock.calls[0][1]
      expect(url).toContain('status=active')
      expect(url).toContain('limit=100')
    })

    it('skips empty-string values from params', async () => {
      req.mockResolvedValue({ data: [] })
      await userService.getCandidates({ status: '' })
      const url = req.mock.calls[0][1]
      expect(url).not.toContain('status=')
    })

    it('returns the raw response', async () => {
      const response = { data: [{ _id: 'c1' }], total: 1 }
      req.mockResolvedValue(response)
      const result = await userService.getCandidates()
      expect(result).toEqual(response)
    })
  })

  describe('getCandidate', () => {
    it('calls GET /candidates/:id', async () => {
      req.mockResolvedValue({ data: { _id: 'c1' } })
      await userService.getCandidate('c1')
      expect(req).toHaveBeenCalledWith('GET', '/candidates/c1')
    })

    it('returns r.data when present', async () => {
      const candidate = { _id: 'c1', name: 'Alice' }
      req.mockResolvedValue({ data: candidate })
      const result = await userService.getCandidate('c1')
      expect(result).toEqual(candidate)
    })

    it('returns raw response when data property is absent', async () => {
      const candidate = { _id: 'c1', name: 'Alice' }
      req.mockResolvedValue(candidate)
      const result = await userService.getCandidate('c1')
      expect(result).toEqual(candidate)
    })
  })

  describe('updateCandidate', () => {
    it('calls PATCH /candidates/:id with data', async () => {
      req.mockResolvedValue({ data: { _id: 'c1' } })
      await userService.updateCandidate('c1', { skills: ['JS'] })
      expect(req).toHaveBeenCalledWith('PATCH', '/candidates/c1', { skills: ['JS'] })
    })

    it('returns r.data when present', async () => {
      const updated = { _id: 'c1', skills: ['JS'] }
      req.mockResolvedValue({ data: updated })
      const result = await userService.updateCandidate('c1', { skills: ['JS'] })
      expect(result).toEqual(updated)
    })

    it('returns raw response when data property absent', async () => {
      const updated = { _id: 'c1' }
      req.mockResolvedValue(updated)
      const result = await userService.updateCandidate('c1', {})
      expect(result).toEqual(updated)
    })
  })

  describe('getCandidateFullTimeline', () => {
    it('calls GET /candidates/:id/full-timeline', async () => {
      req.mockResolvedValue({ data: [] })
      await userService.getCandidateFullTimeline('c1')
      expect(req).toHaveBeenCalledWith('GET', '/candidates/c1/full-timeline')
    })

    it('returns r.data when present', async () => {
      const timeline = [{ event: 'applied' }]
      req.mockResolvedValue({ data: timeline })
      const result = await userService.getCandidateFullTimeline('c1')
      expect(result).toEqual(timeline)
    })

    it('returns raw response when data property absent', async () => {
      const timeline = [{ event: 'applied' }]
      req.mockResolvedValue(timeline)
      const result = await userService.getCandidateFullTimeline('c1')
      expect(result).toEqual(timeline)
    })
  })

  // ── BGV Documents ─────────────────────────────────────────────────────────────
  describe('getBgvDocuments', () => {
    it('calls GET /bgv', async () => {
      req.mockResolvedValue([])
      await userService.getBgvDocuments()
      expect(req).toHaveBeenCalledWith('GET', '/bgv')
    })
  })

  describe('getBgvDocumentsForUser', () => {
    it('calls GET /bgv/user/:userId', async () => {
      req.mockResolvedValue([])
      await userService.getBgvDocumentsForUser('u20')
      expect(req).toHaveBeenCalledWith('GET', '/bgv/user/u20')
    })
  })

  describe('getBgvDocumentFile', () => {
    it('calls GET /bgv/:docId/file', async () => {
      req.mockResolvedValue({})
      await userService.getBgvDocumentFile('doc1')
      expect(req).toHaveBeenCalledWith('GET', '/bgv/doc1/file')
    })
  })

  describe('uploadBgvDocument', () => {
    it('calls POST /bgv with formData', async () => {
      req.mockResolvedValue({})
      const formData = { file: 'data' }
      await userService.uploadBgvDocument(formData)
      expect(req).toHaveBeenCalledWith('POST', '/bgv', formData)
    })
  })

  describe('verifyBgvDocument', () => {
    it('calls PATCH /bgv/:docId/verify with body', async () => {
      req.mockResolvedValue({})
      const body = { status: 'verified' }
      await userService.verifyBgvDocument('doc1', body)
      expect(req).toHaveBeenCalledWith('PATCH', '/bgv/doc1/verify', body)
    })
  })

  describe('deleteBgvDocument', () => {
    it('calls DELETE /bgv/:docId', async () => {
      req.mockResolvedValue({})
      await userService.deleteBgvDocument('doc1')
      expect(req).toHaveBeenCalledWith('DELETE', '/bgv/doc1')
    })
  })

  describe('getAllBgvSubmissions', () => {
    it('calls GET /bgv/admin/all without query string when qs is falsy', async () => {
      req.mockResolvedValue([])
      await userService.getAllBgvSubmissions('')
      expect(req).toHaveBeenCalledWith('GET', '/bgv/admin/all')
    })

    it('appends query string when qs is provided', async () => {
      req.mockResolvedValue([])
      await userService.getAllBgvSubmissions('status=pending&page=1')
      expect(req).toHaveBeenCalledWith('GET', '/bgv/admin/all?status=pending&page=1')
    })

    it('calls without query string when qs is undefined', async () => {
      req.mockResolvedValue([])
      await userService.getAllBgvSubmissions(undefined)
      expect(req).toHaveBeenCalledWith('GET', '/bgv/admin/all')
    })
  })
})
