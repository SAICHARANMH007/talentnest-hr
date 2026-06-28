import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/client.js', () => ({
  req: vi.fn(),
  downloadBlob: vi.fn(),
  uploadFormData: vi.fn(),
}))

import { platformService } from '../../api/services/platform.service.js'
import { req, downloadBlob, uploadFormData } from '../../api/client.js'

describe('platformService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // ── Email ─────────────────────────────────────────────────────────────────────
  describe('sendEmail', () => {
    it('calls POST /email/send with to, subject, body, cc', async () => {
      req.mockResolvedValue({})
      await platformService.sendEmail('a@b.com', 'Hello', 'Body text', 'c@d.com')
      expect(req).toHaveBeenCalledWith('POST', '/email/send', {
        to: 'a@b.com', subject: 'Hello', body: 'Body text', cc: 'c@d.com'
      })
    })

    it('passes undefined cc when not provided', async () => {
      req.mockResolvedValue({})
      await platformService.sendEmail('a@b.com', 'Hello', 'Body text', undefined)
      expect(req.mock.calls[0][2].cc).toBeUndefined()
    })
  })

  describe('testSmtp', () => {
    it('calls POST /email/test-smtp with all SMTP params', async () => {
      req.mockResolvedValue({})
      await platformService.testSmtp('smtp.host.com', 587, 'user', 'pass', 'smtp', 'key123', 'TalentNest')
      expect(req).toHaveBeenCalledWith('POST', '/email/test-smtp', {
        host: 'smtp.host.com', port: 587, user: 'user', pass: 'pass',
        provider: 'smtp', apiKey: 'key123', fromName: 'TalentNest'
      })
    })
  })

  describe('getEmailLogs', () => {
    it('calls GET /email/logs without query string when qs is falsy', async () => {
      req.mockResolvedValue([])
      await platformService.getEmailLogs('')
      expect(req).toHaveBeenCalledWith('GET', '/email/logs')
    })

    it('appends query string when qs is provided', async () => {
      req.mockResolvedValue([])
      await platformService.getEmailLogs('status=failed&page=2')
      expect(req).toHaveBeenCalledWith('GET', '/email/logs?status=failed&page=2')
    })

    it('works with undefined qs', async () => {
      req.mockResolvedValue([])
      await platformService.getEmailLogs(undefined)
      expect(req).toHaveBeenCalledWith('GET', '/email/logs')
    })
  })

  describe('resendEmail', () => {
    it('calls POST /email/logs/:logId/resend with empty body', async () => {
      req.mockResolvedValue({})
      await platformService.resendEmail('log1')
      expect(req).toHaveBeenCalledWith('POST', '/email/logs/log1/resend', {})
    })
  })

  // ── Platform Config ───────────────────────────────────────────────────────────
  describe('getPlatformConfig', () => {
    it('calls GET /platform/config', async () => {
      req.mockResolvedValue({})
      await platformService.getPlatformConfig()
      expect(req).toHaveBeenCalledWith('GET', '/platform/config')
    })
  })

  describe('savePlatformSecurity', () => {
    it('calls PATCH /platform/security with data', async () => {
      req.mockResolvedValue({})
      const data = { mfaRequired: true }
      await platformService.savePlatformSecurity(data)
      expect(req).toHaveBeenCalledWith('PATCH', '/platform/security', data)
    })
  })

  describe('savePlatformFlags', () => {
    it('calls PATCH /platform/flags with flags wrapped in object', async () => {
      req.mockResolvedValue({})
      const flags = { featureA: true, featureB: false }
      await platformService.savePlatformFlags(flags)
      expect(req).toHaveBeenCalledWith('PATCH', '/platform/flags', { flags })
    })
  })

  // ── Billing ───────────────────────────────────────────────────────────────────
  describe('getBillingUsage', () => {
    it('calls GET /billing/usage', async () => {
      req.mockResolvedValue({})
      await platformService.getBillingUsage()
      expect(req).toHaveBeenCalledWith('GET', '/billing/usage')
    })
  })

  describe('getBillingPlans', () => {
    it('calls GET /billing/plans', async () => {
      req.mockResolvedValue([])
      await platformService.getBillingPlans()
      expect(req).toHaveBeenCalledWith('GET', '/billing/plans')
    })
  })

  describe('createBillingOrder', () => {
    it('calls POST /billing/create-order with planName in body', async () => {
      req.mockResolvedValue({})
      await platformService.createBillingOrder('pro')
      expect(req).toHaveBeenCalledWith('POST', '/billing/create-order', { planName: 'pro' })
    })
  })

  describe('verifyBillingPayment', () => {
    it('calls POST /billing/verify-payment with data', async () => {
      req.mockResolvedValue({})
      const data = { orderId: 'ord1', paymentId: 'pay1', signature: 'sig1' }
      await platformService.verifyBillingPayment(data)
      expect(req).toHaveBeenCalledWith('POST', '/billing/verify-payment', data)
    })
  })

  describe('getBillingInvoices', () => {
    it('calls GET /billing/invoices', async () => {
      req.mockResolvedValue([])
      await platformService.getBillingInvoices()
      expect(req).toHaveBeenCalledWith('GET', '/billing/invoices')
    })
  })

  describe('updateBillingDetails', () => {
    it('calls PATCH /billing/details with data', async () => {
      req.mockResolvedValue({})
      const data = { gstNumber: 'GST123', address: '123 Main St' }
      await platformService.updateBillingDetails(data)
      expect(req).toHaveBeenCalledWith('PATCH', '/billing/details', data)
    })
  })

  // ── Org Settings ──────────────────────────────────────────────────────────────
  describe('getMyOrg', () => {
    it('calls GET /orgs/my-org', async () => {
      req.mockResolvedValue({})
      await platformService.getMyOrg()
      expect(req).toHaveBeenCalledWith('GET', '/orgs/my-org')
    })
  })

  describe('getOrgSettings', () => {
    it('calls GET /orgs/:id', async () => {
      req.mockResolvedValue({})
      await platformService.getOrgSettings('org1')
      expect(req).toHaveBeenCalledWith('GET', '/orgs/org1')
    })
  })

  describe('updateOrgSettings', () => {
    it('calls PATCH /orgs/:id with data', async () => {
      req.mockResolvedValue({})
      const data = { name: 'New Org Name' }
      await platformService.updateOrgSettings('org1', data)
      expect(req).toHaveBeenCalledWith('PATCH', '/orgs/org1', data)
    })
  })

  // ── Notifications ─────────────────────────────────────────────────────────────
  describe('getNotifications', () => {
    it('calls GET /notifications', async () => {
      req.mockResolvedValue([])
      await platformService.getNotifications()
      expect(req).toHaveBeenCalledWith('GET', '/notifications')
    })
  })

  describe('markAllRead', () => {
    it('calls PATCH /notifications/read-all with empty body', async () => {
      req.mockResolvedValue({})
      await platformService.markAllRead()
      expect(req).toHaveBeenCalledWith('PATCH', '/notifications/read-all', {})
    })
  })

  describe('markRead', () => {
    it('calls PATCH /notifications/:id/read with empty body', async () => {
      req.mockResolvedValue({})
      await platformService.markRead('notif1')
      expect(req).toHaveBeenCalledWith('PATCH', '/notifications/notif1/read', {})
    })
  })

  describe('clearAllNotifications', () => {
    it('calls DELETE /notifications', async () => {
      req.mockResolvedValue({})
      await platformService.clearAllNotifications()
      expect(req).toHaveBeenCalledWith('DELETE', '/notifications')
    })
  })

  describe('generatePlatformNotifications', () => {
    it('calls POST /notifications/platform-summary with empty body', async () => {
      req.mockResolvedValue({})
      await platformService.generatePlatformNotifications()
      expect(req).toHaveBeenCalledWith('POST', '/notifications/platform-summary', {})
    })
  })

  describe('getNotificationPreferences', () => {
    it('calls GET /notifications/preferences', async () => {
      req.mockResolvedValue({})
      await platformService.getNotificationPreferences()
      expect(req).toHaveBeenCalledWith('GET', '/notifications/preferences')
    })
  })

  describe('updateNotificationPreferences', () => {
    it('calls PATCH /notifications/preferences with muted wrapped in object', async () => {
      req.mockResolvedValue({})
      const muted = ['email', 'sms']
      await platformService.updateNotificationPreferences(muted)
      expect(req).toHaveBeenCalledWith('PATCH', '/notifications/preferences', { muted })
    })
  })

  // ── Contact Leads ─────────────────────────────────────────────────────────────
  describe('getLeads', () => {
    it('calls GET /leads without query string when status is falsy', async () => {
      req.mockResolvedValue([])
      await platformService.getLeads('')
      expect(req).toHaveBeenCalledWith('GET', '/leads')
    })

    it('appends ?status=<status> when status is provided', async () => {
      req.mockResolvedValue([])
      await platformService.getLeads('new')
      expect(req).toHaveBeenCalledWith('GET', '/leads?status=new')
    })

    it('works with undefined status', async () => {
      req.mockResolvedValue([])
      await platformService.getLeads(undefined)
      expect(req).toHaveBeenCalledWith('GET', '/leads')
    })
  })

  describe('updateLead', () => {
    it('calls PATCH /leads/:id with data', async () => {
      req.mockResolvedValue({})
      const data = { status: 'contacted' }
      await platformService.updateLead('lead1', data)
      expect(req).toHaveBeenCalledWith('PATCH', '/leads/lead1', data)
    })
  })

  describe('submitLead', () => {
    it('calls POST /leads with data and false auth flag', async () => {
      req.mockResolvedValue({})
      const data = { name: 'John', email: 'john@co.com' }
      await platformService.submitLead(data)
      expect(req).toHaveBeenCalledWith('POST', '/leads', data, false)
    })
  })

  // ── Invites (Candidate-Job) ───────────────────────────────────────────────────
  describe('sendInvites', () => {
    it('calls POST /invites with candidateIds, jobId, message', async () => {
      req.mockResolvedValue({})
      await platformService.sendInvites(['c1', 'c2'], 'j1', 'Please apply!')
      expect(req).toHaveBeenCalledWith('POST', '/invites', {
        candidateIds: ['c1', 'c2'], jobId: 'j1', message: 'Please apply!'
      })
    })
  })

  describe('getInvites', () => {
    it('calls GET /invites without qs when no params', async () => {
      req.mockResolvedValue([])
      await platformService.getInvites()
      expect(req).toHaveBeenCalledWith('GET', '/invites')
    })

    it('appends query string from params object', async () => {
      req.mockResolvedValue([])
      await platformService.getInvites({ jobId: 'j1', status: 'pending' })
      const url = req.mock.calls[0][1]
      expect(url).toContain('jobId=j1')
      expect(url).toContain('status=pending')
    })
  })

  describe('getMyInvites', () => {
    it('calls GET /invites/mine', async () => {
      req.mockResolvedValue([])
      await platformService.getMyInvites()
      expect(req).toHaveBeenCalledWith('GET', '/invites/mine')
    })
  })

  describe('getInviteByToken', () => {
    it('calls GET /invites/:token with false auth flag', async () => {
      req.mockResolvedValue({})
      await platformService.getInviteByToken('tok123')
      expect(req).toHaveBeenCalledWith('GET', '/invites/tok123', null, false)
    })
  })

  describe('respondToInvite', () => {
    it('calls PATCH /invites/:token/respond with response and false auth flag', async () => {
      req.mockResolvedValue({})
      await platformService.respondToInvite('tok123', 'accept')
      expect(req).toHaveBeenCalledWith('PATCH', '/invites/tok123/respond', { response: 'accept' }, false)
    })
  })

  describe('deleteInvite', () => {
    it('calls DELETE /invites/:id', async () => {
      req.mockResolvedValue({})
      await platformService.deleteInvite('inv1')
      expect(req).toHaveBeenCalledWith('DELETE', '/invites/inv1')
    })
  })

  describe('resendInvite', () => {
    it('calls POST /invites/:id/resend with empty body', async () => {
      req.mockResolvedValue({})
      await platformService.resendInvite('inv1')
      expect(req).toHaveBeenCalledWith('POST', '/invites/inv1/resend', {})
    })
  })

  describe('updateInviteStatus', () => {
    it('calls PATCH /invites/:id/status with status in body', async () => {
      req.mockResolvedValue({})
      await platformService.updateInviteStatus('inv1', 'accepted')
      expect(req).toHaveBeenCalledWith('PATCH', '/invites/inv1/status', { status: 'accepted' })
    })
  })

  describe('logJobShare', () => {
    it('calls POST /invites/log-share with data', async () => {
      req.mockResolvedValue({})
      const data = { jobId: 'j1', platform: 'LinkedIn' }
      await platformService.logJobShare(data)
      expect(req).toHaveBeenCalledWith('POST', '/invites/log-share', data)
    })
  })

  // ── Assessments ───────────────────────────────────────────────────────────────
  describe('listAssessments', () => {
    it('calls GET /assessments without qs when qs is falsy', async () => {
      req.mockResolvedValue([])
      await platformService.listAssessments('')
      expect(req).toHaveBeenCalledWith('GET', '/assessments')
    })

    it('appends qs string when provided', async () => {
      req.mockResolvedValue([])
      await platformService.listAssessments('jobId=j1&status=active')
      expect(req).toHaveBeenCalledWith('GET', '/assessments?jobId=j1&status=active')
    })
  })

  describe('getAssessment', () => {
    it('calls GET /assessments/:id', async () => {
      req.mockResolvedValue({})
      await platformService.getAssessment('a1')
      expect(req).toHaveBeenCalledWith('GET', '/assessments/a1')
    })
  })

  describe('getAssessmentForJob', () => {
    it('calls GET /assessments/job/:jobId', async () => {
      req.mockResolvedValue({})
      await platformService.getAssessmentForJob('j1')
      expect(req).toHaveBeenCalledWith('GET', '/assessments/job/j1')
    })
  })

  describe('getPublicAssessmentForJob', () => {
    it('calls GET /assessments/public/job/:jobId with false auth flag', async () => {
      req.mockResolvedValue({})
      await platformService.getPublicAssessmentForJob('j1')
      expect(req).toHaveBeenCalledWith('GET', '/assessments/public/job/j1', null, false)
    })
  })

  describe('createAssessment', () => {
    it('calls POST /assessments with data', async () => {
      req.mockResolvedValue({})
      const data = { title: 'JS Test', questions: [] }
      await platformService.createAssessment(data)
      expect(req).toHaveBeenCalledWith('POST', '/assessments', data)
    })
  })

  describe('updateAssessment', () => {
    it('calls PATCH /assessments/:id with data', async () => {
      req.mockResolvedValue({})
      const data = { title: 'Updated JS Test' }
      await platformService.updateAssessment('a1', data)
      expect(req).toHaveBeenCalledWith('PATCH', '/assessments/a1', data)
    })
  })

  describe('deleteAssessment', () => {
    it('calls DELETE /assessments/:id', async () => {
      req.mockResolvedValue({})
      await platformService.deleteAssessment('a1')
      expect(req).toHaveBeenCalledWith('DELETE', '/assessments/a1')
    })
  })

  describe('startAssessment', () => {
    it('calls POST /assessments/:id/start with empty body', async () => {
      req.mockResolvedValue({})
      await platformService.startAssessment('a1')
      expect(req).toHaveBeenCalledWith('POST', '/assessments/a1/start', {})
    })
  })

  describe('submitAssessment', () => {
    it('calls POST /assessments/:id/submit with answers, autoSubmitted=false, violations=[]', async () => {
      req.mockResolvedValue({})
      const answers = [{ questionId: 'q1', answer: 'A' }]
      await platformService.submitAssessment('a1', answers)
      expect(req).toHaveBeenCalledWith('POST', '/assessments/a1/submit', {
        answers, autoSubmitted: false, violations: []
      })
    })

    it('passes custom autoSubmitted and violations values', async () => {
      req.mockResolvedValue({})
      const violations = ['tab-switch']
      await platformService.submitAssessment('a1', [], true, violations)
      expect(req.mock.calls[0][2]).toEqual({ answers: [], autoSubmitted: true, violations })
    })
  })

  describe('getAssessmentSubmissions', () => {
    it('calls GET /assessments/:assessmentId/submissions', async () => {
      req.mockResolvedValue([])
      await platformService.getAssessmentSubmissions('a1')
      expect(req).toHaveBeenCalledWith('GET', '/assessments/a1/submissions')
    })
  })

  describe('getAssessmentSubmission', () => {
    it('calls GET /assessments/:assessmentId/submissions/:subId', async () => {
      req.mockResolvedValue({})
      await platformService.getAssessmentSubmission('a1', 'sub1')
      expect(req).toHaveBeenCalledWith('GET', '/assessments/a1/submissions/sub1')
    })
  })

  describe('reviewSubmission', () => {
    it('calls PATCH /assessments/:assessmentId/submissions/:subId/review with data', async () => {
      req.mockResolvedValue({})
      const data = { score: 90, feedback: 'Good' }
      await platformService.reviewSubmission('a1', 'sub1', data)
      expect(req).toHaveBeenCalledWith('PATCH', '/assessments/a1/submissions/sub1/review', data)
    })
  })

  describe('getMyAssessments', () => {
    it('calls GET /assessments/candidate/my', async () => {
      req.mockResolvedValue([])
      await platformService.getMyAssessments()
      expect(req).toHaveBeenCalledWith('GET', '/assessments/candidate/my')
    })
  })

  // ── Offers ────────────────────────────────────────────────────────────────────
  describe('getMyOffers', () => {
    it('calls GET /offers/mine', async () => {
      req.mockResolvedValue([])
      await platformService.getMyOffers()
      expect(req).toHaveBeenCalledWith('GET', '/offers/mine')
    })
  })

  describe('getOfferByApplication', () => {
    it('calls GET /offers/application/:appId', async () => {
      req.mockResolvedValue({})
      await platformService.getOfferByApplication('app1')
      expect(req).toHaveBeenCalledWith('GET', '/offers/application/app1')
    })
  })

  describe('getOffer', () => {
    it('calls GET /offers/:id', async () => {
      req.mockResolvedValue({})
      await platformService.getOffer('off1')
      expect(req).toHaveBeenCalledWith('GET', '/offers/off1')
    })
  })

  describe('updateOffer', () => {
    it('calls PATCH /offers/:id with data', async () => {
      req.mockResolvedValue({})
      const data = { salary: 100000 }
      await platformService.updateOffer('off1', data)
      expect(req).toHaveBeenCalledWith('PATCH', '/offers/off1', data)
    })
  })

  describe('sendOffer', () => {
    it('calls POST /offers/:id/send with empty body', async () => {
      req.mockResolvedValue({})
      await platformService.sendOffer('off1')
      expect(req).toHaveBeenCalledWith('POST', '/offers/off1/send', {})
    })
  })

  describe('signOffer', () => {
    it('calls POST /offers/:id/sign with typedName in body', async () => {
      req.mockResolvedValue({})
      await platformService.signOffer('off1', 'John Doe')
      expect(req).toHaveBeenCalledWith('POST', '/offers/off1/sign', { typedName: 'John Doe' })
    })
  })

  describe('generateOfferShareLink', () => {
    it('calls POST /offers/:id/generate-share-link with empty body', async () => {
      req.mockResolvedValue({ link: 'https://example.com/share/abc' })
      await platformService.generateOfferShareLink('off1')
      expect(req).toHaveBeenCalledWith('POST', '/offers/off1/generate-share-link', {})
    })
  })

  describe('createStandaloneOffer', () => {
    it('calls POST /offers/standalone with data', async () => {
      req.mockResolvedValue({})
      const data = { candidateId: 'c1', salary: 90000 }
      await platformService.createStandaloneOffer(data)
      expect(req).toHaveBeenCalledWith('POST', '/offers/standalone', data)
    })
  })

  describe('requestOfferApproval', () => {
    it('calls POST /offers/:id/request-approval with approvers', async () => {
      req.mockResolvedValue({ data: { status: 'pending' } })
      const approvers = ['u1', 'u2']
      await platformService.requestOfferApproval('off1', approvers)
      expect(req).toHaveBeenCalledWith('POST', '/offers/off1/request-approval', { approvers })
    })

    it('returns r.data when present', async () => {
      const data = { status: 'pending', approvers: ['u1'] }
      req.mockResolvedValue({ data })
      const result = await platformService.requestOfferApproval('off1', ['u1'])
      expect(result).toEqual(data)
    })

    it('returns raw response when data property absent', async () => {
      const raw = { status: 'pending' }
      req.mockResolvedValue(raw)
      const result = await platformService.requestOfferApproval('off1', ['u1'])
      expect(result).toEqual(raw)
    })
  })

  describe('getOfferApprovalStatus', () => {
    it('calls GET /offers/:id/approval-status', async () => {
      req.mockResolvedValue({ data: { status: 'approved' } })
      await platformService.getOfferApprovalStatus('off1')
      expect(req).toHaveBeenCalledWith('GET', '/offers/off1/approval-status')
    })

    it('returns r.data when present', async () => {
      const data = { status: 'approved' }
      req.mockResolvedValue({ data })
      const result = await platformService.getOfferApprovalStatus('off1')
      expect(result).toEqual(data)
    })
  })

  describe('decideOfferApproval', () => {
    it('calls POST /offers/:id/decide-approval with token, action, comment', async () => {
      req.mockResolvedValue({ data: { decided: true } })
      await platformService.decideOfferApproval('off1', 'tok123', 'approve', 'Looks good')
      expect(req).toHaveBeenCalledWith('POST', '/offers/off1/decide-approval', {
        token: 'tok123', action: 'approve', comment: 'Looks good'
      })
    })

    it('returns r.data when present', async () => {
      const data = { decided: true }
      req.mockResolvedValue({ data })
      const result = await platformService.decideOfferApproval('off1', 't', 'approve', '')
      expect(result).toEqual(data)
    })
  })

  describe('getPreBoardingDocStatus', () => {
    it('calls GET /preboarding/doc-status', async () => {
      req.mockResolvedValue({})
      await platformService.getPreBoardingDocStatus()
      expect(req).toHaveBeenCalledWith('GET', '/preboarding/doc-status')
    })
  })

  // ── Interview Scorecard ───────────────────────────────────────────────────────
  describe('submitScorecard', () => {
    it('calls POST /applications/:appId/interview/:roundIndex/scorecard with data', async () => {
      req.mockResolvedValue({})
      const data = { rating: 4, comments: 'Strong candidate' }
      await platformService.submitScorecard('app1', 0, data)
      expect(req).toHaveBeenCalledWith('POST', '/applications/app1/interview/0/scorecard', data)
    })

    it('interpolates appId and roundIndex into URL correctly', async () => {
      req.mockResolvedValue({})
      await platformService.submitScorecard('appXYZ', 2, {})
      const url = req.mock.calls[0][1]
      expect(url).toBe('/applications/appXYZ/interview/2/scorecard')
    })
  })

  // ── Stats ─────────────────────────────────────────────────────────────────────
  describe('getPublicStats', () => {
    it('calls GET /stats/public with null body and false auth flag', async () => {
      req.mockResolvedValue({})
      await platformService.getPublicStats()
      expect(req).toHaveBeenCalledWith('GET', '/stats/public', null, false)
    })
  })

  // ── Audit Logs ────────────────────────────────────────────────────────────────
  describe('getAuditLogs', () => {
    it('calls GET /platform/audit-logs without qs when qs is falsy', async () => {
      req.mockResolvedValue([])
      await platformService.getAuditLogs('')
      expect(req).toHaveBeenCalledWith('GET', '/platform/audit-logs')
    })

    it('appends query string when qs is provided', async () => {
      req.mockResolvedValue([])
      await platformService.getAuditLogs('action=login&page=1')
      expect(req).toHaveBeenCalledWith('GET', '/platform/audit-logs?action=login&page=1')
    })
  })

  describe('getPlatformRevenue', () => {
    it('calls GET /platform/revenue', async () => {
      req.mockResolvedValue({})
      await platformService.getPlatformRevenue()
      expect(req).toHaveBeenCalledWith('GET', '/platform/revenue')
    })
  })

  describe('getOrgHealth', () => {
    it('calls GET /platform/org-health', async () => {
      req.mockResolvedValue({})
      await platformService.getOrgHealth()
      expect(req).toHaveBeenCalledWith('GET', '/platform/org-health')
    })
  })

  describe('getSystemHealth', () => {
    it('calls GET /platform/system-health', async () => {
      req.mockResolvedValue({ data: { status: 'ok' } })
      await platformService.getSystemHealth()
      expect(req).toHaveBeenCalledWith('GET', '/platform/system-health')
    })

    it('returns r.data when present', async () => {
      const data = { status: 'ok', uptime: 99.9 }
      req.mockResolvedValue({ data })
      const result = await platformService.getSystemHealth()
      expect(result).toEqual(data)
    })

    it('returns raw response when data property absent', async () => {
      const raw = { status: 'ok' }
      req.mockResolvedValue(raw)
      const result = await platformService.getSystemHealth()
      expect(result).toEqual(raw)
    })
  })

  describe('broadcastAnnouncement', () => {
    it('calls POST /platform/broadcast with data', async () => {
      req.mockResolvedValue({})
      const data = { title: 'Maintenance', message: 'System down at midnight' }
      await platformService.broadcastAnnouncement(data)
      expect(req).toHaveBeenCalledWith('POST', '/platform/broadcast', data)
    })
  })

  describe('getActiveBroadcasts', () => {
    it('calls GET /platform/broadcasts', async () => {
      req.mockResolvedValue({ data: [] })
      await platformService.getActiveBroadcasts()
      expect(req).toHaveBeenCalledWith('GET', '/platform/broadcasts')
    })

    it('returns r.data when present', async () => {
      const data = [{ message: 'Alert!' }]
      req.mockResolvedValue({ data })
      const result = await platformService.getActiveBroadcasts()
      expect(result).toEqual(data)
    })

    it('returns empty array when response is null or missing data', async () => {
      req.mockResolvedValue(null)
      const result = await platformService.getActiveBroadcasts()
      expect(result).toEqual([])
    })
  })

  describe('getOrgInterviewKits', () => {
    it('calls GET /platform/interview-kits', async () => {
      req.mockResolvedValue([])
      await platformService.getOrgInterviewKits()
      expect(req).toHaveBeenCalledWith('GET', '/platform/interview-kits')
    })

    it('returns array directly when response is an array', async () => {
      const kits = [{ _id: 'k1', name: 'Engineering Kit' }]
      req.mockResolvedValue(kits)
      const result = await platformService.getOrgInterviewKits()
      expect(result).toEqual(kits)
    })

    it('returns r.data when response is an object with data', async () => {
      const kits = [{ _id: 'k1' }]
      req.mockResolvedValue({ data: kits })
      const result = await platformService.getOrgInterviewKits()
      expect(result).toEqual(kits)
    })

    it('returns empty array when response is an object without data', async () => {
      req.mockResolvedValue({})
      const result = await platformService.getOrgInterviewKits()
      expect(result).toEqual([])
    })
  })

  // ── Candidate Requests ────────────────────────────────────────────────────────
  describe('getCandidateRequests', () => {
    it('calls GET /candidate-requests without qs when falsy', async () => {
      req.mockResolvedValue([])
      await platformService.getCandidateRequests('')
      expect(req).toHaveBeenCalledWith('GET', '/candidate-requests')
    })

    it('appends qs when provided', async () => {
      req.mockResolvedValue([])
      await platformService.getCandidateRequests('status=open')
      expect(req).toHaveBeenCalledWith('GET', '/candidate-requests?status=open')
    })
  })

  describe('getCandidateRequest', () => {
    it('calls GET /candidate-requests/:id', async () => {
      req.mockResolvedValue({})
      await platformService.getCandidateRequest('cr1')
      expect(req).toHaveBeenCalledWith('GET', '/candidate-requests/cr1')
    })
  })

  describe('createCandidateRequest', () => {
    it('calls POST /candidate-requests with data', async () => {
      req.mockResolvedValue({})
      const data = { skills: ['JS'], count: 3 }
      await platformService.createCandidateRequest(data)
      expect(req).toHaveBeenCalledWith('POST', '/candidate-requests', data)
    })
  })

  describe('updateCandidateRequest', () => {
    it('calls PATCH /candidate-requests/:id with data', async () => {
      req.mockResolvedValue({})
      const data = { status: 'fulfilled' }
      await platformService.updateCandidateRequest('cr1', data)
      expect(req).toHaveBeenCalledWith('PATCH', '/candidate-requests/cr1', data)
    })
  })

  describe('cancelCandidateRequest', () => {
    it('calls DELETE /candidate-requests/:id', async () => {
      req.mockResolvedValue({})
      await platformService.cancelCandidateRequest('cr1')
      expect(req).toHaveBeenCalledWith('DELETE', '/candidate-requests/cr1')
    })
  })

  describe('attachCandidatesToRequest', () => {
    it('calls POST /candidate-requests/:id/attach-candidates with data', async () => {
      req.mockResolvedValue({})
      const data = { candidateIds: ['c1', 'c2'] }
      await platformService.attachCandidatesToRequest('cr1', data)
      expect(req).toHaveBeenCalledWith('POST', '/candidate-requests/cr1/attach-candidates', data)
    })
  })

  describe('getSuggestedCandidatesForRequest', () => {
    it('calls GET /candidate-requests/:id/suggested-candidates', async () => {
      req.mockResolvedValue([])
      await platformService.getSuggestedCandidatesForRequest('cr1')
      expect(req).toHaveBeenCalledWith('GET', '/candidate-requests/cr1/suggested-candidates')
    })
  })

  describe('searchCandidatesAdvanced', () => {
    it('calls GET /candidates/search without qs when falsy', async () => {
      req.mockResolvedValue([])
      await platformService.searchCandidatesAdvanced('')
      expect(req).toHaveBeenCalledWith('GET', '/candidates/search')
    })

    it('appends qs when provided', async () => {
      req.mockResolvedValue([])
      await platformService.searchCandidatesAdvanced('skills=JS&experience=3')
      expect(req).toHaveBeenCalledWith('GET', '/candidates/search?skills=JS&experience=3')
    })
  })

  describe('getJobMatchingCandidates', () => {
    it('calls GET /jobs/:jobId/matching-candidates', async () => {
      req.mockResolvedValue([])
      await platformService.getJobMatchingCandidates('j1')
      expect(req).toHaveBeenCalledWith('GET', '/jobs/j1/matching-candidates')
    })
  })

  // ── Clients ───────────────────────────────────────────────────────────────────
  describe('getClients', () => {
    it('calls GET /clients without qs when falsy', async () => {
      req.mockResolvedValue([])
      await platformService.getClients('')
      expect(req).toHaveBeenCalledWith('GET', '/clients')
    })

    it('appends qs when provided', async () => {
      req.mockResolvedValue([])
      await platformService.getClients('status=active')
      expect(req).toHaveBeenCalledWith('GET', '/clients?status=active')
    })
  })

  describe('createClient', () => {
    it('calls POST /clients with data', async () => {
      req.mockResolvedValue({})
      const data = { name: 'Client Corp', email: 'client@corp.com' }
      await platformService.createClient(data)
      expect(req).toHaveBeenCalledWith('POST', '/clients', data)
    })
  })

  describe('updateClient', () => {
    it('calls PATCH /clients/:id with data', async () => {
      req.mockResolvedValue({})
      await platformService.updateClient('cl1', { name: 'New Name' })
      expect(req).toHaveBeenCalledWith('PATCH', '/clients/cl1', { name: 'New Name' })
    })
  })

  describe('deleteClient', () => {
    it('calls DELETE /clients/:id', async () => {
      req.mockResolvedValue({})
      await platformService.deleteClient('cl1')
      expect(req).toHaveBeenCalledWith('DELETE', '/clients/cl1')
    })
  })

  // ── Job Requirements ──────────────────────────────────────────────────────────
  describe('getJobRequirements', () => {
    it('calls GET /job-requirements without qs when falsy', async () => {
      req.mockResolvedValue([])
      await platformService.getJobRequirements('')
      expect(req).toHaveBeenCalledWith('GET', '/job-requirements')
    })

    it('appends qs when provided', async () => {
      req.mockResolvedValue([])
      await platformService.getJobRequirements('status=open')
      expect(req).toHaveBeenCalledWith('GET', '/job-requirements?status=open')
    })
  })

  describe('getJobRequirement', () => {
    it('calls GET /job-requirements/:id', async () => {
      req.mockResolvedValue({})
      await platformService.getJobRequirement('jr1')
      expect(req).toHaveBeenCalledWith('GET', '/job-requirements/jr1')
    })
  })

  describe('createJobRequirement', () => {
    it('calls POST /job-requirements with data', async () => {
      req.mockResolvedValue({})
      const data = { title: 'Senior Dev', count: 2 }
      await platformService.createJobRequirement(data)
      expect(req).toHaveBeenCalledWith('POST', '/job-requirements', data)
    })
  })

  describe('updateJobRequirement', () => {
    it('calls PATCH /job-requirements/:id with data', async () => {
      req.mockResolvedValue({})
      await platformService.updateJobRequirement('jr1', { count: 3 })
      expect(req).toHaveBeenCalledWith('PATCH', '/job-requirements/jr1', { count: 3 })
    })
  })

  describe('updateJobRequirementStatus', () => {
    it('calls PATCH /job-requirements/:id/status with data', async () => {
      req.mockResolvedValue({})
      await platformService.updateJobRequirementStatus('jr1', { status: 'fulfilled' })
      expect(req).toHaveBeenCalledWith('PATCH', '/job-requirements/jr1/status', { status: 'fulfilled' })
    })
  })

  describe('withdrawJobRequirement', () => {
    it('calls DELETE /job-requirements/:id', async () => {
      req.mockResolvedValue({})
      await platformService.withdrawJobRequirement('jr1')
      expect(req).toHaveBeenCalledWith('DELETE', '/job-requirements/jr1')
    })
  })

  describe('getJobRequirementRecruiters', () => {
    it('calls GET /job-requirements/meta/recruiters', async () => {
      req.mockResolvedValue([])
      await platformService.getJobRequirementRecruiters()
      expect(req).toHaveBeenCalledWith('GET', '/job-requirements/meta/recruiters')
    })
  })

  // ── Raw Data ──────────────────────────────────────────────────────────────────
  describe('getOrgs', () => {
    it('calls GET /orgs', async () => {
      req.mockResolvedValue([])
      await platformService.getOrgs()
      expect(req).toHaveBeenCalledWith('GET', '/orgs')
    })
  })

  describe('getRawData', () => {
    it('calls GET /platform/raw/:model/:id', async () => {
      req.mockResolvedValue({})
      await platformService.getRawData('User', 'u1')
      expect(req).toHaveBeenCalledWith('GET', '/platform/raw/User/u1')
    })
  })

  describe('updateRawData', () => {
    it('calls PATCH /platform/raw/:model/:id with data', async () => {
      req.mockResolvedValue({})
      const data = { name: 'Updated' }
      await platformService.updateRawData('User', 'u1', data)
      expect(req).toHaveBeenCalledWith('PATCH', '/platform/raw/User/u1', data)
    })
  })

  // ── Impersonation ─────────────────────────────────────────────────────────────
  describe('impersonate', () => {
    it('calls POST /auth/impersonate with targetUserId', async () => {
      req.mockResolvedValue({})
      await platformService.impersonate('u99')
      expect(req).toHaveBeenCalledWith('POST', '/auth/impersonate', { targetUserId: 'u99' })
    })
  })

  describe('stopImpersonate', () => {
    it('calls POST /auth/stop-impersonate with empty body', async () => {
      req.mockResolvedValue({})
      await platformService.stopImpersonate()
      expect(req).toHaveBeenCalledWith('POST', '/auth/stop-impersonate', {})
    })
  })

  // ── WhatsApp ──────────────────────────────────────────────────────────────────
  describe('bulkWhatsApp', () => {
    it('calls POST /users/bulk-whatsapp with data', async () => {
      req.mockResolvedValue({})
      const data = { message: 'Hello!', phoneNumbers: ['+911234567890'] }
      await platformService.bulkWhatsApp(data)
      expect(req).toHaveBeenCalledWith('POST', '/users/bulk-whatsapp', data)
    })
  })

  describe('sendBulkWhatsApp', () => {
    it('calls POST /whatsapp/bulk-send with recipients and messageTemplate', async () => {
      req.mockResolvedValue({})
      const recipients = ['+911234567890', '+919876543210']
      const template = 'Hi {{name}}, please check your application.'
      await platformService.sendBulkWhatsApp(recipients, template)
      expect(req).toHaveBeenCalledWith('POST', '/whatsapp/bulk-send', { recipients, messageTemplate: template })
    })
  })

  describe('getWhatsAppLogs', () => {
    it('calls GET /whatsapp/logs?page=1&limit=10000000 by default', async () => {
      req.mockResolvedValue([])
      await platformService.getWhatsAppLogs()
      expect(req).toHaveBeenCalledWith('GET', '/whatsapp/logs?page=1&limit=10000000')
    })

    it('accepts custom page and limit', async () => {
      req.mockResolvedValue([])
      await platformService.getWhatsAppLogs(2, 50)
      expect(req).toHaveBeenCalledWith('GET', '/whatsapp/logs?page=2&limit=50')
    })
  })

  describe('createWhatsAppSession', () => {
    it('calls POST /whatsapp/create-session with data', async () => {
      req.mockResolvedValue({})
      const data = { phone: '+911234567890' }
      await platformService.createWhatsAppSession(data)
      expect(req).toHaveBeenCalledWith('POST', '/whatsapp/create-session', data)
    })
  })

  // ── Duplicate Detection ───────────────────────────────────────────────────────
  describe('checkDuplicate', () => {
    it('calls POST /users/check-duplicate with data', async () => {
      req.mockResolvedValue({})
      const data = { email: 'dup@co.com', phone: '9999999999' }
      await platformService.checkDuplicate(data)
      expect(req).toHaveBeenCalledWith('POST', '/users/check-duplicate', data)
    })
  })

  // ── Talent Pool (parked applications) ────────────────────────────────────────
  describe('getParkedCandidates', () => {
    it('calls GET /applications/talent-pool', async () => {
      req.mockResolvedValue([])
      await platformService.getParkedCandidates()
      expect(req).toHaveBeenCalledWith('GET', '/applications/talent-pool')
    })
  })

  describe('parkApplication', () => {
    it('calls PATCH /applications/:appId/park', async () => {
      req.mockResolvedValue({})
      await platformService.parkApplication('app1')
      expect(req).toHaveBeenCalledWith('PATCH', '/applications/app1/park')
    })
  })

  // ── NPS ───────────────────────────────────────────────────────────────────────
  describe('getNpsStats', () => {
    it('calls GET /nps/stats without qs when no params', async () => {
      req.mockResolvedValue({})
      await platformService.getNpsStats()
      expect(req).toHaveBeenCalledWith('GET', '/nps/stats')
    })

    it('appends startDate and endDate when provided', async () => {
      req.mockResolvedValue({})
      await platformService.getNpsStats({ startDate: '2025-01-01', endDate: '2025-06-30' })
      const url = req.mock.calls[0][1]
      expect(url).toContain('startDate=2025-01-01')
      expect(url).toContain('endDate=2025-06-30')
    })

    it('omits startDate when not in params', async () => {
      req.mockResolvedValue({})
      await platformService.getNpsStats({ endDate: '2025-06-30' })
      const url = req.mock.calls[0][1]
      expect(url).not.toContain('startDate=')
      expect(url).toContain('endDate=2025-06-30')
    })
  })

  describe('seedNPS', () => {
    it('calls POST /nps/seed with empty body', async () => {
      req.mockResolvedValue({})
      await platformService.seedNPS()
      expect(req).toHaveBeenCalledWith('POST', '/nps/seed', {})
    })
  })

  // ── Candidate Documents ───────────────────────────────────────────────────────
  describe('getCandidateDocuments', () => {
    it('calls GET /candidates/:candidateId/documents', async () => {
      req.mockResolvedValue([])
      await platformService.getCandidateDocuments('c1')
      expect(req).toHaveBeenCalledWith('GET', '/candidates/c1/documents')
    })
  })

  describe('uploadCandidateDocument', () => {
    it('calls uploadFormData POST /candidates/:candidateId/documents with formData', async () => {
      uploadFormData.mockResolvedValue({})
      const formData = new FormData()
      await platformService.uploadCandidateDocument('c1', formData)
      expect(uploadFormData).toHaveBeenCalledWith('POST', '/candidates/c1/documents', formData)
    })
  })

  describe('verifyDocument', () => {
    it('calls PATCH /candidates/:candidateId/documents/:docId with data', async () => {
      req.mockResolvedValue({})
      const data = { status: 'verified' }
      await platformService.verifyDocument('c1', 'doc1', data)
      expect(req).toHaveBeenCalledWith('PATCH', '/candidates/c1/documents/doc1', data)
    })
  })

  describe('uploadCandidateResume', () => {
    it('calls uploadFormData POST /candidates/upload-my-resume with formData', async () => {
      uploadFormData.mockResolvedValue({})
      const formData = new FormData()
      await platformService.uploadCandidateResume(formData)
      expect(uploadFormData).toHaveBeenCalledWith('POST', '/candidates/upload-my-resume', formData)
    })
  })

  describe('uploadVideoResume', () => {
    it('calls uploadFormData POST /candidates/:candidateId/video with formData', async () => {
      uploadFormData.mockResolvedValue({})
      const formData = new FormData()
      await platformService.uploadVideoResume('c1', formData)
      expect(uploadFormData).toHaveBeenCalledWith('POST', '/candidates/c1/video', formData)
    })
  })

  // ── Workflow Automation ───────────────────────────────────────────────────────
  describe('getWorkflowRules', () => {
    it('calls GET /admin/workflow-rules', async () => {
      req.mockResolvedValue([])
      await platformService.getWorkflowRules()
      expect(req).toHaveBeenCalledWith('GET', '/admin/workflow-rules')
    })
  })

  describe('createWorkflowRule', () => {
    it('calls POST /admin/workflow-rules with data', async () => {
      req.mockResolvedValue({})
      const data = { trigger: 'application.created', action: 'send_email' }
      await platformService.createWorkflowRule(data)
      expect(req).toHaveBeenCalledWith('POST', '/admin/workflow-rules', data)
    })
  })

  describe('updateWorkflowRule', () => {
    it('calls PATCH /admin/workflow-rules/:id with data', async () => {
      req.mockResolvedValue({})
      await platformService.updateWorkflowRule('wr1', { active: false })
      expect(req).toHaveBeenCalledWith('PATCH', '/admin/workflow-rules/wr1', { active: false })
    })
  })

  describe('deleteWorkflowRule', () => {
    it('calls DELETE /admin/workflow-rules/:id', async () => {
      req.mockResolvedValue({})
      await platformService.deleteWorkflowRule('wr1')
      expect(req).toHaveBeenCalledWith('DELETE', '/admin/workflow-rules/wr1')
    })
  })

  describe('testWorkflowRule', () => {
    it('calls POST /admin/workflow-rules/:id/test with eventData wrapped in object', async () => {
      req.mockResolvedValue({})
      const eventData = { applicationId: 'app1' }
      await platformService.testWorkflowRule('wr1', eventData)
      expect(req).toHaveBeenCalledWith('POST', '/admin/workflow-rules/wr1/test', { eventData })
    })
  })

  describe('getSystemWorkflowRules', () => {
    it('calls GET /admin/workflow-rules/system', async () => {
      req.mockResolvedValue([])
      await platformService.getSystemWorkflowRules()
      expect(req).toHaveBeenCalledWith('GET', '/admin/workflow-rules/system')
    })
  })

  describe('createSystemWorkflowRule', () => {
    it('calls POST /admin/workflow-rules/system with data', async () => {
      req.mockResolvedValue({})
      const data = { key: 'system_alert', trigger: 'job.created' }
      await platformService.createSystemWorkflowRule(data)
      expect(req).toHaveBeenCalledWith('POST', '/admin/workflow-rules/system', data)
    })
  })

  describe('updateSystemWorkflowRule', () => {
    it('calls PATCH /admin/workflow-rules/system/:id with data', async () => {
      req.mockResolvedValue({})
      await platformService.updateSystemWorkflowRule('swr1', { active: true })
      expect(req).toHaveBeenCalledWith('PATCH', '/admin/workflow-rules/system/swr1', { active: true })
    })
  })

  describe('deleteSystemWorkflowRule', () => {
    it('calls DELETE /admin/workflow-rules/system/:id', async () => {
      req.mockResolvedValue({})
      await platformService.deleteSystemWorkflowRule('swr1')
      expect(req).toHaveBeenCalledWith('DELETE', '/admin/workflow-rules/system/swr1')
    })
  })

  describe('activateSystemAutomation', () => {
    it('calls POST /admin/workflow-rules/activate/:systemKey', async () => {
      req.mockResolvedValue({})
      await platformService.activateSystemAutomation('auto_reject')
      expect(req).toHaveBeenCalledWith('POST', '/admin/workflow-rules/activate/auto_reject')
    })
  })

  describe('deactivateSystemAutomation', () => {
    it('calls DELETE /admin/workflow-rules/deactivate/:systemKey', async () => {
      req.mockResolvedValue({})
      await platformService.deactivateSystemAutomation('auto_reject')
      expect(req).toHaveBeenCalledWith('DELETE', '/admin/workflow-rules/deactivate/auto_reject')
    })
  })

  // ── Security ──────────────────────────────────────────────────────────────────
  describe('toggle2FA', () => {
    it('calls POST /auth/2fa/toggle with empty body', async () => {
      req.mockResolvedValue({})
      await platformService.toggle2FA()
      expect(req).toHaveBeenCalledWith('POST', '/auth/2fa/toggle', {})
    })
  })

  describe('getSessions', () => {
    it('calls GET /auth/sessions', async () => {
      req.mockResolvedValue([])
      await platformService.getSessions()
      expect(req).toHaveBeenCalledWith('GET', '/auth/sessions')
    })
  })

  describe('terminateSession', () => {
    it('calls DELETE /auth/sessions/:id', async () => {
      req.mockResolvedValue({})
      await platformService.terminateSession('sess1')
      expect(req).toHaveBeenCalledWith('DELETE', '/auth/sessions/sess1')
    })
  })

  describe('terminateOtherSessions', () => {
    it('calls DELETE /auth/sessions/others', async () => {
      req.mockResolvedValue({})
      await platformService.terminateOtherSessions()
      expect(req).toHaveBeenCalledWith('DELETE', '/auth/sessions/others')
    })
  })

  describe('terminateAllSessions', () => {
    it('calls DELETE /auth/sessions/all', async () => {
      req.mockResolvedValue({})
      await platformService.terminateAllSessions()
      expect(req).toHaveBeenCalledWith('DELETE', '/auth/sessions/all')
    })
  })

  describe('deleteMyAccount', () => {
    it('calls DELETE /auth/account', async () => {
      req.mockResolvedValue({})
      await platformService.deleteMyAccount()
      expect(req).toHaveBeenCalledWith('DELETE', '/auth/account')
    })
  })

  // ── Custom Fields ─────────────────────────────────────────────────────────────
  describe('getCustomFields', () => {
    it('calls GET /custom-fields without query when entity is falsy', async () => {
      req.mockResolvedValue([])
      await platformService.getCustomFields('')
      expect(req).toHaveBeenCalledWith('GET', '/custom-fields')
    })

    it('appends ?entity=<entity> when entity is provided', async () => {
      req.mockResolvedValue([])
      await platformService.getCustomFields('candidate')
      expect(req).toHaveBeenCalledWith('GET', '/custom-fields?entity=candidate')
    })
  })

  describe('createCustomField', () => {
    it('calls POST /custom-fields with data', async () => {
      req.mockResolvedValue({})
      const data = { label: 'Department', type: 'text', entity: 'candidate' }
      await platformService.createCustomField(data)
      expect(req).toHaveBeenCalledWith('POST', '/custom-fields', data)
    })
  })

  describe('updateCustomField', () => {
    it('calls PATCH /custom-fields/:id with data', async () => {
      req.mockResolvedValue({})
      await platformService.updateCustomField('cf1', { label: 'Team' })
      expect(req).toHaveBeenCalledWith('PATCH', '/custom-fields/cf1', { label: 'Team' })
    })
  })

  describe('deleteCustomField', () => {
    it('calls DELETE /custom-fields/:id', async () => {
      req.mockResolvedValue({})
      await platformService.deleteCustomField('cf1')
      expect(req).toHaveBeenCalledWith('DELETE', '/custom-fields/cf1')
    })
  })

  describe('getCustomFieldValues', () => {
    it('calls GET /custom-fields/values/:entity/:recordId', async () => {
      req.mockResolvedValue({})
      await platformService.getCustomFieldValues('candidate', 'c1')
      expect(req).toHaveBeenCalledWith('GET', '/custom-fields/values/candidate/c1')
    })
  })

  describe('saveCustomFieldValues', () => {
    it('calls PUT /custom-fields/values/:entity/:recordId with values wrapped in object', async () => {
      req.mockResolvedValue({})
      const values = { department: 'Engineering' }
      await platformService.saveCustomFieldValues('candidate', 'c1', values)
      expect(req).toHaveBeenCalledWith('PUT', '/custom-fields/values/candidate/c1', { values })
    })
  })

  // ── Pipeline Templates ────────────────────────────────────────────────────────
  describe('getPipelineTemplates', () => {
    it('calls GET /pipeline-templates', async () => {
      req.mockResolvedValue([])
      await platformService.getPipelineTemplates()
      expect(req).toHaveBeenCalledWith('GET', '/pipeline-templates')
    })
  })

  describe('savePipelineTemplate', () => {
    it('calls POST /pipeline-templates with name and stages', async () => {
      req.mockResolvedValue({})
      const stages = ['Applied', 'Interview', 'Offer']
      await platformService.savePipelineTemplate('Standard Pipeline', stages)
      expect(req).toHaveBeenCalledWith('POST', '/pipeline-templates', { name: 'Standard Pipeline', stages })
    })
  })

  describe('applyPipelineTemplate', () => {
    it('calls PATCH /pipeline-templates/:encodedName/apply with empty body', async () => {
      req.mockResolvedValue({})
      await platformService.applyPipelineTemplate('Standard Pipeline')
      const url = req.mock.calls[0][1]
      expect(url).toContain('/pipeline-templates/')
      expect(url).toContain('/apply')
      expect(url).toContain('Standard%20Pipeline')
    })
  })

  describe('deletePipelineTemplate', () => {
    it('calls DELETE /pipeline-templates/:encodedName', async () => {
      req.mockResolvedValue({})
      await platformService.deletePipelineTemplate('Standard Pipeline')
      const url = req.mock.calls[0][1]
      expect(url).toContain('/pipeline-templates/')
      expect(url).toContain('Standard%20Pipeline')
      expect(req.mock.calls[0][0]).toBe('DELETE')
    })
  })

  // ── Pre-boarding ──────────────────────────────────────────────────────────────
  describe('getPreBoardings', () => {
    it('calls GET /preboarding without qs when falsy', async () => {
      req.mockResolvedValue([])
      await platformService.getPreBoardings('')
      expect(req).toHaveBeenCalledWith('GET', '/preboarding')
    })

    it('appends qs when provided', async () => {
      req.mockResolvedValue([])
      await platformService.getPreBoardings('status=pending')
      expect(req).toHaveBeenCalledWith('GET', '/preboarding?status=pending')
    })
  })

  describe('getHiredPending', () => {
    it('calls GET /preboarding/hired-pending', async () => {
      req.mockResolvedValue([])
      await platformService.getHiredPending()
      expect(req).toHaveBeenCalledWith('GET', '/preboarding/hired-pending')
    })
  })

  describe('startPreBoarding', () => {
    it('calls POST /preboarding/start with applicationId in body', async () => {
      req.mockResolvedValue({})
      await platformService.startPreBoarding('app1')
      expect(req).toHaveBeenCalledWith('POST', '/preboarding/start', { applicationId: 'app1' })
    })
  })

  describe('selfStartPreBoarding', () => {
    it('calls POST /preboarding/self-start with empty body', async () => {
      req.mockResolvedValue({})
      await platformService.selfStartPreBoarding()
      expect(req).toHaveBeenCalledWith('POST', '/preboarding/self-start', {})
    })
  })

  describe('getMyPreBoarding', () => {
    it('calls GET /preboarding/mine', async () => {
      req.mockResolvedValue({})
      await platformService.getMyPreBoarding()
      expect(req).toHaveBeenCalledWith('GET', '/preboarding/mine')
    })
  })

  describe('updatePreBoarding', () => {
    it('calls PATCH /preboarding/:id with data', async () => {
      req.mockResolvedValue({})
      const data = { joiningDate: '2025-07-01' }
      await platformService.updatePreBoarding('pb1', data)
      expect(req).toHaveBeenCalledWith('PATCH', '/preboarding/pb1', data)
    })
  })

  describe('addPreBoardingTask', () => {
    it('calls POST /preboarding/:id/tasks with data', async () => {
      req.mockResolvedValue({})
      const data = { title: 'Fill Form A', type: 'document' }
      await platformService.addPreBoardingTask('pb1', data)
      expect(req).toHaveBeenCalledWith('POST', '/preboarding/pb1/tasks', data)
    })
  })

  describe('updatePreBoardingTask', () => {
    it('calls PATCH /preboarding/:id/tasks/:taskId with data', async () => {
      req.mockResolvedValue({})
      const data = { status: 'done' }
      await platformService.updatePreBoardingTask('pb1', 'task1', data)
      expect(req).toHaveBeenCalledWith('PATCH', '/preboarding/pb1/tasks/task1', data)
    })
  })

  describe('deletePreBoardingDocument', () => {
    it('calls DELETE /preboarding/:id/tasks/:taskId/document', async () => {
      req.mockResolvedValue({})
      await platformService.deletePreBoardingDocument('pb1', 'task1')
      expect(req).toHaveBeenCalledWith('DELETE', '/preboarding/pb1/tasks/task1/document')
    })
  })

  describe('sendPreBoardingWelcomeKit', () => {
    it('calls POST /preboarding/:id/send-welcome-kit with empty body', async () => {
      req.mockResolvedValue({})
      await platformService.sendPreBoardingWelcomeKit('pb1')
      expect(req).toHaveBeenCalledWith('POST', '/preboarding/pb1/send-welcome-kit', {})
    })
  })

  describe('verifyPreBoardingDocument', () => {
    it('calls PATCH /preboarding/:id/tasks/:taskId/verify with action and notes', async () => {
      req.mockResolvedValue({})
      await platformService.verifyPreBoardingDocument('pb1', 'task1', 'approve', 'Looks good')
      expect(req).toHaveBeenCalledWith('PATCH', '/preboarding/pb1/tasks/task1/verify', {
        action: 'approve', notes: 'Looks good'
      })
    })
  })

  // ── Job Alerts ────────────────────────────────────────────────────────────────
  describe('getJobAlerts', () => {
    it('calls GET /job-alerts', async () => {
      req.mockResolvedValue([])
      await platformService.getJobAlerts()
      expect(req).toHaveBeenCalledWith('GET', '/job-alerts')
    })
  })

  describe('createJobAlert', () => {
    it('calls POST /job-alerts with data', async () => {
      req.mockResolvedValue({})
      const data = { keywords: ['developer'], location: 'remote' }
      await platformService.createJobAlert(data)
      expect(req).toHaveBeenCalledWith('POST', '/job-alerts', data)
    })
  })

  describe('updateJobAlert', () => {
    it('calls PATCH /job-alerts/:id with data', async () => {
      req.mockResolvedValue({})
      await platformService.updateJobAlert('ja1', { active: false })
      expect(req).toHaveBeenCalledWith('PATCH', '/job-alerts/ja1', { active: false })
    })
  })

  describe('deleteJobAlert', () => {
    it('calls DELETE /job-alerts/:id', async () => {
      req.mockResolvedValue({})
      await platformService.deleteJobAlert('ja1')
      expect(req).toHaveBeenCalledWith('DELETE', '/job-alerts/ja1')
    })
  })

  // ── Org Customizations ────────────────────────────────────────────────────────
  describe('getCustomizations', () => {
    it('calls GET /customizations without qs when orgId is falsy', async () => {
      req.mockResolvedValue({})
      await platformService.getCustomizations(undefined)
      expect(req).toHaveBeenCalledWith('GET', '/customizations')
    })

    it('appends ?orgId=<orgId> when orgId is provided', async () => {
      req.mockResolvedValue({})
      await platformService.getCustomizations('org1')
      expect(req).toHaveBeenCalledWith('GET', '/customizations?orgId=org1')
    })
  })

  describe('addCustomizationItem', () => {
    it('calls POST /customizations/:section with item, without orgId when falsy', async () => {
      req.mockResolvedValue({})
      const item = { label: 'New Stage' }
      await platformService.addCustomizationItem('stages', item, undefined)
      expect(req).toHaveBeenCalledWith('POST', '/customizations/stages', item)
    })

    it('appends ?orgId=<orgId> when orgId is provided', async () => {
      req.mockResolvedValue({})
      await platformService.addCustomizationItem('stages', { label: 'X' }, 'org1')
      const url = req.mock.calls[0][1]
      expect(url).toContain('?orgId=org1')
    })
  })

  describe('deleteCustomizationItem', () => {
    it('calls DELETE /customizations/:section/:id without orgId when falsy', async () => {
      req.mockResolvedValue({})
      await platformService.deleteCustomizationItem('stages', 'item1', undefined)
      expect(req).toHaveBeenCalledWith('DELETE', '/customizations/stages/item1')
    })

    it('appends ?orgId=<orgId> when orgId is provided', async () => {
      req.mockResolvedValue({})
      await platformService.deleteCustomizationItem('stages', 'item1', 'org1')
      const url = req.mock.calls[0][1]
      expect(url).toContain('?orgId=org1')
    })
  })

  // ── Presence & Messaging ──────────────────────────────────────────────────────
  describe('presenceHeartbeat', () => {
    it('calls POST /presence/heartbeat with empty body', async () => {
      req.mockResolvedValue({})
      await platformService.presenceHeartbeat()
      expect(req).toHaveBeenCalledWith('POST', '/presence/heartbeat', {})
    })
  })

  describe('getOnlineUsers', () => {
    it('calls GET /presence/online', async () => {
      req.mockResolvedValue([])
      await platformService.getOnlineUsers()
      expect(req).toHaveBeenCalledWith('GET', '/presence/online')
    })
  })

  describe('sendMessage', () => {
    it('calls POST /messages with data', async () => {
      req.mockResolvedValue({})
      const data = { to: 'u1', text: 'Hello!' }
      await platformService.sendMessage(data)
      expect(req).toHaveBeenCalledWith('POST', '/messages', data)
    })
  })

  describe('getMessageInbox', () => {
    it('calls GET /messages/inbox', async () => {
      req.mockResolvedValue([])
      await platformService.getMessageInbox()
      expect(req).toHaveBeenCalledWith('GET', '/messages/inbox')
    })
  })

  describe('getUnreadMessageCount', () => {
    it('calls GET /messages/unread-count', async () => {
      req.mockResolvedValue({ count: 5 })
      await platformService.getUnreadMessageCount()
      expect(req).toHaveBeenCalledWith('GET', '/messages/unread-count')
    })
  })

  describe('getMessageContacts', () => {
    it('calls GET /messages/contacts', async () => {
      req.mockResolvedValue([])
      await platformService.getMessageContacts()
      expect(req).toHaveBeenCalledWith('GET', '/messages/contacts')
    })
  })

  describe('getMessageThread', () => {
    it('calls GET /messages/thread/:userId', async () => {
      req.mockResolvedValue([])
      await platformService.getMessageThread('u1')
      expect(req).toHaveBeenCalledWith('GET', '/messages/thread/u1')
    })
  })

  // ── Distribution ──────────────────────────────────────────────────────────────
  describe('getJobDistribution', () => {
    it('calls GET /distribution/job/:jobId', async () => {
      req.mockResolvedValue({})
      await platformService.getJobDistribution('j1')
      expect(req).toHaveBeenCalledWith('GET', '/distribution/job/j1')
    })
  })

  describe('getDistributionSummary', () => {
    it('calls GET /distribution/summary', async () => {
      req.mockResolvedValue({})
      await platformService.getDistributionSummary()
      expect(req).toHaveBeenCalledWith('GET', '/distribution/summary')
    })
  })

  describe('retryDistribution', () => {
    it('calls POST /distribution/retry/:jobId/:plat with empty body', async () => {
      req.mockResolvedValue({})
      await platformService.retryDistribution('j1', 'linkedin')
      expect(req).toHaveBeenCalledWith('POST', '/distribution/retry/j1/linkedin', {})
    })
  })

  describe('runDeduplication', () => {
    it('calls POST /admin/deduplicate-jobs with empty body', async () => {
      req.mockResolvedValue({})
      await platformService.runDeduplication()
      expect(req).toHaveBeenCalledWith('POST', '/admin/deduplicate-jobs', {})
    })
  })

  // ── Referral Portal ───────────────────────────────────────────────────────────
  describe('getReferrals', () => {
    it('calls GET /referrals without qs when no params', async () => {
      req.mockResolvedValue({ data: [] })
      await platformService.getReferrals(undefined)
      expect(req).toHaveBeenCalledWith('GET', '/referrals')
    })

    it('appends query string when params provided', async () => {
      req.mockResolvedValue({ data: [] })
      await platformService.getReferrals({ jobId: 'j1' })
      const url = req.mock.calls[0][1]
      expect(url).toContain('jobId=j1')
    })

    it('returns r.data when present', async () => {
      const data = [{ _id: 'ref1' }]
      req.mockResolvedValue({ data })
      const result = await platformService.getReferrals(undefined)
      expect(result).toEqual(data)
    })
  })

  describe('generateReferralLink', () => {
    it('calls POST /referrals/generate with data', async () => {
      req.mockResolvedValue({ data: { link: 'https://ref.link/abc' } })
      const data = { jobId: 'j1' }
      await platformService.generateReferralLink(data)
      expect(req).toHaveBeenCalledWith('POST', '/referrals/generate', data)
    })

    it('returns r.data when present', async () => {
      const data = { link: 'https://ref.link/abc' }
      req.mockResolvedValue({ data })
      const result = await platformService.generateReferralLink({ jobId: 'j1' })
      expect(result).toEqual(data)
    })
  })

  describe('getMyReferrals', () => {
    it('calls GET /referrals/my', async () => {
      req.mockResolvedValue({ data: [] })
      await platformService.getMyReferrals()
      expect(req).toHaveBeenCalledWith('GET', '/referrals/my')
    })
  })

  describe('markReferralHired', () => {
    it('calls PATCH /referrals/:id/mark-hired', async () => {
      req.mockResolvedValue({})
      await platformService.markReferralHired('ref1')
      expect(req).toHaveBeenCalledWith('PATCH', '/referrals/ref1/mark-hired')
    })
  })

  describe('payReferralReward', () => {
    it('calls PATCH /referrals/:id/pay-reward', async () => {
      req.mockResolvedValue({})
      await platformService.payReferralReward('ref1')
      expect(req).toHaveBeenCalledWith('PATCH', '/referrals/ref1/pay-reward')
    })
  })

  // ── Email Sequences ───────────────────────────────────────────────────────────
  describe('getEmailSequences', () => {
    it('calls GET /email-sequences', async () => {
      req.mockResolvedValue({ sequences: [] })
      await platformService.getEmailSequences()
      expect(req).toHaveBeenCalledWith('GET', '/email-sequences')
    })

    it('returns r.sequences when present', async () => {
      const sequences = [{ _id: 'seq1', name: 'Nurture' }]
      req.mockResolvedValue({ sequences })
      const result = await platformService.getEmailSequences()
      expect(result).toEqual(sequences)
    })

    it('returns empty array when sequences property absent', async () => {
      req.mockResolvedValue({})
      const result = await platformService.getEmailSequences()
      expect(result).toEqual([])
    })
  })

  describe('createEmailSequence', () => {
    it('calls POST /email-sequences with data', async () => {
      req.mockResolvedValue({ sequence: { _id: 'seq1' } })
      const data = { name: 'Nurture', steps: [] }
      await platformService.createEmailSequence(data)
      expect(req).toHaveBeenCalledWith('POST', '/email-sequences', data)
    })

    it('returns r.sequence when present', async () => {
      const sequence = { _id: 'seq1' }
      req.mockResolvedValue({ sequence })
      const result = await platformService.createEmailSequence({})
      expect(result).toEqual(sequence)
    })
  })

  describe('enrollInSequence', () => {
    it('calls POST /email-sequences/:seqId/enroll with candidateId', async () => {
      req.mockResolvedValue({})
      await platformService.enrollInSequence('seq1', 'c1')
      expect(req).toHaveBeenCalledWith('POST', '/email-sequences/seq1/enroll', { candidateId: 'c1' })
    })
  })

  describe('getSequenceEnrollments', () => {
    it('calls GET /email-sequences/:seqId/enrollments', async () => {
      req.mockResolvedValue({ enrollments: [] })
      await platformService.getSequenceEnrollments('seq1')
      expect(req).toHaveBeenCalledWith('GET', '/email-sequences/seq1/enrollments')
    })

    it('returns r.enrollments when present', async () => {
      const enrollments = [{ candidateId: 'c1' }]
      req.mockResolvedValue({ enrollments })
      const result = await platformService.getSequenceEnrollments('seq1')
      expect(result).toEqual(enrollments)
    })
  })

  // ── Saved Searches ────────────────────────────────────────────────────────────
  describe('getSavedSearches', () => {
    it('calls GET /saved-searches without qs when context is falsy', async () => {
      req.mockResolvedValue({ searches: [] })
      await platformService.getSavedSearches(undefined)
      expect(req).toHaveBeenCalledWith('GET', '/saved-searches')
    })

    it('appends ?context=<context> when context is provided', async () => {
      req.mockResolvedValue({ searches: [] })
      await platformService.getSavedSearches('candidates')
      expect(req).toHaveBeenCalledWith('GET', '/saved-searches?context=candidates')
    })

    it('returns r.searches when present', async () => {
      const searches = [{ _id: 'ss1', name: 'JS Devs' }]
      req.mockResolvedValue({ searches })
      const result = await platformService.getSavedSearches('candidates')
      expect(result).toEqual(searches)
    })
  })

  describe('saveSearch', () => {
    it('calls POST /saved-searches with name, context, filters', async () => {
      req.mockResolvedValue({ search: { _id: 'ss1' } })
      const filters = { skills: ['JS'] }
      await platformService.saveSearch('JS Devs', 'candidates', filters)
      expect(req).toHaveBeenCalledWith('POST', '/saved-searches', {
        name: 'JS Devs', context: 'candidates', filters
      })
    })
  })

  describe('deleteSavedSearch', () => {
    it('calls DELETE /saved-searches/:id', async () => {
      req.mockResolvedValue({})
      await platformService.deleteSavedSearch('ss1')
      expect(req).toHaveBeenCalledWith('DELETE', '/saved-searches/ss1')
    })
  })

  // ── Onboarding Templates ──────────────────────────────────────────────────────
  describe('getOnboardingTemplates', () => {
    it('calls GET /onboarding-templates', async () => {
      req.mockResolvedValue({ templates: [] })
      await platformService.getOnboardingTemplates()
      expect(req).toHaveBeenCalledWith('GET', '/onboarding-templates')
    })

    it('returns r.templates when present', async () => {
      const templates = [{ _id: 't1', name: 'Engineering Onboarding' }]
      req.mockResolvedValue({ templates })
      const result = await platformService.getOnboardingTemplates()
      expect(result).toEqual(templates)
    })
  })

  describe('createOnboardingTemplate', () => {
    it('calls POST /onboarding-templates with data', async () => {
      req.mockResolvedValue({ template: { _id: 't1' } })
      const data = { name: 'Engineering Onboarding', tasks: [] }
      await platformService.createOnboardingTemplate(data)
      expect(req).toHaveBeenCalledWith('POST', '/onboarding-templates', data)
    })
  })

  describe('deleteOnboardingTemplate', () => {
    it('calls DELETE /onboarding-templates/:id', async () => {
      req.mockResolvedValue({})
      await platformService.deleteOnboardingTemplate('t1')
      expect(req).toHaveBeenCalledWith('DELETE', '/onboarding-templates/t1')
    })
  })

  describe('applyOnboardingTemplate', () => {
    it('calls POST /onboarding-templates/:templateId/apply/:pbId with empty body', async () => {
      req.mockResolvedValue({})
      await platformService.applyOnboardingTemplate('t1', 'pb1')
      expect(req).toHaveBeenCalledWith('POST', '/onboarding-templates/t1/apply/pb1', {})
    })
  })

  // ── Talent Pool ───────────────────────────────────────────────────────────────
  describe('getTalentPools', () => {
    it('calls GET /talent-pool', async () => {
      req.mockResolvedValue({ pools: [] })
      await platformService.getTalentPools()
      expect(req).toHaveBeenCalledWith('GET', '/talent-pool')
    })

    it('returns r.pools when present', async () => {
      const pools = [{ _id: 'p1', name: 'Senior Devs' }]
      req.mockResolvedValue({ pools })
      const result = await platformService.getTalentPools()
      expect(result).toEqual(pools)
    })
  })

  describe('createTalentPool', () => {
    it('calls POST /talent-pool with data', async () => {
      req.mockResolvedValue({ pool: { _id: 'p1' } })
      const data = { name: 'Senior Devs' }
      await platformService.createTalentPool(data)
      expect(req).toHaveBeenCalledWith('POST', '/talent-pool', data)
    })
  })

  describe('getTalentPool', () => {
    it('calls GET /talent-pool/:id', async () => {
      req.mockResolvedValue({ pool: { _id: 'p1' } })
      await platformService.getTalentPool('p1')
      expect(req).toHaveBeenCalledWith('GET', '/talent-pool/p1')
    })
  })

  describe('deleteTalentPool', () => {
    it('calls DELETE /talent-pool/:id', async () => {
      req.mockResolvedValue({})
      await platformService.deleteTalentPool('p1')
      expect(req).toHaveBeenCalledWith('DELETE', '/talent-pool/p1')
    })
  })

  describe('addTalentPoolMember', () => {
    it('calls POST /talent-pool/:poolId/members with data', async () => {
      req.mockResolvedValue({})
      const data = { candidateId: 'c1', notes: 'Great fit' }
      await platformService.addTalentPoolMember('p1', data)
      expect(req).toHaveBeenCalledWith('POST', '/talent-pool/p1/members', data)
    })
  })

  describe('removeTalentPoolMember', () => {
    it('calls DELETE /talent-pool/:poolId/members/:candId', async () => {
      req.mockResolvedValue({})
      await platformService.removeTalentPoolMember('p1', 'c1')
      expect(req).toHaveBeenCalledWith('DELETE', '/talent-pool/p1/members/c1')
    })
  })

  describe('updateTalentPoolMemberNotes', () => {
    it('calls PATCH /talent-pool/:poolId/members/:candId with notes wrapped in object', async () => {
      req.mockResolvedValue({})
      await platformService.updateTalentPoolMemberNotes('p1', 'c1', 'Strong candidate')
      expect(req).toHaveBeenCalledWith('PATCH', '/talent-pool/p1/members/c1', { notes: 'Strong candidate' })
    })
  })

  // ── Rejection Templates ───────────────────────────────────────────────────────
  describe('getRejectionTemplates', () => {
    it('calls GET /rejection-templates without qs when stage is falsy', async () => {
      req.mockResolvedValue({ data: [] })
      await platformService.getRejectionTemplates(undefined)
      expect(req).toHaveBeenCalledWith('GET', '/rejection-templates')
    })

    it('appends ?stage=<stage> when stage is provided', async () => {
      req.mockResolvedValue({ data: [] })
      await platformService.getRejectionTemplates('interview')
      expect(req).toHaveBeenCalledWith('GET', '/rejection-templates?stage=interview')
    })

    it('returns r.data when present', async () => {
      const data = [{ _id: 'rt1', text: 'Sorry...' }]
      req.mockResolvedValue({ data })
      const result = await platformService.getRejectionTemplates('interview')
      expect(result).toEqual(data)
    })
  })

  describe('createRejectionTemplate', () => {
    it('calls POST /rejection-templates with data', async () => {
      req.mockResolvedValue({ data: { _id: 'rt1' } })
      const data = { stage: 'interview', text: 'Thank you but...' }
      await platformService.createRejectionTemplate(data)
      expect(req).toHaveBeenCalledWith('POST', '/rejection-templates', data)
    })
  })

  describe('deleteRejectionTemplate', () => {
    it('calls DELETE /rejection-templates/:id', async () => {
      req.mockResolvedValue({})
      await platformService.deleteRejectionTemplate('rt1')
      expect(req).toHaveBeenCalledWith('DELETE', '/rejection-templates/rt1')
    })
  })

  // ── Headcount Plans ───────────────────────────────────────────────────────────
  describe('getHeadcountPlans', () => {
    it('calls GET /headcount-plans', async () => {
      req.mockResolvedValue({ data: [] })
      await platformService.getHeadcountPlans()
      expect(req).toHaveBeenCalledWith('GET', '/headcount-plans')
    })

    it('returns r.data when present', async () => {
      const data = [{ _id: 'hcp1', title: 'Q1 Plan' }]
      req.mockResolvedValue({ data })
      const result = await platformService.getHeadcountPlans()
      expect(result).toEqual(data)
    })
  })

  describe('createHeadcountPlan', () => {
    it('calls POST /headcount-plans with data', async () => {
      req.mockResolvedValue({ data: { _id: 'hcp1' } })
      const data = { title: 'Q1 Plan', entries: [] }
      await platformService.createHeadcountPlan(data)
      expect(req).toHaveBeenCalledWith('POST', '/headcount-plans', data)
    })
  })

  describe('getHeadcountPlan', () => {
    it('calls GET /headcount-plans/:id', async () => {
      req.mockResolvedValue({ data: { _id: 'hcp1' } })
      await platformService.getHeadcountPlan('hcp1')
      expect(req).toHaveBeenCalledWith('GET', '/headcount-plans/hcp1')
    })
  })

  describe('updateHeadcountPlan', () => {
    it('calls PATCH /headcount-plans/:id with data', async () => {
      req.mockResolvedValue({ data: { _id: 'hcp1' } })
      await platformService.updateHeadcountPlan('hcp1', { title: 'Updated Q1' })
      expect(req).toHaveBeenCalledWith('PATCH', '/headcount-plans/hcp1', { title: 'Updated Q1' })
    })
  })

  describe('deleteHeadcountPlan', () => {
    it('calls DELETE /headcount-plans/:id', async () => {
      req.mockResolvedValue({})
      await platformService.deleteHeadcountPlan('hcp1')
      expect(req).toHaveBeenCalledWith('DELETE', '/headcount-plans/hcp1')
    })
  })

  describe('linkJobToEntry', () => {
    it('calls PATCH /headcount-plans/:planId/entries/:entryId/link with jobId', async () => {
      req.mockResolvedValue({})
      await platformService.linkJobToEntry('hcp1', 'entry1', 'j1')
      expect(req).toHaveBeenCalledWith('PATCH', '/headcount-plans/hcp1/entries/entry1/link', { jobId: 'j1' })
    })
  })

  describe('createJobFromEntry', () => {
    it('calls POST /headcount-plans/:planId/entries/:entryId/create-job', async () => {
      req.mockResolvedValue({ data: { _id: 'j1' } })
      await platformService.createJobFromEntry('hcp1', 'entry1')
      expect(req).toHaveBeenCalledWith('POST', '/headcount-plans/hcp1/entries/entry1/create-job')
    })

    it('returns r.data when present', async () => {
      const data = { _id: 'j1', title: 'New Job' }
      req.mockResolvedValue({ data })
      const result = await platformService.createJobFromEntry('hcp1', 'entry1')
      expect(result).toEqual(data)
    })
  })
})
