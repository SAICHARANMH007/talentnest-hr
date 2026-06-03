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
  async addComment(id, content) {
    return req('POST', `/social-posts/${id}/comment`, { content });
  },
  async deleteComment(postId, commentId) {
    return req('DELETE', `/social-posts/${postId}/comment/${commentId}`);
  },
  async seedTestData() {
    return req('POST', '/social-posts/seed', {});
  },
  async uploadFeedImage(formData) {
    const token = getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE_URL}/social-posts/upload-image`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return res.json();
  },
  async getPublicPost(id) {
    const res = await fetch(`${API_BASE_URL}/social-posts/public/${id}`);
    return res.json();
  },
};
