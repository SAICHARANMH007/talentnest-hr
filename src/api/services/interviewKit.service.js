import { req } from '../client.js';

export const interviewKitService = {
  async getInterviewKits() {
    const r = await req('GET', '/interview-kits');
    return r?.data || r;
  },
  async getInterviewKit(id) {
    const r = await req('GET', `/interview-kits/${id}`);
    return r?.data || r;
  },
  async createInterviewKit(data) {
    const r = await req('POST', '/interview-kits', data);
    return r?.data || r;
  },
  async updateInterviewKit(id, data) {
    const r = await req('PUT', `/interview-kits/${id}`, data);
    return r?.data || r;
  },
  async deleteInterviewKit(id) {
    const r = await req('DELETE', `/interview-kits/${id}`);
    return r?.data || r;
  },
  async saveKitScores(appId, roundIndex, kitScores) {
    const r = await req('POST', `/applications/${appId}/interview/${roundIndex}/kit-scores`, { kitScores });
    return r?.data || r;
  },
};
