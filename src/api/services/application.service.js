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
  async getApplications({ jobId, candidateId, stage, limit, recruiterId, platform } = {}) {
    const params = new URLSearchParams();
    if (jobId)       params.set('jobId', jobId);
    if (candidateId) params.set('candidateId', candidateId);
    if (stage)       params.set('stage', stage);
    if (limit)       params.set('limit', limit);
    if (recruiterId) params.set('recruiterId', recruiterId);
    if (platform)    params.set('platform', 'true');
    const qs = params.toString();
    return req('GET', `/applications${qs ? `?${qs}` : ''}`);
  },
  async applyToJob(jobId, candidateId, screeningAnswers) {
    return req('POST', '/applications', { jobId, candidateId, ...(screeningAnswers ? { screeningAnswers } : {}) });
  },
  async applyPublic(jobId, form) {
    return req('POST', '/applications/public', { jobId, ...form }, false);
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
  async parseResume(file) {
    const fd = new FormData();
    fd.append('file', file);
    return req('POST', '/parse-resume', fd);
  }
};
