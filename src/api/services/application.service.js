import { req } from '../client.js';

export const applicationService = {
  async getApplication(appId) {
    const r = await req('GET', `/applications/${appId}`);
    return r?.data || r;
  },
  // For authenticated candidates — uses the /mine endpoint which auto-links via email
  async getMyApplications() {
    const r = await req('GET', '/applications/mine');
    return Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []);
  },
  async getApplications(opts = {}) {
    const { jobId, candidateId, stage, status, limit = 10000000, page, recruiterId, platform, startDate, endDate, email } = opts;
    const params = new URLSearchParams();
    if (jobId)       params.set('jobId', jobId);
    if (candidateId) params.set('candidateId', candidateId);
    if (stage)       params.set('stage', stage);
    if (status)      params.set('status', status);
    if (limit)       params.set('limit', String(limit));
    if (page)        params.set('page', String(page));
    if (recruiterId) params.set('recruiterId', recruiterId);
    if (platform)    params.set('platform', 'true');
    if (startDate)   params.set('startDate', startDate);
    if (endDate)     params.set('endDate', endDate);
    if (email)       params.set('email', email);
    const qs = params.toString();
    return req('GET', `/applications${qs ? `?${qs}` : ''}`);
  },
  async applyToJob(jobId, candidateId, screeningAnswers, geo) {
    const geoFields = geo ? { geoLat: geo.lat, geoLng: geo.lng, geoAccuracy: geo.accuracy, geoCity: geo.city, geoCountry: geo.country } : {};
    return req('POST', '/applications', { jobId, candidateId, ...(screeningAnswers ? { screeningAnswers } : {}), ...geoFields });
  },
  async applyPublic(jobId, form) {
    return req('POST', '/applications/public', { jobId, ...form }, false);
  },
  async quickApply(jobId, coverLetter = '') {
    return req('POST', '/applications/quick', { jobId, coverLetter });
  },
  async prefillByEmail(email) {
    return req('POST', '/applications/prefill', { email }, false);
  },
  async updateStage(appId, stage, notes = '', extra = {}) {
    return req('PATCH', `/applications/${appId}/stage`, { stage, notes, ...extra });
  },
  async scheduleInterview(appId, details) {
    return req('PATCH', `/applications/${appId}/interview`, details);
  },
  async rescheduleInterview(appId, roundIndex, details) {
    return req('PATCH', `/applications/${appId}/interview/${roundIndex}/reschedule`, details);
  },
  async addApplicationNotes(appId, notes) {
    return req('PATCH', `/applications/${appId}/notes`, { notes });
  },
  async updateAppNotes(appId, notes) { return req('PATCH', `/applications/${appId}/notes`, { notes }); },
  async updateAppTags(appId, tags) { return req('PATCH', `/applications/${appId}/tags`, { tags }); },
  async addFeedback(appId, feedback) { return req('PATCH', `/applications/${appId}/feedback`, feedback); },
  async withdrawApplication(appId, reason) { return req('DELETE', `/applications/${appId}`, reason ? { reason } : undefined); },
  async getApplicationLocations() { return req('GET', '/applications/locations'); },
  async talentMatchAction(candidateId, jobId, action) {
    return req('POST', '/invites/talent-match', { candidateId, jobId, action });
  },
  async parseResume(file) {
    const fd = new FormData();
    fd.append('file', file);
    return req('POST', '/parse-resume', fd);
  },
  async getScorecards(jobId) {
    const r = await req('GET', `/applications/scorecards?jobId=${jobId}`);
    return r?.data || [];
  },
  async getPipelineSmartMatch(jobId, { threshold = 60, limit = 50, weights } = {}) {
    const qs = new URLSearchParams({ threshold, limit });
    if (weights) qs.set('weights', weights);
    return req('GET', `/applications/pipeline-smart-match/${jobId}?${qs.toString()}`);
  },
};
