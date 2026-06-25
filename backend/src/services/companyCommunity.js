'use strict';
/**
 * Ensures a company community exists for the given company name.
 * Called fire-and-forget after job create / activate / approve so
 * communities are created in real-time, not just on the 10-min background pass.
 */

const { normalizeCompanyName } = require('../utils/companyNames');

function collegeSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function ensureOneCompanyCommunity(rawCompanyName, createdBy, tenantId) {
  if (!rawCompanyName) return;
  const normalized = normalizeCompanyName(rawCompanyName);
  if (!normalized) return;

  const Community = require('../models/Community');

  const existing = await Community.findOne({
    companyName: { $regex: new RegExp(`^${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
  }).lean();
  if (existing) return;

  const baseSlug = collegeSlug(normalized);
  let slug = baseSlug;
  let attempt = 0;
  while (await Community.exists({ slug })) {
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  await Community.create({
    tenantId,
    name: `${normalized} Community`,
    slug,
    companyName: normalized,
    description: `Official community for ${normalized} employees and alumni — referrals, opportunities, and discussions.`,
    icon: '🏢',
    category: 'other',
    coverColor: '#0176D3',
    isGlobal: true,
    memberIds: [],
    memberCount: 0,
    createdBy: createdBy || null,
  }).catch(() => {}); // silently ignore unique-slug races

  // Bust the GET /api/communities list cache so the new community appears immediately
  try { require('../routes/communities').bustListCache(); } catch (_) {}
}

module.exports = { ensureOneCompanyCommunity };
