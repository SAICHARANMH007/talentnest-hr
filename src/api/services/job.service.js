import { req } from '../client.js';

export const jobService = {
  async getJobs(recruiterIdOrOpts) {
    // Accepts either a plain recruiterId string (legacy) or an options object
    if (!recruiterIdOrOpts || typeof recruiterIdOrOpts === 'string') {
      const rid = recruiterIdOrOpts;
      return req('GET', `/jobs?limit=10000000${rid ? `&recruiterId=${rid}` : ''}`);
    }
    const { recruiterId, limit, page, status, search, platform } = recruiterIdOrOpts;
    const p = new URLSearchParams();
    if (recruiterId) p.set('recruiterId', recruiterId);
    p.set('limit', String(limit || 10000000));
    if (page)        p.set('page',   String(page));
    if (status)      p.set('status', status);
    if (search)      p.set('search', search);
    if (platform)    p.set('platform', 'true');
    return req('GET', `/jobs?${p.toString()}`);
  },
  async getJob(id)                    { return req('GET', `/jobs/${id}`); },
  async createJob(data)               { return req('POST', '/jobs', data); },
  async deleteJob(id)                 { return req('DELETE', `/jobs/${id}`); },
  async patchJob(id, d)               { return req('PATCH', `/jobs/${id}`, d); },
  async getPublicJobs(qs = '')        { return req('GET', `/jobs/public${qs || ''}`, null, false); },
  async getPublicJobById(id)          { return req('GET', `/jobs/public/single/${id}`, null, false); },
  async getJobCandidates(jobId)       { return req('GET', `/jobs/${jobId}/candidates`); },
  async assignRecruiterToJob(jobId, recruiterId) { return req('POST', `/jobs/${jobId}/assign`, { recruiterId }); },
  async assignCandidatesToJob(jobId, candidateIds) { return req('POST', `/jobs/${jobId}/assign-candidates`, { candidateIds }); },
  async getPendingJobs()              { return req('GET', '/jobs/pending'); },
  async getPendingApprovalJobs()      { return req('GET', '/jobs/pending-approval'); },
  async approveJob(id, action, reason) { return req('PATCH', `/jobs/${id}/approve`, { action, ...(reason ? { reason } : {}) }); },
  async approveJobNew(id)             { return req('PATCH', `/jobs/${id}/approve`, {}); },
  async rejectJob(id, note)           { return req('PATCH', `/jobs/${id}/reject`, { note: note || '' }); },
  // Career listing (public org career page)
  async getOrgPublicJobs(orgSlug)          { return req('GET', `/jobs/public/org/${orgSlug}`, null, false); },
  async updateCareerListing(publish, unpublish, orgId) { return req('PATCH', '/jobs/career-listing', { publish: publish || [], unpublish: unpublish || [], orgId: orgId || undefined }); },

  // AI Matching (computed via Gemini logic - maintained for compatibility)
  async getMatchedJobs(candidateId) {
    const [user, res] = await Promise.all([
      req('GET', `/users/${candidateId}`),
      req('GET', '/jobs/public', null, false),
    ]);
    const jobsList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
    const cs = Array.isArray(user.skills) ? user.skills.map(s => s.trim().toLowerCase()) : [];
    return jobsList
      .map(j => {
        const js = Array.isArray(j.skills) ? j.skills.map(s => s.trim().toLowerCase()) : [];
        const ov = cs.filter(s => js.includes(s)).length;
        return {
          ...j,
          jobId: (j._id || j.id || '').toString() || undefined,
          matchScore: Math.min(99, 50 + ov * 14 + Math.floor(Math.random() * 8))
        };
      })
      .filter(j => j.jobId)
      .sort((a, b) => b.matchScore - a.matchScore);
  }
};
