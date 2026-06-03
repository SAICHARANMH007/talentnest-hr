import { req } from '../client.js';

export const platformReferralService = {
  async getPlatformReferralStats()           { return req('GET',  '/platform-referrals/my-stats'); },
  async trackPlatformInvite()                { return req('POST', '/platform-referrals/track-invite', {}); },
  async creditPlatformReferral(body)         { return req('POST', '/platform-referrals/credit', body); },
  async redeemVerifiedBadge()                { return req('POST', '/platform-referrals/redeem-verified-badge', {}); },
  async getAdminPlatformReferrals(params={}) {
    const p = new URLSearchParams();
    Object.entries(params).forEach(([k,v]) => { if (v !== undefined && v !== null) p.set(k, v); });
    const qs = p.toString();
    return req('GET', `/platform-referrals/admin/all${qs ? '?'+qs : ''}`);
  },
  async getAdminPlatformReferralStats()      { return req('GET',  '/platform-referrals/admin/stats'); },
};
