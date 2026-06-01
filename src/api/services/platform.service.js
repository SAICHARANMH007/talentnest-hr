import { req, downloadBlob, uploadFormData } from '../client.js';

export const platformService = {
  // Email
  async sendEmail(to, subject, body, cc) { return req('POST', '/email/send', { to, subject, body, cc }); },
  async testSmtp(host, port, user, pass, provider, apiKey, fromName) {
    return req('POST', '/email/test-smtp', { host, port, user, pass, provider, apiKey, fromName });
  },
  async getEmailLogs(qs)                 { return req('GET', `/email/logs${qs ? `?${qs}` : ''}`); },
  async resendEmail(logId)               { return req('POST', `/email/logs/${logId}/resend`, {}); },
  
  // Platform config (super_admin)
  async getPlatformConfig()              { return req('GET',   '/platform/config'); },
  async savePlatformSecurity(data)       { return req('PATCH', '/platform/security', data); },
  async savePlatformFlags(flags)         { return req('PATCH', '/platform/flags', { flags }); },
  
  // Billing
  async getBillingUsage()                { return req('GET', '/billing/usage'); },
  async getBillingPlans()                { return req('GET', '/billing/plans'); },
  async createBillingOrder(planName)      { return req('POST', '/billing/create-order', { planName }); },
  async verifyBillingPayment(data)       { return req('POST', '/billing/verify-payment', data); },
  async getBillingInvoices()             { return req('GET', '/billing/invoices'); },

  // Org Settings
  async getMyOrg()                       { return req('GET', '/orgs/my-org'); },
  async getOrgSettings(id)               { return req('GET', `/orgs/${id}`); },
  async updateOrgSettings(id, data)      { return req('PATCH', `/orgs/${id}`, data); },
  
  // Notifications
  async getNotifications()               { return req('GET', '/notifications'); },
  async markAllRead()                    { return req('PATCH', '/notifications/read-all', {}); },
  async markRead(id)                     { return req('PATCH', `/notifications/${id}/read`, {}); },
  async clearAllNotifications()          { return req('DELETE', '/notifications'); },
  async generatePlatformNotifications()  { return req('POST',  '/notifications/platform-summary', {}); },

  
  // Contact Leads
  async getLeads(status)                 { return req('GET', `/leads${status ? `?status=${status}` : ''}`); },
  async updateLead(id, data)             { return req('PATCH', `/leads/${id}`, data); },
  async submitLead(data)                 { return req('POST', '/leads', data, false); },
  
  // Invites (Candidate-Job specific)
  async sendInvites(candidateIds, jobId, message) { return req('POST', '/invites', { candidateIds, jobId, message }); },
  async getInvites(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return req('GET', `/invites${qs ? `?${qs}` : ''}`);
  },
  async getMyInvites()                   { return req('GET', '/invites/mine'); },
  async getInviteByToken(token)          { return req('GET',   `/invites/${token}`, null, false); },
  async respondToInvite(token, response) { return req('PATCH', `/invites/${token}/respond`, { response }, false); },
  async deleteInvite(id)                 { return req('DELETE', `/invites/${id}`); },
  async resendInvite(id)                 { return req('POST', `/invites/${id}/resend`, {}); },
  async updateInviteStatus(id, status)   { return req('PATCH', `/invites/${id}/status`, { status }); },
  async logJobShare(data)                { return req('POST', '/invites/log-share', data); },
  
  // Assessments
  async listAssessments(qs)              { return req('GET', `/assessments${qs ? `?${qs}` : ''}`); },
  async getAssessment(id)                { return req('GET', `/assessments/${id}`); },
  async getAssessmentForJob(jobId)       { return req('GET', `/assessments/job/${jobId}`); },
  async getPublicAssessmentForJob(jobId) { return req('GET', `/assessments/public/job/${jobId}`, null, false); },
  async createAssessment(data)           { return req('POST', '/assessments', data); },
  async updateAssessment(id, data)       { return req('PATCH', `/assessments/${id}`, data); },
  async deleteAssessment(id)             { return req('DELETE', `/assessments/${id}`); },
  async startAssessment(id)              { return req('POST', `/assessments/${id}/start`, {}); },
  async submitAssessment(id, answers, autoSubmitted = false, violations = []) {
    return req('POST', `/assessments/${id}/submit`, { answers, autoSubmitted, violations });
  },
  async getAssessmentSubmissions(assessmentId)  { return req('GET', `/assessments/${assessmentId}/submissions`); },
  async getAssessmentSubmission(assessmentId, subId) { return req('GET', `/assessments/${assessmentId}/submissions/${subId}`); },
  async reviewSubmission(assessmentId, subId, data) { return req('PATCH', `/assessments/${assessmentId}/submissions/${subId}/review`, data); },
  async getMyAssessments()               { return req('GET', '/assessments/candidate/my'); },
  
  // Offers
  async getMyOffers()                 { return req('GET', '/offers/mine'); },
  async getOfferByApplication(appId)  { return req('GET', `/offers/application/${appId}`); },
  async getOffer(id)                  { return req('GET', `/offers/${id}`); },
  async updateOffer(id, data)         { return req('PATCH', `/offers/${id}`, data); },
  async sendOffer(id)                 { return req('POST', `/offers/${id}/send`, {}); },
  async signOffer(id, typedName)      { return req('POST', `/offers/${id}/sign`, { typedName }); },
  async downloadOfferPdf(id) {
    const blob = await downloadBlob(`/offers/${id}/pdf`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'offer-letter.pdf';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  },

  // Offer letter extended methods
  async downloadOfferPreview(id)            { return downloadBlob(`/offers/${id}/pdf/preview`); },
  async generateOfferShareLink(id)          { return req('POST',  `/offers/${id}/generate-share-link`, {}); },
  async createStandaloneOffer(data)         { return req('POST',  '/offers/standalone', data); },
  async requestOfferApproval(id, approvers) { const r = await req('POST', `/offers/${id}/request-approval`, { approvers }); return r?.data || r; },
  async getOfferApprovalStatus(id)          { const r = await req('GET',  `/offers/${id}/approval-status`); return r?.data || r; },
  async decideOfferApproval(id, token, action, comment) { const r = await req('POST', `/offers/${id}/decide-approval`, { token, action, comment }); return r?.data || r; },
  async getPreBoardingDocStatus()           { return req('GET',   '/preboarding/doc-status'); },

  // Interview scorecard
  async submitScorecard(appId, roundIndex, data) {
    return req('POST', `/applications/${appId}/interview/${roundIndex}/scorecard`, data);
  },

  // Stats
  async getPublicStats()                 { return req('GET', '/stats/public', null, false); },
  
  // Backups (super_admin)
  async downloadBackup() {
    const blob = await downloadBlob('/platform/backup');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `talentnest-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  },

  // Audit logs (super_admin)
  async getAuditLogs(qs)               { return req('GET', `/platform/audit-logs${qs ? `?${qs}` : ''}`); },
  async getPlatformRevenue()           { return req('GET', '/platform/revenue'); },
  async getOrgHealth()                 { return req('GET', '/platform/org-health'); },
  async getSystemHealth()              { const r = await req('GET', '/platform/system-health'); return r?.data || r; },
  async broadcastAnnouncement(data)    { return req('POST', '/platform/broadcast', data); },

  // Candidate requests
  async getCandidateRequests(qs)              { return req('GET', `/candidate-requests${qs ? `?${qs}` : ''}`); },
  async getCandidateRequest(id)               { return req('GET', `/candidate-requests/${id}`); },
  async createCandidateRequest(data)          { return req('POST', '/candidate-requests', data); },
  async updateCandidateRequest(id, data)      { return req('PATCH', `/candidate-requests/${id}`, data); },
  async cancelCandidateRequest(id)            { return req('DELETE', `/candidate-requests/${id}`); },
  async attachCandidatesToRequest(id, data)   { return req('POST', `/candidate-requests/${id}/attach-candidates`, data); },
  async getSuggestedCandidatesForRequest(id)  { return req('GET', `/candidate-requests/${id}/suggested-candidates`); },
  async searchCandidatesAdvanced(qs)          { return req('GET', `/candidates/search${qs ? `?${qs}` : ''}`); },
  async getJobMatchingCandidates(jobId)       { return req('GET', `/jobs/${jobId}/matching-candidates`); },

  // Clients (agency)
  async getClients(qs)                  { return req('GET', `/clients${qs ? `?${qs}` : ''}`); },
  async createClient(data)              { return req('POST', '/clients', data); },
  async updateClient(id, data)          { return req('PATCH', `/clients/${id}`, data); },
  async deleteClient(id)                { return req('DELETE', `/clients/${id}`); },

  // Raw Data (super_admin)
  async getOrgs()                       { return req('GET',   '/orgs'); },
  async getRawData(model, id)           { return req('GET',   `/platform/raw/${model}/${id}`); },
  async updateRawData(model, id, data)  { return req('PATCH', `/platform/raw/${model}/${id}`, data); },

  // Impersonation (super_admin)
  async impersonate(userId)             { return req('POST', '/auth/impersonate', { targetUserId: userId }); },
  async stopImpersonate()               { return req('POST', '/auth/stop-impersonate', {}); },

  // Bulk WhatsApp outreach (legacy endpoint)
  async bulkWhatsApp(data)              { return req('POST', '/users/bulk-whatsapp', data); },

  // WhatsApp v2 — Twilio two-way bot
  async sendBulkWhatsApp(recipients, messageTemplate) {
    return req('POST', '/whatsapp/bulk-send', { recipients, messageTemplate });
  },
  async getWhatsAppLogs(page = 1, limit = 10000000) {
    return req('GET', `/whatsapp/logs?page=${page}&limit=${limit}`);
  },
  async createWhatsAppSession(data)     { return req('POST', '/whatsapp/create-session', data); },

  // Duplicate detection
  async checkDuplicate(data)            { return req('POST', '/users/check-duplicate', data); },

  // Talent pool
  async getTalentPool()                 { return req('GET', '/applications/talent-pool'); },
  async parkApplication(appId)          { return req('PATCH', `/applications/${appId}/park`); },

  // NPS
  async getNpsStats()                        { return req('GET', '/nps/stats'); },

  // Candidate Documents
  async getCandidateDocuments(candidateId)   { return req('GET', `/candidates/${candidateId}/documents`); },
  async uploadCandidateDocument(candidateId, formData) {
    return uploadFormData('POST', `/candidates/${candidateId}/documents`, formData);
  },
  async verifyDocument(candidateId, docId, data) { return req('PATCH', `/candidates/${candidateId}/documents/${docId}`, data); },

  // Candidate Self Resume Upload
  async uploadCandidateResume(formData) {
    return uploadFormData('POST', '/candidates/upload-my-resume', formData);
  },

  // Candidate Video Resume
  async uploadVideoResume(candidateId, formData) {
    return uploadFormData('POST', `/candidates/${candidateId}/video`, formData);
  },

  // Workflow Automation — org custom rules
  async getWorkflowRules()                   { return req('GET',    '/admin/workflow-rules'); },
  async createWorkflowRule(data)             { return req('POST',   '/admin/workflow-rules', data); },
  async updateWorkflowRule(id, data)         { return req('PATCH',  `/admin/workflow-rules/${id}`, data); },
  async deleteWorkflowRule(id)               { return req('DELETE', `/admin/workflow-rules/${id}`); },
  async testWorkflowRule(id, eventData)      { return req('POST',   `/admin/workflow-rules/${id}/test`, { eventData }); },
  // Workflow Automation — system templates (super_admin)
  async getSystemWorkflowRules()             { return req('GET',    '/admin/workflow-rules/system'); },
  async createSystemWorkflowRule(data)       { return req('POST',   '/admin/workflow-rules/system', data); },
  async updateSystemWorkflowRule(id, data)   { return req('PATCH',  `/admin/workflow-rules/system/${id}`, data); },
  async deleteSystemWorkflowRule(id)         { return req('DELETE', `/admin/workflow-rules/system/${id}`); },
  // Workflow Automation — activate/deactivate system templates (admin)
  async activateSystemAutomation(systemKey)  { return req('POST',   `/admin/workflow-rules/activate/${systemKey}`); },
  async deactivateSystemAutomation(systemKey){ return req('DELETE',  `/admin/workflow-rules/deactivate/${systemKey}`); },

  // Security — 2FA + Sessions
  async toggle2FA()                          { return req('POST',   '/auth/2fa/toggle', {}); },
  async getSessions()                        { return req('GET',    '/auth/sessions'); },
  async terminateSession(id)                 { return req('DELETE', `/auth/sessions/${id}`); },
  async terminateOtherSessions()             { return req('DELETE', '/auth/sessions/others'); },
  async terminateAllSessions()               { return req('DELETE', '/auth/sessions/all'); },
  async deleteMyAccount()                    { return req('DELETE', '/auth/account'); },

  // Custom Fields
  async getCustomFields(entity)              { return req('GET',    `/custom-fields${entity ? `?entity=${entity}` : ''}`); },
  async createCustomField(data)              { return req('POST',   '/custom-fields', data); },
  async updateCustomField(id, data)          { return req('PATCH',  `/custom-fields/${id}`, data); },
  async deleteCustomField(id)                { return req('DELETE', `/custom-fields/${id}`); },
  async getCustomFieldValues(entity, recordId) { return req('GET',  `/custom-fields/values/${entity}/${recordId}`); },
  async saveCustomFieldValues(entity, recordId, values) { return req('PUT', `/custom-fields/values/${entity}/${recordId}`, { values }); },

  // Pipeline Templates
  async getPipelineTemplates()               { return req('GET',    '/pipeline-templates'); },
  async savePipelineTemplate(name, stages)   { return req('POST',   '/pipeline-templates', { name, stages }); },
  async applyPipelineTemplate(name)          { return req('PATCH',  `/pipeline-templates/${encodeURIComponent(name)}/apply`, {}); },
  async deletePipelineTemplate(name)         { return req('DELETE', `/pipeline-templates/${encodeURIComponent(name)}`); },

  // Pre-boarding
  async getPreBoardings(qs)                  { return req('GET',    `/preboarding${qs ? `?${qs}` : ''}`); },
  async getHiredPending()                    { return req('GET',    '/preboarding/hired-pending'); },
  async startPreBoarding(applicationId)      { return req('POST',   '/preboarding/start', { applicationId }); },
  async selfStartPreBoarding()               { return req('POST',   '/preboarding/self-start', {}); },
  async startPreBoardingWithHired(applicationId) { return req('POST', '/preboarding/start-with-hired', { applicationId }); },
  async getMyPreBoarding()                   { return req('GET',    '/preboarding/mine'); },
  async confirmPreBoardingJoining(id)        { return req('PATCH',  `/preboarding/${id}/candidate-confirm`, {}); },
  async updatePreBoarding(id, data)          { return req('PATCH',  `/preboarding/${id}`, data); },
  async updatePreBoardingByApplication(appId, data) { return req('PATCH', `/preboarding/by-application/${appId}`, data); },
  async addPreBoardingTask(id, data)         { return req('POST',   `/preboarding/${id}/tasks`, data); },
  async updatePreBoardingTask(id, taskId, data) { return req('PATCH', `/preboarding/${id}/tasks/${taskId}`, data); },
  async deletePreBoardingDocument(id, taskId)   { return req('DELETE', `/preboarding/${id}/tasks/${taskId}/document`); },
  async sendPreBoardingWelcomeKit(id)        { return req('POST',   `/preboarding/${id}/send-welcome-kit`, {}); },
  async uploadPreBoardingDocument(id, taskId, file) {
    // Convert file to base64 FormData approach — use FileReader to get base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // Send as multipart form via fetch directly (req() doesn't support FormData)
          const { getToken } = await import('../client.js');
          const { API_BASE_URL } = await import('../config.js');
          const form = new FormData();
          form.append('file', file, file.name);
          const res = await fetch(`${API_BASE_URL}/preboarding/${id}/tasks/${taskId}/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${getToken()}`, 'X-Requested-With': 'TalentNest' },
            body: form,
          });
          const json = await res.json();
          if (!res.ok) reject(new Error(json.error || 'Upload failed'));
          else resolve(json);
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsArrayBuffer(file);
    });
  },
  async verifyPreBoardingDocument(id, taskId, action, notes) {
    return req('PATCH', `/preboarding/${id}/tasks/${taskId}/verify`, { action, notes });
  },

  // Job Alerts
  async getJobAlerts()                       { return req('GET',    '/job-alerts'); },
  async createJobAlert(data)                 { return req('POST',   '/job-alerts', data); },
  async updateJobAlert(id, data)             { return req('PATCH',  `/job-alerts/${id}`, data); },
  async deleteJobAlert(id)                   { return req('DELETE', `/job-alerts/${id}`); },

  // ── Org Customizations (all tabs except Custom Fields) ───────────────────────
  async getCustomizations(orgId)             { return req('GET',    `/customizations${orgId ? `?orgId=${orgId}` : ''}`); },
  async updateCustomizationsSingleton(data, orgId) { return req('PATCH', `/customizations${orgId ? `?orgId=${orgId}` : ''}`, data); },
  async addCustomizationItem(section, item, orgId) { return req('POST',  `/customizations/${section}${orgId ? `?orgId=${orgId}` : ''}`, item); },
  async updateCustomizationItem(section, id, data, orgId) { return req('PATCH', `/customizations/${section}/${id}${orgId ? `?orgId=${orgId}` : ''}`, data); },
  async deleteCustomizationItem(section, id, orgId)       { return req('DELETE',`/customizations/${section}/${id}${orgId ? `?orgId=${orgId}` : ''}`); },
  async replaceCustomizationSection(section, items, orgId){ return req('PUT',   `/customizations/${section}${orgId ? `?orgId=${orgId}` : ''}`, { items }); },

  // ── Presence & Messaging ─────────────────────────────────────────────────────
  async presenceHeartbeat()                    { return req('POST',   '/presence/heartbeat', {}); },
  async getOnlineUsers()                       { return req('GET',    '/presence/online'); },
  async sendMessage(data)                      { return req('POST',   '/messages', data); },
  async getMessageInbox()                      { return req('GET',    '/messages/inbox'); },
  async getUnreadMessageCount()                { return req('GET',    '/messages/unread-count'); },
  async getMessageContacts()                   { return req('GET',    '/messages/contacts'); },
  async getMessageThread(userId)               { return req('GET',    `/messages/thread/${userId}`); },

  // Distribution tracking
  async getJobDistribution(jobId)       { return req('GET',   `/distribution/job/${jobId}`); },
  async getDistributionSummary()        { return req('GET',   '/distribution/summary'); },
  async retryDistribution(jobId, plat)  { return req('POST',  `/distribution/retry/${jobId}/${plat}`, {}); },
  async getEmployerSettings(tid)        { return req('GET',   `/distribution/employer-settings/${tid}`); },
  async saveEmployerSettings(tid, data) { return req('PATCH', `/distribution/employer-settings/${tid}`, data); },
  async runDeduplication()               { return req('POST',  '/admin/deduplicate-jobs', {}); },

  // ── Video Job Description ─────────────────────────────────────────────────────
  async uploadJobVideoJd(jobId, formData) {
    const r = await uploadFormData('POST', `/jobs/${jobId}/video-jd`, formData);
    return r?.data || r;
  },
  async deleteJobVideoJd(jobId) { return req('DELETE', `/jobs/${jobId}/video-jd`); },

  // ── Referral Portal ───────────────────────────────────────────────────────────
  async getReferrals()                   { const r = await req('GET', '/referrals'); return r?.data || r; },
  async generateReferralLink(data)       { const r = await req('POST', '/referrals/generate', data); return r?.data || r; },
  async getReferralStats()               { return req('GET', '/referrals/stats'); },
  async markReferralHired(id)            { return req('PATCH', `/referrals/${id}/mark-hired`); },
  async payReferralReward(id)            { return req('PATCH', `/referrals/${id}/pay-reward`); },

  // ── Email Sequences ───────────────────────────────────────────────────────────
  async getEmailSequences()                  { const r = await req('GET', '/email-sequences'); return r?.sequences || []; },
  async createEmailSequence(data)            { const r = await req('POST', '/email-sequences', data); return r?.sequence || r; },
  async updateEmailSequence(id, data)        { const r = await req('PATCH', `/email-sequences/${id}`, data); return r?.sequence || r; },
  async deleteEmailSequence(id)              { return req('DELETE', `/email-sequences/${id}`); },
  async enrollInSequence(seqId, candidateId) { return req('POST', `/email-sequences/${seqId}/enroll`, { candidateId }); },
  async getSequenceEnrollments(seqId)        { const r = await req('GET', `/email-sequences/${seqId}/enrollments`); return r?.enrollments || []; },

  // ── Saved Search Templates ────────────────────────────────────────────────────
  async getSavedSearches(context)            { const r = await req('GET', `/saved-searches${context ? `?context=${context}` : ''}`); return r?.searches || []; },
  async saveSearch(name, context, filters)   { const r = await req('POST', '/saved-searches', { name, context, filters }); return r?.search || r; },
  async updateSavedSearch(id, data)          { const r = await req('PATCH', `/saved-searches/${id}`, data); return r?.search || r; },
  async deleteSavedSearch(id)                { return req('DELETE', `/saved-searches/${id}`); },

  // ── Onboarding Templates ─────────────────────────────────────────────────────
  async getOnboardingTemplates()                       { const r = await req('GET', '/onboarding-templates'); return r?.templates || []; },
  async createOnboardingTemplate(data)                 { const r = await req('POST', '/onboarding-templates', data); return r?.template || r; },
  async updateOnboardingTemplate(id, data)             { const r = await req('PATCH', `/onboarding-templates/${id}`, data); return r?.template || r; },
  async deleteOnboardingTemplate(id)                   { return req('DELETE', `/onboarding-templates/${id}`); },
  async applyOnboardingTemplate(templateId, pbId)      { return req('POST', `/onboarding-templates/${templateId}/apply/${pbId}`, {}); },

  // ── Talent Pool ───────────────────────────────────────────────────────────────
  async getTalentPools()                         { const r = await req('GET', '/talent-pool'); return r?.pools || []; },
  async createTalentPool(data)                   { const r = await req('POST', '/talent-pool', data); return r?.pool || r; },
  async getTalentPool(id)                        { const r = await req('GET', `/talent-pool/${id}`); return r?.pool || r; },
  async updateTalentPool(id, data)               { const r = await req('PATCH', `/talent-pool/${id}`, data); return r?.pool || r; },
  async deleteTalentPool(id)                     { return req('DELETE', `/talent-pool/${id}`); },
  async addTalentPoolMember(poolId, data)        { return req('POST', `/talent-pool/${poolId}/members`, data); },
  async removeTalentPoolMember(poolId, candId)   { return req('DELETE', `/talent-pool/${poolId}/members/${candId}`); },
  async updateTalentPoolMemberNotes(poolId, candId, notes) {
    return req('PATCH', `/talent-pool/${poolId}/members/${candId}`, { notes });
  },
};
