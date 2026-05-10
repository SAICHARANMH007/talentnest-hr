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
  async getApplications({ jobId, candidateId, stage, limit = 10000000, recruiterId, platform, startDate, endDate, email } = {}) {
    const params = new URLSearchParams();
    if (jobId)       params.set('jobId', jobId);
    if (candidateId) params.set('candidateId', candidateId);
    if (stage)       params.set('stage', stage);
    if (limit)       params.set('limit', limit);
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
  async prefillByEmail(email) {
    return req('POST', '/applications/prefill', { email }, false);
  },
  async updateStage(appId, stage, notes = '', extra = {}) {
    return req('PATCH', `/applications/${appId}/stage`, { stage, notes, ...extra });
  },
  async scheduleInterview(appId, details) {
    return req('PATCH', `/applications/${appId}/interview`, details);
  },
  async addApplicationNotes(appId, notes) {
    return req('PATCH', `/applications/${appId}/notes`, { notes });
  },
  async updateAppNotes(appId, notes) { return req('PATCH', `/applications/${appId}/notes`, { notes }); },
  async updateAppTags(appId, tags) { return req('PATCH', `/applications/${appId}/tags`, { tags }); },
  async addFeedback(appId, feedback) { return req('PATCH', `/applications/${appId}/feedback`, feedback); },
  async withdrawApplication(appId) { return req('DELETE', `/applications/${appId}`); },
  async getApplicationLocations() { return req('GET', '/applications/locations'); },
  async talentMatchAction(candidateId, jobId, action) {
    return req('POST', '/invites/talent-match', { candidateId, jobId, action });
  },
  async parseResume(file) {
    const fd = new FormData();
    fd.append('file', file);
    return req('POST', '/parse-resume', fd);
  }
};
