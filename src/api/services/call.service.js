import { req } from '../client.js';

export const callService = {
  async getCallThread(userId) {
    const r = await req('GET', `/calls/thread/${userId}`);
    return Array.isArray(r?.data) ? r.data : [];
  },
};
