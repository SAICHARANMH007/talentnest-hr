import { req } from '../client.js';

export const userService = {
  // Presence
  async sendHeartbeat()         { return req('POST', '/presence/heartbeat', {}, false); },
  async getOnlineUsers()        { return req('GET', '/presence/online'); },

  async getProfile()            { return req('GET', '/users/me'); },
  async updateProfile(data)     { return req('PATCH', '/users/me', data); },
  async verifyInvite(token, email) { return req('GET', `/auth/verify-invite?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`, null, false); },
  
  // Invites
  async inviteAdmin(data)       { return req('POST', '/admin/invite-admin', data); },
  async inviteRecruiter(data)   { return req('POST', '/admin/invite-recruiter', data); },
  async inviteCandidate(data)   { return req('POST', '/recruiter/invite-candidate', data); },
  async resendInvite(userId)    { return req('POST', '/admin/resend-invite', { userId }); },
  async revokeInvite(userId)    { return req('DELETE', `/admin/revoke-invite/${userId}`); },
  async getPendingInvites()     { return req('GET', '/admin/pending-invites'); },
  
  // Settings & Org
  async updateSettings(settings){ return req('PATCH', '/users/me/settings', { settings }); },
  async getOrgLogo()            { return req('GET', '/orgs/logo'); },
  async uploadOrgLogo(logoUrl)  { return req('POST', '/orgs/logo/upload', { logoUrl }); },
  async deleteOrgLogo()         { return req('DELETE', '/orgs/logo'); },
  async getOrg(id)              { return req('GET', `/orgs/${id}`); },
  async createOrg(data)         { return req('POST', '/orgs', data); },
  async updateOrg(id, data)     { return req('PATCH', `/orgs/${id}`, data); },
  async deleteOrg(id)           { return req('DELETE', `/orgs/${id}`); },
  async updateOrgPlan(orgId, payload) { return req('PATCH', `/orgs/${orgId}/plan`, payload); },
  
  // Member Management
  async updateMyLoginLocation(geo) { return req('PATCH', '/users/me/location', { lat: geo.lat, lng: geo.lng, city: geo.city || '', country: geo.country || '' }); },
  async getUser(id)             { return req('GET', `/users/${id}`); },
  async updateUser(id, d)       { return req('PATCH', `/users/${id}`, d); },
  async getUsers(params)          {
    const toArr = r => Array.isArray(r) ? r : (Array.isArray(r?.candidates) ? r.candidates : (Array.isArray(r?.data) ? r.data : []));
    if (typeof params === 'string') {
      const url = params === 'candidate'
        ? '/users/candidates?limit=10000000'
        : `/users?role=${params}&limit=10000000`;
      return toArr(await req('GET', url));
    }
    const { role, orgId, limit, page, platform, fullResponse } = params || {};
    const q = new URLSearchParams();
    if (role) q.set('role', role);
    if (orgId) q.set('orgId', orgId);
    if (platform) q.set('platform', 'true');
    if (page) q.set('page', String(page));
    
    // Use provided limit or default based on role, but don't hardcap if limit is explicitly passed
    q.set('limit', String(limit || 10000000));
    
    const res = await req('GET', (role === 'candidate' ? '/users/candidates?' : '/users?') + q.toString());
    if (fullResponse) return res;
    return toArr(res);
  },
  async getUsersList(params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') q.set(k, v); });
    return req('GET', `/users?${q.toString()}`);
  },
  async getUserCount(role)      { return req('GET', `/users/count${role ? `?role=${role}` : ''}`); },
  async createUser(data)        { return req('POST', '/users', data); },
  async deleteUser(id)          { return req('DELETE', `/users/${id}`); },
  async resendUserInvite(id)    { return req('POST', `/users/${id}/resend-invite`, {}); },
  
  // Bulk & Advanced
  async bulkImportCandidates(candidates) { return req('POST', '/users/bulk-import', { candidates }); },
  async bulkUpdateTA(body)              { return req('PATCH', '/users/bulk-ta', body); },
  async markReachOut(id, note)          { return req('PATCH', `/users/${id}/reach-out`, { note }); },
  async assignCandidate(id, recruiterId) { return req('PATCH', `/users/${id}/assign`, { recruiterId }); },
  async mergeUsers(primaryId, duplicateId) { return req('POST', '/users/merge', { primaryId, duplicateId }); },
  async adminResetPassword(userId, newPassword) { return req('PATCH', `/users/${userId}/change-password`, { newPassword }); },

  // Candidate-model (separate from User model) — used by pipeline/application populate
  async getCandidate(id) {
    const r = await req('GET', `/candidates/${id}`);
    return r?.data || r;
  },
  async updateCandidate(id, data) {
    const r = await req('PATCH', `/candidates/${id}`, data);
    return r?.data || r;
  },

  // ── BGV Documents ──────────────────────────────────────────────────────────
  async getBgvDocuments()              { return req('GET', '/bgv'); },
  async getBgvDocumentsForUser(userId) { return req('GET', `/bgv/user/${userId}`); },
  async getBgvDocumentFile(docId)      { return req('GET', `/bgv/${docId}/file`); },
  async uploadBgvDocument(formData)    { return req('POST', '/bgv', formData); },
  async verifyBgvDocument(docId, body) { return req('PATCH', `/bgv/${docId}/verify`, body); },
  async deleteBgvDocument(docId)       { return req('DELETE', `/bgv/${docId}`); },
  async getAllBgvSubmissions(qs)        { return req('GET', `/bgv/admin/all${qs ? `?${qs}` : ''}`); },
};
