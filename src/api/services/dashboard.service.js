import { req } from '../client.js';

/**
 * Build a query string from a params object, skipping undefined/null values.
 */
function qs(params = {}) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.set(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const dashboardService = {
  // ── Existing dashboard endpoints ─────────────────────────────────────────
  async getColleges()                   { return req('GET', '/dashboard/colleges'); },
  async getCollegeDirectory(q = '')     { return req('GET', `/dashboard/college-directory${qs({ q: q || undefined })}`); },
  async getCollegeOverview()            { return req('GET', '/dashboard/college/overview'); },
  async getCollegeStudents(params = {}) { return req('GET', `/dashboard/college/students${qs(params)}`); },
  async getCollegePlacements(params = {}) { return req('GET', `/dashboard/college/placements${qs(params)}`); },
  async updateCollegePlacementNotes(id, notes) { return req('PATCH', `/dashboard/college/placements/${id}/notes`, { notes }); },
  async getCollegeGroups()               { return req('GET', '/dashboard/college-groups'); },
  async getCollegeGroupCandidates(name, params = {}) { return req('GET', `/dashboard/college-groups/${encodeURIComponent(name)}/candidates${qs(params)}`); },
  async getCompanyDirectory(q = '')      { return req('GET', `/dashboard/company-directory${qs({ q: q || undefined })}`); },
  async getCompanyGroups()               { return req('GET', '/dashboard/company-groups'); },
  async getCompanyGroupCandidates(name, params = {}) { return req('GET', `/dashboard/company-groups/${encodeURIComponent(name)}/candidates${qs(params)}`); },
  async importCollegeStudents(candidates) { return req('POST', '/dashboard/college/students/import', { candidates }); },
  async sendCollegeAnnouncement(title, message, link) { return req('POST', '/dashboard/college/announcements', { title, message, link }); },
  async getCollegeDrives()               { return req('GET', '/dashboard/college/drives'); },
  async notifyCollegeDrive(jobId)        { return req('POST', `/dashboard/college/drives/${jobId}/notify`); },
  async getPlacementDrives()             { return req('GET', '/dashboard/college/placement-drives'); },
  async getJobsForCompany(companyName)   { return req('GET', `/dashboard/college/jobs-for-company?companyName=${encodeURIComponent(companyName)}`); },
  async createPlacementDrive(payload)    { return req('POST', '/dashboard/college/placement-drives', payload); },
  async getPlacementDrive(id)            { return req('GET', `/dashboard/college/placement-drives/${id}`); },
  async updatePlacementDrive(id, payload) { return req('PATCH', `/dashboard/college/placement-drives/${id}`, payload); },
  async updatePlacementDriveRegistration(id, candidateId, payload) { return req('PATCH', `/dashboard/college/placement-drives/${id}/registrations/${candidateId}`, payload); },
  async deletePlacementDrive(id)         { return req('DELETE', `/dashboard/college/placement-drives/${id}`); },
  async notifyPlacementDrive(id, payload) { return req('POST', `/dashboard/college/placement-drives/${id}/notify`, payload); },
  async requestCampusDrive(payload)      { return req('POST', '/dashboard/company/drive-requests', payload); },
  async getDriveRequests()               { return req('GET', '/dashboard/college/drive-requests'); },
  async approveDriveRequest(id)          { return req('POST', `/dashboard/college/drive-requests/${id}/approve`); },
  async rejectDriveRequest(id)           { return req('POST', `/dashboard/college/drive-requests/${id}/reject`); },
  // Internal drive approvals (admin approves recruiter-submitted drive requests)
  async getAdminDriveApprovals()         { return req('GET', '/dashboard/admin/drive-approvals'); },
  async approveInternalDriveRequest(id)  { return req('POST', `/dashboard/admin/drive-approvals/${id}/approve`); },
  async rejectInternalDriveRequest(id)   { return req('POST', `/dashboard/admin/drive-approvals/${id}/reject`); },
  // Admin creates a drive and optionally assigns it to a recruiter
  async adminCreateDrive(payload)        { return req('POST', '/dashboard/admin/drives', payload); },
  async getCollegeAssessments()          { return req('GET', '/dashboard/college/assessments'); },
  async getTrainingResources()           { return req('GET', '/dashboard/college/training-resources'); },
  async createTrainingResource(payload)  { return req('POST', '/dashboard/college/training-resources', payload); },
  async deleteTrainingResource(id)       { return req('DELETE', `/dashboard/college/training-resources/${id}`); },
  async notifyTrainingResource(id, payload) { return req('POST', `/dashboard/college/training-resources/${id}/notify`, payload); },
  async getCandidateOpportunities()      { return req('GET', '/dashboard/candidate/opportunities'); },
  async registerForOpportunity(id)       { return req('POST', `/dashboard/candidate/opportunities/${id}/register`); },
  async withdrawFromOpportunity(id)      { return req('DELETE', `/dashboard/candidate/opportunities/${id}/register`); },
  async getCandidateTrainingResources()  { return req('GET', '/dashboard/candidate/training-resources'); },
  async getCandidateSkillRecommendations() { return req('GET', '/dashboard/candidate/skill-recommendations'); },
  async getCollegeSkillGaps()            { return req('GET', '/dashboard/college/skill-gaps'); },
  async getStudentSkillRecommendations(id) { return req('GET', `/dashboard/college/students/${id}/skill-recommendations`); },
  async getDashboardStats(platform)     { return req('GET', `/dashboard/stats${platform ? '?platform=true' : ''}`); },
  async getPipelineHealth()             { return req('GET', '/dashboard/pipeline-health'); },
  async getRecruiterLeaderboard()       { return req('GET', '/dashboard/recruiter-leaderboard'); },
  async getTopSkills()                  { return req('GET', '/dashboard/top-skills'); },
  async getAvailabilityPool()           { return req('GET', '/dashboard/availability-pool'); },
  async getJobsBreakdown()              { return req('GET', '/dashboard/jobs-breakdown'); },
  async getAnalytics(params = {}) {
    return req('GET', `/dashboard/analytics${qs(params)}`);
  },
  async getRecruiterStats()              { return req('GET', '/dashboard/recruiter-stats'); },
  async getHiringFunnel()                { return req('GET', '/dashboard/hiring-funnel'); },
  async getJobPerformance()              { return req('GET', '/dashboard/job-performance'); },
  async getUpcomingInterviews()          { return req('GET', '/dashboard/upcoming-interviews'); },
  async getCandidateStats()              { return req('GET', '/dashboard/candidate-stats'); },
  async getProfileScore()                { return req('GET', '/dashboard/profile-score'); },
  async getCandidatePipeline()           { return req('GET', '/dashboard/candidate-pipeline'); },
  async getAIMatchedJobs(limit = 10000000)      { return req('GET', `/dashboard/ai-matched-jobs?limit=${limit}`); },
  async getCandidateUpcomingInterviews() { return req('GET', '/dashboard/candidate-upcoming-interviews'); },
  async getTrends()                      { return req('GET', '/dashboard/trends'); },
  async getUnregisteredStats()           { return req('GET', '/dashboard/unregistered-stats'); },
  async getSmartAlerts(params = {})      { return req('GET', `/dashboard/smart-alerts${qs(params)}`); },
  async getStageTime()                   { return req('GET', '/dashboard/stage-time'); },
  async getOfferAnalytics()              { return req('GET', '/dashboard/offer-analytics'); },
  async getSourceEffectiveness()         { return req('GET', '/dashboard/source-effectiveness'); },
  async getApplicants(params = {})        { return req('GET', `/dashboard/applicants${qs(params)}`); },
  async getApplicantsSummary(params = {}) { return req('GET', `/dashboard/applicants/summary${qs(params)}`); },
  async getCandidateRecords(params = {}) { return req('GET', `/dashboard/candidate-records${qs(params)}`); },

  // ── Advanced analytics endpoints (Task 3.2) ──────────────────────────────

  /**
   * @param {{ startDate?: string, endDate?: string, jobId?: string }} params
   */
  async getFunnel(params = {}) {
    return req('GET', `/dashboard/funnel${qs(params)}`);
  },

  /**
   * @param {{ startDate?: string, endDate?: string }} params
   */
  async getSourceBreakdown(params = {}) {
    return req('GET', `/dashboard/source-breakdown${qs(params)}`);
  },

  /**
   * @param {{ startDate?: string, endDate?: string }} params
   */
  async getTimeToHire(params = {}) {
    return req('GET', `/dashboard/time-to-hire${qs(params)}`);
  },

  /**
   * @param {{ startDate?: string, endDate?: string }} params
   */
  async getStageVelocity(params = {}) {
    return req('GET', `/dashboard/stage-velocity${qs(params)}`);
  },

  /**
   * @param {{ startDate?: string, endDate?: string }} params
   */
  async getOfferAcceptance(params = {}) {
    return req('GET', `/dashboard/offer-acceptance${qs(params)}`);
  },

  /**
   * @param {{ startDate?: string, endDate?: string }} params
   */
  async getDropoutAnalysis(params = {}) {
    return req('GET', `/dashboard/dropout-analysis${qs(params)}`);
  },

  /**
   * @param {{ startDate?: string, endDate?: string, recruiterId?: string }} params
   */
  async getRecruiterPerformance(params = {}) {
    return req('GET', `/dashboard/recruiter-performance${qs(params)}`);
  },

  /**
   * @param {{ startDate?: string, endDate?: string }} params
   */
  async getSlaCompliance(params = {}) {
    return req('GET', `/dashboard/sla-compliance${qs(params)}`);
  },
  async getUnregisteredCandidates(params = {}) {
    return req('GET', `/dashboard/unregistered-candidates${qs(params)}`);
  },
  async getDiversityReport(params = {}) {
    return req('GET', `/stats/diversity${qs(params)}`);
  },
  async seedDiversityData() {
    return req('POST', '/stats/diversity/seed', {});
  },
  async getPipelineHeatmap(days = 90) {
    return req('GET', `/dashboard/pipeline-heatmap?days=${days}`);
  },
  async getTimeToFill(params = {}) {
    return req('GET', `/dashboard/time-to-fill${qs(params)}`);
  },
  async getCompanyCollegeDrives() {
    return req('GET', '/dashboard/company/college-drives');
  },
  async getCompanyCollegeDrive(id) {
    return req('GET', `/dashboard/company/college-drives/${id}`);
  },
  async updateDriveRegistrationStatus(driveId, candidateId, payload) {
    return req('PATCH', `/dashboard/company/college-drives/${driveId}/registrations/${candidateId}`, payload);
  },
  async getMyDriveRegistrations() {
    return req('GET', '/dashboard/candidate/my-drive-registrations');
  },
};
