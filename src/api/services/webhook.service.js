import { req } from '../client.js';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.talentnesthr.com/api';

export const webhookService = {
  async getWebhooks()                  { const r = await req('GET', '/webhooks'); return r?.data || r; },
  async createWebhook(data)            { const r = await req('POST', '/webhooks', data); return r?.data || r; },
  async updateWebhook(id, data)        { const r = await req('PUT', `/webhooks/${id}`, data); return r?.data || r; },
  async deleteWebhook(id)              { return req('DELETE', `/webhooks/${id}`); },
  async testWebhook(id)                { const r = await req('POST', `/webhooks/${id}/test`); return r?.data || r; },
  async getWebhookEvents()             { const r = await req('GET', '/webhooks/events'); return r?.data || r; },

  // Company reviews (public + admin)
  async getPublicReviews(orgSlug)      { const r = await fetch(`${API_BASE}/company-reviews/public/${orgSlug}`).then(x => x.json()); return r; },
  async submitReview(orgSlug, data)    {
    const r = await fetch(`${API_BASE}/company-reviews/public/${orgSlug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'TalentNest' },
      body: JSON.stringify(data),
    }).then(x => x.json());
    return r;
  },
  async getMyOrgReviews()              { return req('GET', '/company-reviews/my-org'); },
  async submitMyOrgReview(data)        { return req('POST', '/company-reviews/my-org', data); },
  async getAdminReviews()              { const r = await req('GET', '/company-reviews'); return r?.data || r; },
  async getReportedReviews()           { const r = await req('GET', '/company-reviews/reported'); return r?.data || r; },
  async reportReview(id, reason)       { return req('PATCH', `/company-reviews/${id}/report`, { reason }); },
  async unreportReview(id)             { return req('PATCH', `/company-reviews/${id}/unreport`); },
  async deleteReview(id)               { return req('DELETE', `/company-reviews/${id}`); },
  async seedReviews()                  { return req('POST', '/company-reviews/seed', {}); },
};
