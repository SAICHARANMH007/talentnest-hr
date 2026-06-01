import { req } from '../client.js';

export const webhookService = {
  async getWebhooks()                  { const r = await req('GET', '/webhooks'); return r?.data || r; },
  async createWebhook(data)            { const r = await req('POST', '/webhooks', data); return r?.data || r; },
  async updateWebhook(id, data)        { const r = await req('PUT', `/webhooks/${id}`, data); return r?.data || r; },
  async deleteWebhook(id)              { return req('DELETE', `/webhooks/${id}`); },
  async testWebhook(id)                { const r = await req('POST', `/webhooks/${id}/test`); return r?.data || r; },
  async getWebhookEvents()             { const r = await req('GET', '/webhooks/events'); return r?.data || r; },
};
