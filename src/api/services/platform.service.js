import { req, downloadBlob, uploadFormData } from '../client.js';

export const platformService = {
  // Email
  async sendEmail(to, subject, body)     { return req('POST', '/email/send', { to, subject, body }); },
  async testSmtp(host, port, user, pass, provider, apiKey) {
    return req('POST', '/email/test-smtp', { host, port, user, pass, provider, apiKey });
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
  async getOrgSettings(id)               { return req('GET', `/orgs/${id}`); },
  async updateOrgSettings(id, data)      { return req('PATCH', `/orgs/${id}`, data); },
  
  // Notifications
  async getNotifications()               { return req('GET', '/notifications'); },
  async markAllRead()                    { return req('PATCH', '/notifications/read-all', {}); },
  async markRead(id)                     { return req('PATCH', `/notifications/${id}/read`, {}); },
  async clearAllNotifications()          { return req('DELETE', '/notifications'); },

  
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
  async getAssessment(id)                { return req('GET', `/assessments/${id}`); },
  async getAssessmentForJob(jobId)       { return req('GET', `/assessments/job/${jobId}`); },
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

  // Candidate requests
  async getCandidateRequests(qs)        { return req('GET', `/candidate-requests${qs ? `?${qs}` : ''}`); },
  async createCandidateRequest(data)    { return req('POST', '/candidate-requests', data); },
  async updateCandidateRequest(id, data){ return req('PATCH', `/candidate-requests/${id}`, data); },
  async cancelCandidateRequest(id)      { return req('DELETE', `/candidate-requests/${id}`); },

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

  // Bulk WhatsApp outreach (legacy endpoint)
  async bulkWhatsApp(data)              { return req('POST', '/users/bulk-whatsapp', data); },

  // WhatsApp v2 — Twilio two-way bot
  async sendBulkWhatsApp(recipients, messageTemplate) {
    return req('POST', '/whatsapp/bulk-send', { recipients, messageTemplate });
  },
  async getWhatsAppLogs(page = 1, limit = 50) {
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

  // Workflow Automation
  async getWorkflowRules()                   { return req('GET',    '/admin/workflow-rules'); },
  async createWorkflowRule(data)             { return req('POST',   '/admin/workflow-rules', data); },
  async updateWorkflowRule(id, data)         { return req('PATCH',  `/admin/workflow-rules/${id}`, data); },
  async deleteWorkflowRule(id)               { return req('DELETE', `/admin/workflow-rules/${id}`); },
  async testWorkflowRule(id, eventData)      { return req('POST',   `/admin/workflow-rules/${id}/test`, { eventData }); },

  // Security — 2FA + Sessions
  async toggle2FA()                          { return req('POST',   '/auth/2fa/toggle', {}); },
  async getSessions()                        { return req('GET',    '/auth/sessions'); },
  async terminateSession(id)                 { return req('DELETE', `/auth/sessions/${id}`); },
  async terminateOtherSessions()             { return req('DELETE', '/auth/sessions/others'); },

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
  async getMyPreBoarding()                   { return req('GET',    '/preboarding/mine'); },
  async confirmPreBoardingJoining(id)        { return req('PATCH',  `/preboarding/${id}/candidate-confirm`, {}); },
  async updatePreBoarding(id, data)          { return req('PATCH',  `/preboarding/${id}`, data); },
  async addPreBoardingTask(id, data)         { return req('POST',   `/preboarding/${id}/tasks`, data); },
  async updatePreBoardingTask(id, taskId, data) { return req('PATCH', `/preboarding/${id}/tasks/${taskId}`, data); },
  async sendPreBoardingWelcomeKit(id)        { return req('POST',   `/preboarding/${id}/send-welcome-kit`, {}); },

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
};
