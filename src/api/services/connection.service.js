import { req } from '../client.js';

export const connectionService = {
  async getConnections() {
    return req('GET', '/connections');
  },
  async getPendingRequests() {
    return req('GET', '/connections/pending');
  },
  async getSentRequests() {
    return req('GET', '/connections/sent');
  },
  async getConnectionSuggestions() {
    return req('GET', '/connections/suggestions');
  },
  async searchPeople(q) {
    return req('GET', `/connections/search?q=${encodeURIComponent(q)}`);
  },
  async sendConnectionRequest(userId) {
    return req('POST', `/connections/request/${userId}`);
  },
  async acceptConnectionRequest(requestId) {
    return req('POST', `/connections/accept/${requestId}`);
  },
  async rejectConnectionRequest(requestId) {
    return req('POST', `/connections/reject/${requestId}`);
  },
  async removeConnection(userId) {
    return req('DELETE', `/connections/remove/${userId}`);
  },
  async cancelConnectionRequest(requestId) {
    return req('DELETE', `/connections/cancel/${requestId}`);
  },
};
