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
  async getUser(id)             { return req('GET', `/users/${id}`); },
  async updateUser(id, d)       { return req('PATCH', `/users/${id}`, d); },
  async getUsers(params)          {
    const toArr = r => Array.isArray(r) ? r : (Array.isArray(r?.candidates) ? r.candidates : (Array.isArray(r?.data) ? r.data : []));
    if (typeof params === 'string') {
      // /users/candidates has a built-in 500 default; other roles default to 20 so we bump them
      const url = params === 'candidate'
        ? '/users/candidates?limit=500'
        : `/users?role=${params}&limit=200`;
      return toArr(await req('GET', url));
    }
    const { role, orgId, limit, platform } = params || {};
    const q = new URLSearchParams();
    if (role) q.set('role', role);
    if (orgId) q.set('orgId', orgId);
    if (platform) q.set('platform', 'true');
    q.set('limit', String(limit || (role === 'candidate' ? 500 : 200)));
    return toArr(await req('GET', `/users?${q.toString()}`));
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
};
