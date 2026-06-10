import { req, getToken } from '../client.js';
import { API_BASE_URL } from '../config.js';

export const feedPostService = {
  async getPosts(params = {}) {
    const q = new URLSearchParams();
    if (params.page)   q.set('page',  String(params.page));
    if (params.limit)  q.set('limit', String(params.limit));
    if (params.type)   q.set('type',  params.type);
    return req('GET', `/social-posts${q.toString() ? `?${q}` : ''}`);
  },
  async getUserPosts(userId) {
    return req('GET', `/social-posts/user/${userId}`);
  },
  async createPost(data) {
    return req('POST', '/social-posts', data);
  },
  async deletePost(id) {
    return req('DELETE', `/social-posts/${id}`);
  },
  async reactToPost(id, type) {
    return req('POST', `/social-posts/${id}/react`, { type });
  },
  async toggleSavePost(id) {
    return req('POST', `/social-posts/${id}/save`, {});
  },
  async getSavedPosts() {
    return req('GET', '/social-posts/saved/list');
  },
  async addComment(id, content, mentions = []) {
    return req('POST', `/social-posts/${id}/comment`, { content, mentions });
  },
  async deleteComment(postId, commentId) {
    return req('DELETE', `/social-posts/${postId}/comment/${commentId}`);
  },
  async seedTestData() {
    return req('POST', '/social-posts/seed', {});
  },
  async uploadFeedImage(formData) {
    const token = getToken();
    const headers = { 'X-Requested-With': 'TalentNest' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE_URL}/social-posts/upload-image`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error || e.message || `Upload failed (${res.status})`);
    }
    return res.json();
  },
  async getPublicPost(id) {
    const res = await fetch(`${API_BASE_URL}/social-posts/public/${id}`);
    return res.json();
  },
  async reportPost(id, reason, details = '') {
    return req('POST', `/social-posts/${id}/report`, { reason, details });
  },
  async getReportedPosts() {
    return req('GET', '/social-posts/reported');
  },
  async dismissReport(reportId) {
    return req('PATCH', `/social-posts/reports/${reportId}/dismiss`, {});
  },
  async deleteReportedPost(reportId) {
    return req('DELETE', `/social-posts/reports/${reportId}/delete-post`);
  },
};
