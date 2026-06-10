import { req } from '../client.js';

export const infoRequestService = {
  async requestInfo(userId) {
    return req('POST', `/info-requests/request/${userId}`, {});
  },
  async getIncomingInfoRequests() {
    return req('GET', '/info-requests/incoming');
  },
  async getSentInfoRequests() {
    return req('GET', '/info-requests/sent');
  },
  async getInfoRequestStatus(userId) {
    return req('GET', `/info-requests/status/${userId}`);
  },
  async acceptInfoRequest(requestId) {
    return req('POST', `/info-requests/accept/${requestId}`, {});
  },
  async declineInfoRequest(requestId) {
    return req('POST', `/info-requests/decline/${requestId}`, {});
  },
};
