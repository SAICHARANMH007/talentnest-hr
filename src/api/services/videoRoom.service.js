import { req } from '../client.js';

export const videoRoomService = {
  async createRoom(interviewId)       { return req('POST', '/video-rooms', { interviewId }); },
  async getRoom(roomToken)            { return req('GET', `/video-rooms/join/${roomToken}`, null, false); },
  async getRoomByInterview(id)        { return req('GET', `/video-rooms/by-interview/${id}`); },
  async getTranscript(roomToken)      { return req('GET', `/video-rooms/${roomToken}/transcript`); },
  // Fetches time-limited TURN credentials from your own backend.
  // Works for authenticated users and guests (no auth header needed).
  async getTurnCredentials()          { return req('GET', '/video-rooms/turn-credentials', null, false); },
};
