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
};
