import { req, setToken, clearToken, initAuth } from '../client.js';
import { logAudit } from '../../utils/audit.js';

export const authService = {
  async login(email, password) {
    const data = await req('POST', '/auth/login', { email, password }, false);
    if (data.token) {
      setToken(data.token); // in-memory only — never sessionStorage
      if (data.user) sessionStorage.setItem('tn_user', JSON.stringify(data.user));
      logAudit('Login', 'Auth', `${data.user?.name} logged in as ${data.user?.role}`, 'info', data.user);
    }
    return data; // { token, user }
  },

  async register(payload) {
    const data = await req('POST', '/auth/register', payload, false);
    if (data.token) {
      setToken(data.token);
      if (data.user) sessionStorage.setItem('tn_user', JSON.stringify(data.user));
    }
    return data;
  },

  async googleAuth(credential, role = 'candidate') {
    const data = await req('POST', '/auth/google', { credential, role }, false);
    if (data.token) {
      setToken(data.token);
      if (data.user) sessionStorage.setItem('tn_user', JSON.stringify(data.user));
    }
    return data;
  },

  // Silent session restore on app startup — reads the HTTP-only refresh cookie
  async initAuth() {
    return initAuth(); // returns { token, user } or null
  },

  async verifyDomain(domain) { return req('POST', '/auth/verify-domain', { domain }, false); },
  async forgotPassword(email) { return req('POST', '/auth/forgot-password', { email }, false); },
  async setPassword(token, email, newPassword) { return req('POST', '/auth/set-password', { token, email, newPassword }, false); },
  async resetPassword(email, token, newPassword) { return req('POST', '/auth/reset-password', { email, token, newPassword }, false); },
  async changePassword(currentPassword, newPassword) { return req('POST', '/auth/change-password', { currentPassword, newPassword }); },

  async verifyOtp(email, otp) {
    const data = await req('POST', '/auth/verify-otp', { email, otp }, false);
    if (data.token) {
      setToken(data.token);
      if (data.user) sessionStorage.setItem('tn_user', JSON.stringify(data.user));
    }
    return data;
  },

  async logout() {
    try { await req('POST', '/auth/logout'); } catch {}
    clearToken();
    sessionStorage.removeItem('tn_user');
  },
};
