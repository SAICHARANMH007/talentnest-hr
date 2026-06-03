import { req } from '../client.js';

export const communityService = {
  async getCommunities() {
    return req('GET', '/communities');
  },
  async createCommunity(data) {
    return req('POST', '/communities', data);
  },
  async getCommunity(slug) {
    return req('GET', `/communities/${slug}`);
  },
  async joinCommunity(slug) {
    return req('POST', `/communities/${slug}/join`);
  },
  async leaveCommunity(slug) {
    return req('POST', `/communities/${slug}/leave`);
  },
  async getCommunityFeed(slug, params = {}) {
    const q = new URLSearchParams();
    if (params.page)  q.set('page',  String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    return req('GET', `/communities/${slug}/feed${q.toString() ? `?${q}` : ''}`);
  },
  async getCommunityMembers(slug, params = {}) {
    const q = new URLSearchParams();
    if (params.page)  q.set('page',  String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    return req('GET', `/communities/${slug}/members${q.toString() ? `?${q}` : ''}`);
  },
  async getCommunityJobs(slug) {
    return req('GET', `/communities/${slug}/jobs`);
  },
  async seedCommunityPosts(slug) {
    return req('POST', `/communities/${slug}/seed-posts`, {});
  },
};
