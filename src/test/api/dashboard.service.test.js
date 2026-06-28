import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/client.js', () => ({
  req: vi.fn(),
}))

import { dashboardService } from '../../api/services/dashboard.service.js'
import { req } from '../../api/client.js'

describe('dashboardService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // ── getColleges ───────────────────────────────────────────────────────────────
  describe('getColleges', () => {
    it('calls GET /dashboard/colleges', async () => {
      req.mockResolvedValue([])
      await dashboardService.getColleges()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/colleges')
    })

    it('returns the response value', async () => {
      const colleges = [{ name: 'MIT' }, { name: 'Stanford' }]
      req.mockResolvedValue(colleges)
      const result = await dashboardService.getColleges()
      expect(result).toEqual(colleges)
    })
  })

  // ── getCollegeDirectory ───────────────────────────────────────────────────────
  describe('getCollegeDirectory', () => {
    it('calls GET /dashboard/college-directory without qs when no query', async () => {
      req.mockResolvedValue([])
      await dashboardService.getCollegeDirectory()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/college-directory')
    })

    it('calls GET /dashboard/college-directory without qs for empty string', async () => {
      req.mockResolvedValue([])
      await dashboardService.getCollegeDirectory('')
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/college-directory')
    })

    it('appends ?q=<value> when a query is provided', async () => {
      req.mockResolvedValue([])
      await dashboardService.getCollegeDirectory('MIT')
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/college-directory?q=MIT')
    })
  })

  // ── getCollegeOverview ────────────────────────────────────────────────────────
  describe('getCollegeOverview', () => {
    it('calls GET /dashboard/college/overview', async () => {
      req.mockResolvedValue({})
      await dashboardService.getCollegeOverview()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/college/overview')
    })
  })

  // ── getCollegeStudents ────────────────────────────────────────────────────────
  describe('getCollegeStudents', () => {
    it('calls GET /dashboard/college/students without qs when no params', async () => {
      req.mockResolvedValue([])
      await dashboardService.getCollegeStudents()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/college/students')
    })

    it('appends query string for provided params', async () => {
      req.mockResolvedValue([])
      await dashboardService.getCollegeStudents({ year: 2024, dept: 'CS' })
      const url = req.mock.calls[0][1]
      expect(url).toContain('year=2024')
      expect(url).toContain('dept=CS')
    })

    it('omits null and undefined values from query string', async () => {
      req.mockResolvedValue([])
      await dashboardService.getCollegeStudents({ year: 2024, dept: null, batch: undefined })
      const url = req.mock.calls[0][1]
      expect(url).not.toContain('dept=')
      expect(url).not.toContain('batch=')
    })
  })

  // ── getCollegePlacements ──────────────────────────────────────────────────────
  describe('getCollegePlacements', () => {
    it('calls GET /dashboard/college/placements without qs when no params', async () => {
      req.mockResolvedValue([])
      await dashboardService.getCollegePlacements()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/college/placements')
    })

    it('appends query string when params provided', async () => {
      req.mockResolvedValue([])
      await dashboardService.getCollegePlacements({ status: 'placed' })
      const url = req.mock.calls[0][1]
      expect(url).toContain('status=placed')
    })
  })

  // ── updateCollegePlacementNotes ───────────────────────────────────────────────
  describe('updateCollegePlacementNotes', () => {
    it('calls PATCH /dashboard/college/placements/:id/notes with notes in body', async () => {
      req.mockResolvedValue({})
      await dashboardService.updateCollegePlacementNotes('p1', 'Great candidate')
      expect(req).toHaveBeenCalledWith('PATCH', '/dashboard/college/placements/p1/notes', { notes: 'Great candidate' })
    })
  })

  // ── getCollegeGroups ──────────────────────────────────────────────────────────
  describe('getCollegeGroups', () => {
    it('calls GET /dashboard/college-groups', async () => {
      req.mockResolvedValue([])
      await dashboardService.getCollegeGroups()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/college-groups')
    })
  })

  // ── getCollegeGroupCandidates ─────────────────────────────────────────────────
  describe('getCollegeGroupCandidates', () => {
    it('calls GET /dashboard/college-groups/:name/candidates with encoded name', async () => {
      req.mockResolvedValue([])
      await dashboardService.getCollegeGroupCandidates('Top Tier', {})
      const url = req.mock.calls[0][1]
      expect(url).toBe('/dashboard/college-groups/Top%20Tier/candidates')
    })

    it('appends query string params', async () => {
      req.mockResolvedValue([])
      await dashboardService.getCollegeGroupCandidates('GroupA', { limit: 50 })
      const url = req.mock.calls[0][1]
      expect(url).toContain('limit=50')
    })

    it('URL-encodes special characters in name', async () => {
      req.mockResolvedValue([])
      await dashboardService.getCollegeGroupCandidates('Group & Co', {})
      const url = req.mock.calls[0][1]
      expect(url).toContain('Group%20%26%20Co')
    })
  })

  // ── getCompanyDirectory ───────────────────────────────────────────────────────
  describe('getCompanyDirectory', () => {
    it('calls GET /dashboard/company-directory without qs when no query', async () => {
      req.mockResolvedValue([])
      await dashboardService.getCompanyDirectory()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/company-directory')
    })

    it('appends ?q=<value> when query provided', async () => {
      req.mockResolvedValue([])
      await dashboardService.getCompanyDirectory('Google')
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/company-directory?q=Google')
    })
  })

  // ── getCompanyGroups ──────────────────────────────────────────────────────────
  describe('getCompanyGroups', () => {
    it('calls GET /dashboard/company-groups', async () => {
      req.mockResolvedValue([])
      await dashboardService.getCompanyGroups()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/company-groups')
    })
  })

  // ── getCompanyGroupCandidates ─────────────────────────────────────────────────
  describe('getCompanyGroupCandidates', () => {
    it('calls GET /dashboard/company-groups/:name/candidates with encoded name', async () => {
      req.mockResolvedValue([])
      await dashboardService.getCompanyGroupCandidates('FAANG', {})
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/company-groups/FAANG/candidates')
    })

    it('appends query params', async () => {
      req.mockResolvedValue([])
      await dashboardService.getCompanyGroupCandidates('TechCo', { page: 2 })
      const url = req.mock.calls[0][1]
      expect(url).toContain('page=2')
    })
  })

  // ── importCollegeStudents ─────────────────────────────────────────────────────
  describe('importCollegeStudents', () => {
    it('calls POST /dashboard/college/students/import with candidates wrapped', async () => {
      req.mockResolvedValue({})
      const candidates = [{ email: 'a@college.edu' }]
      await dashboardService.importCollegeStudents(candidates)
      expect(req).toHaveBeenCalledWith('POST', '/dashboard/college/students/import', { candidates })
    })
  })

  // ── sendCollegeAnnouncement ───────────────────────────────────────────────────
  describe('sendCollegeAnnouncement', () => {
    it('calls POST /dashboard/college/announcements with title, message, link', async () => {
      req.mockResolvedValue({})
      await dashboardService.sendCollegeAnnouncement('Hiring Drive', 'Join us!', 'https://example.com')
      expect(req).toHaveBeenCalledWith(
        'POST',
        '/dashboard/college/announcements',
        { title: 'Hiring Drive', message: 'Join us!', link: 'https://example.com' }
      )
    })
  })

  // ── getCollegeDrives ──────────────────────────────────────────────────────────
  describe('getCollegeDrives', () => {
    it('calls GET /dashboard/college/drives', async () => {
      req.mockResolvedValue([])
      await dashboardService.getCollegeDrives()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/college/drives')
    })
  })

  // ── notifyCollegeDrive ────────────────────────────────────────────────────────
  describe('notifyCollegeDrive', () => {
    it('calls POST /dashboard/college/drives/:jobId/notify', async () => {
      req.mockResolvedValue({})
      await dashboardService.notifyCollegeDrive('job1')
      expect(req).toHaveBeenCalledWith('POST', '/dashboard/college/drives/job1/notify')
    })
  })

  // ── getPlacementDrives ────────────────────────────────────────────────────────
  describe('getPlacementDrives', () => {
    it('calls GET /dashboard/college/placement-drives', async () => {
      req.mockResolvedValue([])
      await dashboardService.getPlacementDrives()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/college/placement-drives')
    })
  })

  // ── getJobsForCompany ─────────────────────────────────────────────────────────
  describe('getJobsForCompany', () => {
    it('calls GET /dashboard/college/jobs-for-company?companyName=<encoded>', async () => {
      req.mockResolvedValue([])
      await dashboardService.getJobsForCompany('Google')
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/college/jobs-for-company?companyName=Google')
    })

    it('URL-encodes special characters in company name', async () => {
      req.mockResolvedValue([])
      await dashboardService.getJobsForCompany('Smith & Sons')
      const url = req.mock.calls[0][1]
      expect(url).toContain('companyName=Smith%20%26%20Sons')
    })
  })

  // ── createPlacementDrive ──────────────────────────────────────────────────────
  describe('createPlacementDrive', () => {
    it('calls POST /dashboard/college/placement-drives with payload', async () => {
      req.mockResolvedValue({})
      const payload = { title: 'Campus Drive 2025', date: '2025-03-01' }
      await dashboardService.createPlacementDrive(payload)
      expect(req).toHaveBeenCalledWith('POST', '/dashboard/college/placement-drives', payload)
    })
  })

  // ── getPlacementDrive ─────────────────────────────────────────────────────────
  describe('getPlacementDrive', () => {
    it('calls GET /dashboard/college/placement-drives/:id', async () => {
      req.mockResolvedValue({})
      await dashboardService.getPlacementDrive('drive1')
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/college/placement-drives/drive1')
    })
  })

  // ── updatePlacementDrive ──────────────────────────────────────────────────────
  describe('updatePlacementDrive', () => {
    it('calls PATCH /dashboard/college/placement-drives/:id with payload', async () => {
      req.mockResolvedValue({})
      const payload = { status: 'completed' }
      await dashboardService.updatePlacementDrive('drive1', payload)
      expect(req).toHaveBeenCalledWith('PATCH', '/dashboard/college/placement-drives/drive1', payload)
    })
  })

  // ── updatePlacementDriveRegistration ─────────────────────────────────────────
  describe('updatePlacementDriveRegistration', () => {
    it('calls PATCH /dashboard/college/placement-drives/:id/registrations/:candidateId with payload', async () => {
      req.mockResolvedValue({})
      const payload = { status: 'shortlisted' }
      await dashboardService.updatePlacementDriveRegistration('drive1', 'cand1', payload)
      expect(req).toHaveBeenCalledWith(
        'PATCH',
        '/dashboard/college/placement-drives/drive1/registrations/cand1',
        payload
      )
    })
  })

  // ── deletePlacementDrive ──────────────────────────────────────────────────────
  describe('deletePlacementDrive', () => {
    it('calls DELETE /dashboard/college/placement-drives/:id', async () => {
      req.mockResolvedValue({})
      await dashboardService.deletePlacementDrive('drive1')
      expect(req).toHaveBeenCalledWith('DELETE', '/dashboard/college/placement-drives/drive1')
    })
  })

  // ── notifyPlacementDrive ──────────────────────────────────────────────────────
  describe('notifyPlacementDrive', () => {
    it('calls POST /dashboard/college/placement-drives/:id/notify with payload', async () => {
      req.mockResolvedValue({})
      const payload = { message: 'Drive starting soon!' }
      await dashboardService.notifyPlacementDrive('drive1', payload)
      expect(req).toHaveBeenCalledWith('POST', '/dashboard/college/placement-drives/drive1/notify', payload)
    })
  })

  // ── requestCampusDrive ────────────────────────────────────────────────────────
  describe('requestCampusDrive', () => {
    it('calls POST /dashboard/company/drive-requests with payload', async () => {
      req.mockResolvedValue({})
      const payload = { companyName: 'ACME', requestedDate: '2025-05-01' }
      await dashboardService.requestCampusDrive(payload)
      expect(req).toHaveBeenCalledWith('POST', '/dashboard/company/drive-requests', payload)
    })
  })

  // ── getDriveRequests ──────────────────────────────────────────────────────────
  describe('getDriveRequests', () => {
    it('calls GET /dashboard/college/drive-requests', async () => {
      req.mockResolvedValue([])
      await dashboardService.getDriveRequests()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/college/drive-requests')
    })
  })

  // ── approveDriveRequest ───────────────────────────────────────────────────────
  describe('approveDriveRequest', () => {
    it('calls POST /dashboard/college/drive-requests/:id/approve', async () => {
      req.mockResolvedValue({})
      await dashboardService.approveDriveRequest('req1')
      expect(req).toHaveBeenCalledWith('POST', '/dashboard/college/drive-requests/req1/approve')
    })
  })

  // ── rejectDriveRequest ────────────────────────────────────────────────────────
  describe('rejectDriveRequest', () => {
    it('calls POST /dashboard/college/drive-requests/:id/reject', async () => {
      req.mockResolvedValue({})
      await dashboardService.rejectDriveRequest('req1')
      expect(req).toHaveBeenCalledWith('POST', '/dashboard/college/drive-requests/req1/reject')
    })
  })

  // ── getAdminDriveApprovals ────────────────────────────────────────────────────
  describe('getAdminDriveApprovals', () => {
    it('calls GET /dashboard/admin/drive-approvals', async () => {
      req.mockResolvedValue([])
      await dashboardService.getAdminDriveApprovals()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/admin/drive-approvals')
    })
  })

  // ── approveInternalDriveRequest ───────────────────────────────────────────────
  describe('approveInternalDriveRequest', () => {
    it('calls POST /dashboard/admin/drive-approvals/:id/approve', async () => {
      req.mockResolvedValue({})
      await dashboardService.approveInternalDriveRequest('appr1')
      expect(req).toHaveBeenCalledWith('POST', '/dashboard/admin/drive-approvals/appr1/approve')
    })
  })

  // ── rejectInternalDriveRequest ────────────────────────────────────────────────
  describe('rejectInternalDriveRequest', () => {
    it('calls POST /dashboard/admin/drive-approvals/:id/reject', async () => {
      req.mockResolvedValue({})
      await dashboardService.rejectInternalDriveRequest('appr1')
      expect(req).toHaveBeenCalledWith('POST', '/dashboard/admin/drive-approvals/appr1/reject')
    })
  })

  // ── adminCreateDrive ──────────────────────────────────────────────────────────
  describe('adminCreateDrive', () => {
    it('calls POST /dashboard/admin/drives with payload', async () => {
      req.mockResolvedValue({})
      const payload = { title: 'Admin Drive', recruiterId: 'r1' }
      await dashboardService.adminCreateDrive(payload)
      expect(req).toHaveBeenCalledWith('POST', '/dashboard/admin/drives', payload)
    })
  })

  // ── getCollegeAssessments ─────────────────────────────────────────────────────
  describe('getCollegeAssessments', () => {
    it('calls GET /dashboard/college/assessments', async () => {
      req.mockResolvedValue([])
      await dashboardService.getCollegeAssessments()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/college/assessments')
    })
  })

  // ── getTrainingResources ──────────────────────────────────────────────────────
  describe('getTrainingResources', () => {
    it('calls GET /dashboard/college/training-resources', async () => {
      req.mockResolvedValue([])
      await dashboardService.getTrainingResources()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/college/training-resources')
    })
  })

  // ── createTrainingResource ────────────────────────────────────────────────────
  describe('createTrainingResource', () => {
    it('calls POST /dashboard/college/training-resources with payload', async () => {
      req.mockResolvedValue({})
      const payload = { title: 'JS Basics', url: 'https://example.com' }
      await dashboardService.createTrainingResource(payload)
      expect(req).toHaveBeenCalledWith('POST', '/dashboard/college/training-resources', payload)
    })
  })

  // ── deleteTrainingResource ────────────────────────────────────────────────────
  describe('deleteTrainingResource', () => {
    it('calls DELETE /dashboard/college/training-resources/:id', async () => {
      req.mockResolvedValue({})
      await dashboardService.deleteTrainingResource('tr1')
      expect(req).toHaveBeenCalledWith('DELETE', '/dashboard/college/training-resources/tr1')
    })
  })

  // ── notifyTrainingResource ────────────────────────────────────────────────────
  describe('notifyTrainingResource', () => {
    it('calls POST /dashboard/college/training-resources/:id/notify with payload', async () => {
      req.mockResolvedValue({})
      const payload = { message: 'New resource available!' }
      await dashboardService.notifyTrainingResource('tr1', payload)
      expect(req).toHaveBeenCalledWith('POST', '/dashboard/college/training-resources/tr1/notify', payload)
    })
  })

  // ── getCandidateOpportunities ─────────────────────────────────────────────────
  describe('getCandidateOpportunities', () => {
    it('calls GET /dashboard/candidate/opportunities', async () => {
      req.mockResolvedValue([])
      await dashboardService.getCandidateOpportunities()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/candidate/opportunities')
    })
  })

  // ── registerForOpportunity ────────────────────────────────────────────────────
  describe('registerForOpportunity', () => {
    it('calls POST /dashboard/candidate/opportunities/:id/register', async () => {
      req.mockResolvedValue({})
      await dashboardService.registerForOpportunity('opp1')
      expect(req).toHaveBeenCalledWith('POST', '/dashboard/candidate/opportunities/opp1/register')
    })
  })

  // ── withdrawFromOpportunity ───────────────────────────────────────────────────
  describe('withdrawFromOpportunity', () => {
    it('calls DELETE /dashboard/candidate/opportunities/:id/register', async () => {
      req.mockResolvedValue({})
      await dashboardService.withdrawFromOpportunity('opp1')
      expect(req).toHaveBeenCalledWith('DELETE', '/dashboard/candidate/opportunities/opp1/register')
    })
  })

  // ── getCandidateTrainingResources ─────────────────────────────────────────────
  describe('getCandidateTrainingResources', () => {
    it('calls GET /dashboard/candidate/training-resources', async () => {
      req.mockResolvedValue([])
      await dashboardService.getCandidateTrainingResources()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/candidate/training-resources')
    })
  })

  // ── getCandidateSkillRecommendations ──────────────────────────────────────────
  describe('getCandidateSkillRecommendations', () => {
    it('calls GET /dashboard/candidate/skill-recommendations', async () => {
      req.mockResolvedValue([])
      await dashboardService.getCandidateSkillRecommendations()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/candidate/skill-recommendations')
    })
  })

  // ── getCollegeSkillGaps ───────────────────────────────────────────────────────
  describe('getCollegeSkillGaps', () => {
    it('calls GET /dashboard/college/skill-gaps', async () => {
      req.mockResolvedValue([])
      await dashboardService.getCollegeSkillGaps()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/college/skill-gaps')
    })
  })

  // ── getStudentSkillRecommendations ────────────────────────────────────────────
  describe('getStudentSkillRecommendations', () => {
    it('calls GET /dashboard/college/students/:id/skill-recommendations', async () => {
      req.mockResolvedValue([])
      await dashboardService.getStudentSkillRecommendations('s1')
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/college/students/s1/skill-recommendations')
    })
  })

  // ── getDashboardStats ─────────────────────────────────────────────────────────
  describe('getDashboardStats', () => {
    it('calls GET /dashboard/stats without query when platform is falsy', async () => {
      req.mockResolvedValue({})
      await dashboardService.getDashboardStats(false)
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/stats')
    })

    it('calls GET /dashboard/stats?platform=true when platform is truthy', async () => {
      req.mockResolvedValue({})
      await dashboardService.getDashboardStats(true)
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/stats?platform=true')
    })

    it('also uses platform=true for any truthy value', async () => {
      req.mockResolvedValue({})
      await dashboardService.getDashboardStats('yes')
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/stats?platform=true')
    })
  })

  // ── getPipelineHealth ─────────────────────────────────────────────────────────
  describe('getPipelineHealth', () => {
    it('calls GET /dashboard/pipeline-health', async () => {
      req.mockResolvedValue({})
      await dashboardService.getPipelineHealth()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/pipeline-health')
    })
  })

  // ── getRecruiterLeaderboard ───────────────────────────────────────────────────
  describe('getRecruiterLeaderboard', () => {
    it('calls GET /dashboard/recruiter-leaderboard', async () => {
      req.mockResolvedValue([])
      await dashboardService.getRecruiterLeaderboard()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/recruiter-leaderboard')
    })
  })

  // ── getTopSkills ──────────────────────────────────────────────────────────────
  describe('getTopSkills', () => {
    it('calls GET /dashboard/top-skills', async () => {
      req.mockResolvedValue([])
      await dashboardService.getTopSkills()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/top-skills')
    })
  })

  // ── getAvailabilityPool ───────────────────────────────────────────────────────
  describe('getAvailabilityPool', () => {
    it('calls GET /dashboard/availability-pool', async () => {
      req.mockResolvedValue([])
      await dashboardService.getAvailabilityPool()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/availability-pool')
    })
  })

  // ── getJobsBreakdown ──────────────────────────────────────────────────────────
  describe('getJobsBreakdown', () => {
    it('calls GET /dashboard/jobs-breakdown', async () => {
      req.mockResolvedValue({})
      await dashboardService.getJobsBreakdown()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/jobs-breakdown')
    })
  })

  // ── getAnalytics ──────────────────────────────────────────────────────────────
  describe('getAnalytics', () => {
    it('calls GET /dashboard/analytics without qs when no params', async () => {
      req.mockResolvedValue({})
      await dashboardService.getAnalytics()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/analytics')
    })

    it('appends query string when params provided', async () => {
      req.mockResolvedValue({})
      await dashboardService.getAnalytics({ startDate: '2025-01-01', endDate: '2025-12-31' })
      const url = req.mock.calls[0][1]
      expect(url).toContain('startDate=2025-01-01')
      expect(url).toContain('endDate=2025-12-31')
    })

    it('omits null and undefined param values', async () => {
      req.mockResolvedValue({})
      await dashboardService.getAnalytics({ startDate: '2025-01-01', endDate: null })
      const url = req.mock.calls[0][1]
      expect(url).not.toContain('endDate=')
    })
  })

  // ── getRecruiterStats ─────────────────────────────────────────────────────────
  describe('getRecruiterStats', () => {
    it('calls GET /dashboard/recruiter-stats', async () => {
      req.mockResolvedValue({})
      await dashboardService.getRecruiterStats()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/recruiter-stats')
    })
  })

  // ── getHiringFunnel ───────────────────────────────────────────────────────────
  describe('getHiringFunnel', () => {
    it('calls GET /dashboard/hiring-funnel', async () => {
      req.mockResolvedValue({})
      await dashboardService.getHiringFunnel()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/hiring-funnel')
    })
  })

  // ── getJobPerformance ─────────────────────────────────────────────────────────
  describe('getJobPerformance', () => {
    it('calls GET /dashboard/job-performance', async () => {
      req.mockResolvedValue({})
      await dashboardService.getJobPerformance()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/job-performance')
    })
  })

  // ── getUpcomingInterviews ─────────────────────────────────────────────────────
  describe('getUpcomingInterviews', () => {
    it('calls GET /dashboard/upcoming-interviews', async () => {
      req.mockResolvedValue([])
      await dashboardService.getUpcomingInterviews()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/upcoming-interviews')
    })
  })

  // ── getCandidateStats ─────────────────────────────────────────────────────────
  describe('getCandidateStats', () => {
    it('calls GET /dashboard/candidate-stats', async () => {
      req.mockResolvedValue({})
      await dashboardService.getCandidateStats()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/candidate-stats')
    })
  })

  // ── getProfileScore ───────────────────────────────────────────────────────────
  describe('getProfileScore', () => {
    it('calls GET /dashboard/profile-score', async () => {
      req.mockResolvedValue({})
      await dashboardService.getProfileScore()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/profile-score')
    })
  })

  // ── getCandidatePipeline ──────────────────────────────────────────────────────
  describe('getCandidatePipeline', () => {
    it('calls GET /dashboard/candidate-pipeline', async () => {
      req.mockResolvedValue([])
      await dashboardService.getCandidatePipeline()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/candidate-pipeline')
    })
  })

  // ── getAIMatchedJobs ──────────────────────────────────────────────────────────
  describe('getAIMatchedJobs', () => {
    it('calls GET /dashboard/ai-matched-jobs?limit=10000000 by default', async () => {
      req.mockResolvedValue([])
      await dashboardService.getAIMatchedJobs()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/ai-matched-jobs?limit=10000000')
    })

    it('accepts a custom limit', async () => {
      req.mockResolvedValue([])
      await dashboardService.getAIMatchedJobs(20)
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/ai-matched-jobs?limit=20')
    })
  })

  // ── getCandidateUpcomingInterviews ────────────────────────────────────────────
  describe('getCandidateUpcomingInterviews', () => {
    it('calls GET /dashboard/candidate-upcoming-interviews', async () => {
      req.mockResolvedValue([])
      await dashboardService.getCandidateUpcomingInterviews()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/candidate-upcoming-interviews')
    })
  })

  // ── getTrends ─────────────────────────────────────────────────────────────────
  describe('getTrends', () => {
    it('calls GET /dashboard/trends', async () => {
      req.mockResolvedValue({})
      await dashboardService.getTrends()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/trends')
    })
  })

  // ── getUnregisteredStats ──────────────────────────────────────────────────────
  describe('getUnregisteredStats', () => {
    it('calls GET /dashboard/unregistered-stats', async () => {
      req.mockResolvedValue({})
      await dashboardService.getUnregisteredStats()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/unregistered-stats')
    })
  })

  // ── getSmartAlerts ────────────────────────────────────────────────────────────
  describe('getSmartAlerts', () => {
    it('calls GET /dashboard/smart-alerts without qs when no params', async () => {
      req.mockResolvedValue([])
      await dashboardService.getSmartAlerts()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/smart-alerts')
    })

    it('appends query string when params provided', async () => {
      req.mockResolvedValue([])
      await dashboardService.getSmartAlerts({ type: 'sla' })
      const url = req.mock.calls[0][1]
      expect(url).toContain('type=sla')
    })
  })

  // ── getStageTime ──────────────────────────────────────────────────────────────
  describe('getStageTime', () => {
    it('calls GET /dashboard/stage-time', async () => {
      req.mockResolvedValue({})
      await dashboardService.getStageTime()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/stage-time')
    })
  })

  // ── getOfferAnalytics ─────────────────────────────────────────────────────────
  describe('getOfferAnalytics', () => {
    it('calls GET /dashboard/offer-analytics', async () => {
      req.mockResolvedValue({})
      await dashboardService.getOfferAnalytics()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/offer-analytics')
    })
  })

  // ── getSourceEffectiveness ────────────────────────────────────────────────────
  describe('getSourceEffectiveness', () => {
    it('calls GET /dashboard/source-effectiveness', async () => {
      req.mockResolvedValue({})
      await dashboardService.getSourceEffectiveness()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/source-effectiveness')
    })
  })

  // ── getApplicants ─────────────────────────────────────────────────────────────
  describe('getApplicants', () => {
    it('calls GET /dashboard/applicants without qs when no params', async () => {
      req.mockResolvedValue([])
      await dashboardService.getApplicants()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/applicants')
    })

    it('appends query string for provided params', async () => {
      req.mockResolvedValue([])
      await dashboardService.getApplicants({ jobId: 'j1', stage: 'interview' })
      const url = req.mock.calls[0][1]
      expect(url).toContain('jobId=j1')
      expect(url).toContain('stage=interview')
    })
  })

  // ── getApplicantsSummary ──────────────────────────────────────────────────────
  describe('getApplicantsSummary', () => {
    it('calls GET /dashboard/applicants/summary without qs when no params', async () => {
      req.mockResolvedValue({})
      await dashboardService.getApplicantsSummary()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/applicants/summary')
    })

    it('appends query params', async () => {
      req.mockResolvedValue({})
      await dashboardService.getApplicantsSummary({ jobId: 'j2' })
      const url = req.mock.calls[0][1]
      expect(url).toContain('jobId=j2')
    })
  })

  // ── getCandidateRecords ───────────────────────────────────────────────────────
  describe('getCandidateRecords', () => {
    it('calls GET /dashboard/candidate-records without qs when no params', async () => {
      req.mockResolvedValue([])
      await dashboardService.getCandidateRecords()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/candidate-records')
    })

    it('appends query params', async () => {
      req.mockResolvedValue([])
      await dashboardService.getCandidateRecords({ status: 'placed' })
      const url = req.mock.calls[0][1]
      expect(url).toContain('status=placed')
    })
  })

  // ── getFunnel ─────────────────────────────────────────────────────────────────
  describe('getFunnel', () => {
    it('calls GET /dashboard/funnel without qs when no params', async () => {
      req.mockResolvedValue({})
      await dashboardService.getFunnel()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/funnel')
    })

    it('appends startDate, endDate, jobId params', async () => {
      req.mockResolvedValue({})
      await dashboardService.getFunnel({ startDate: '2025-01-01', endDate: '2025-06-30', jobId: 'j1' })
      const url = req.mock.calls[0][1]
      expect(url).toContain('startDate=2025-01-01')
      expect(url).toContain('endDate=2025-06-30')
      expect(url).toContain('jobId=j1')
    })
  })

  // ── getSourceBreakdown ────────────────────────────────────────────────────────
  describe('getSourceBreakdown', () => {
    it('calls GET /dashboard/source-breakdown without qs when no params', async () => {
      req.mockResolvedValue({})
      await dashboardService.getSourceBreakdown()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/source-breakdown')
    })

    it('appends date range params', async () => {
      req.mockResolvedValue({})
      await dashboardService.getSourceBreakdown({ startDate: '2025-01-01', endDate: '2025-03-31' })
      const url = req.mock.calls[0][1]
      expect(url).toContain('startDate=2025-01-01')
      expect(url).toContain('endDate=2025-03-31')
    })
  })

  // ── getTimeToHire ─────────────────────────────────────────────────────────────
  describe('getTimeToHire', () => {
    it('calls GET /dashboard/time-to-hire without qs when no params', async () => {
      req.mockResolvedValue({})
      await dashboardService.getTimeToHire()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/time-to-hire')
    })

    it('appends date range params', async () => {
      req.mockResolvedValue({})
      await dashboardService.getTimeToHire({ startDate: '2025-01-01' })
      const url = req.mock.calls[0][1]
      expect(url).toContain('startDate=2025-01-01')
    })
  })

  // ── getStageVelocity ──────────────────────────────────────────────────────────
  describe('getStageVelocity', () => {
    it('calls GET /dashboard/stage-velocity without qs when no params', async () => {
      req.mockResolvedValue({})
      await dashboardService.getStageVelocity()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/stage-velocity')
    })

    it('appends date range params', async () => {
      req.mockResolvedValue({})
      await dashboardService.getStageVelocity({ startDate: '2025-01-01', endDate: '2025-12-31' })
      const url = req.mock.calls[0][1]
      expect(url).toContain('startDate=2025-01-01')
    })
  })

  // ── getOfferAcceptance ────────────────────────────────────────────────────────
  describe('getOfferAcceptance', () => {
    it('calls GET /dashboard/offer-acceptance without qs when no params', async () => {
      req.mockResolvedValue({})
      await dashboardService.getOfferAcceptance()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/offer-acceptance')
    })

    it('appends query params', async () => {
      req.mockResolvedValue({})
      await dashboardService.getOfferAcceptance({ startDate: '2025-01-01' })
      const url = req.mock.calls[0][1]
      expect(url).toContain('startDate=2025-01-01')
    })
  })

  // ── getDropoutAnalysis ────────────────────────────────────────────────────────
  describe('getDropoutAnalysis', () => {
    it('calls GET /dashboard/dropout-analysis without qs when no params', async () => {
      req.mockResolvedValue({})
      await dashboardService.getDropoutAnalysis()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/dropout-analysis')
    })

    it('appends query params', async () => {
      req.mockResolvedValue({})
      await dashboardService.getDropoutAnalysis({ endDate: '2025-06-30' })
      const url = req.mock.calls[0][1]
      expect(url).toContain('endDate=2025-06-30')
    })
  })

  // ── getRecruiterPerformance ───────────────────────────────────────────────────
  describe('getRecruiterPerformance', () => {
    it('calls GET /dashboard/recruiter-performance without qs when no params', async () => {
      req.mockResolvedValue({})
      await dashboardService.getRecruiterPerformance()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/recruiter-performance')
    })

    it('appends startDate, endDate, recruiterId params', async () => {
      req.mockResolvedValue({})
      await dashboardService.getRecruiterPerformance({ recruiterId: 'r1', startDate: '2025-01-01' })
      const url = req.mock.calls[0][1]
      expect(url).toContain('recruiterId=r1')
      expect(url).toContain('startDate=2025-01-01')
    })
  })

  // ── getSlaCompliance ──────────────────────────────────────────────────────────
  describe('getSlaCompliance', () => {
    it('calls GET /dashboard/sla-compliance without qs when no params', async () => {
      req.mockResolvedValue({})
      await dashboardService.getSlaCompliance()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/sla-compliance')
    })

    it('appends query params', async () => {
      req.mockResolvedValue({})
      await dashboardService.getSlaCompliance({ startDate: '2025-01-01', endDate: '2025-06-30' })
      const url = req.mock.calls[0][1]
      expect(url).toContain('startDate=2025-01-01')
    })
  })

  // ── getUnregisteredCandidates ─────────────────────────────────────────────────
  describe('getUnregisteredCandidates', () => {
    it('calls GET /dashboard/unregistered-candidates without qs when no params', async () => {
      req.mockResolvedValue([])
      await dashboardService.getUnregisteredCandidates()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/unregistered-candidates')
    })

    it('appends query params', async () => {
      req.mockResolvedValue([])
      await dashboardService.getUnregisteredCandidates({ page: 1 })
      const url = req.mock.calls[0][1]
      expect(url).toContain('page=1')
    })
  })

  // ── getDiversityReport ────────────────────────────────────────────────────────
  describe('getDiversityReport', () => {
    it('calls GET /stats/diversity without qs when no params', async () => {
      req.mockResolvedValue({})
      await dashboardService.getDiversityReport()
      expect(req).toHaveBeenCalledWith('GET', '/stats/diversity')
    })

    it('appends query params', async () => {
      req.mockResolvedValue({})
      await dashboardService.getDiversityReport({ startDate: '2025-01-01' })
      const url = req.mock.calls[0][1]
      expect(url).toContain('/stats/diversity')
      expect(url).toContain('startDate=2025-01-01')
    })
  })

  // ── seedDiversityData ─────────────────────────────────────────────────────────
  describe('seedDiversityData', () => {
    it('calls POST /stats/diversity/seed with empty body', async () => {
      req.mockResolvedValue({})
      await dashboardService.seedDiversityData()
      expect(req).toHaveBeenCalledWith('POST', '/stats/diversity/seed', {})
    })
  })

  // ── getPipelineHeatmap ────────────────────────────────────────────────────────
  describe('getPipelineHeatmap', () => {
    it('calls GET /dashboard/pipeline-heatmap?days=90 by default', async () => {
      req.mockResolvedValue({})
      await dashboardService.getPipelineHeatmap()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/pipeline-heatmap?days=90')
    })

    it('accepts a custom days value', async () => {
      req.mockResolvedValue({})
      await dashboardService.getPipelineHeatmap(30)
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/pipeline-heatmap?days=30')
    })
  })

  // ── getTimeToFill ─────────────────────────────────────────────────────────────
  describe('getTimeToFill', () => {
    it('calls GET /dashboard/time-to-fill without qs when no params', async () => {
      req.mockResolvedValue({})
      await dashboardService.getTimeToFill()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/time-to-fill')
    })

    it('appends query params', async () => {
      req.mockResolvedValue({})
      await dashboardService.getTimeToFill({ startDate: '2025-01-01' })
      const url = req.mock.calls[0][1]
      expect(url).toContain('startDate=2025-01-01')
    })
  })

  // ── getCompanyCollegeDrives ───────────────────────────────────────────────────
  describe('getCompanyCollegeDrives', () => {
    it('calls GET /dashboard/company/college-drives', async () => {
      req.mockResolvedValue([])
      await dashboardService.getCompanyCollegeDrives()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/company/college-drives')
    })
  })

  // ── getCompanyCollegeDrive ────────────────────────────────────────────────────
  describe('getCompanyCollegeDrive', () => {
    it('calls GET /dashboard/company/college-drives/:id', async () => {
      req.mockResolvedValue({})
      await dashboardService.getCompanyCollegeDrive('drive1')
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/company/college-drives/drive1')
    })
  })

  // ── updateDriveRegistrationStatus ────────────────────────────────────────────
  describe('updateDriveRegistrationStatus', () => {
    it('calls PATCH /dashboard/company/college-drives/:driveId/registrations/:candidateId with payload', async () => {
      req.mockResolvedValue({})
      const payload = { status: 'accepted' }
      await dashboardService.updateDriveRegistrationStatus('drive1', 'cand1', payload)
      expect(req).toHaveBeenCalledWith(
        'PATCH',
        '/dashboard/company/college-drives/drive1/registrations/cand1',
        payload
      )
    })
  })

  // ── getMyDriveRegistrations ───────────────────────────────────────────────────
  describe('getMyDriveRegistrations', () => {
    it('calls GET /dashboard/candidate/my-drive-registrations', async () => {
      req.mockResolvedValue([])
      await dashboardService.getMyDriveRegistrations()
      expect(req).toHaveBeenCalledWith('GET', '/dashboard/candidate/my-drive-registrations')
    })
  })
})
