import { req } from '../client.js';

export const scheduleService = {
  async createSchedulingLink({ applicationId, slots, format, videoLink, location, notes }) {
    const r = await req('POST', '/schedule', { applicationId, slots, format, videoLink, location, notes });
    return r?.data || r;
  },
  async getSchedulingLink(token) {
    const r = await req('GET', `/schedule/${token}`);
    return r?.data || r;
  },
  async confirmSchedulingSlot(token, selectedSlot) {
    const r = await req('POST', `/schedule/${token}/confirm`, { selectedSlot });
    return r?.data || r;
  },
  // Update a video room's scheduled time (used by MeetingRoom reschedule UI)
  async updateInterview(roomId, data) {
    const r = await req('PATCH', `/video-rooms/${roomId}`, data);
    return r?.data || r;
  },
};
