'use strict';
/**
 * /api/customizations — Org-scoped Customizations CRUD
 *
 * Supported sections (collections):
 *   pipelineStatuses | tags | rejectionReasons | scoreCards |
 *   documentTypes | questionBank | offerVariables | notificationMessages
 *
 * Supported singleton patches:
 *   emailSignature | fieldVisibility | brandColors
 */
const express   = require('express');
const router    = express.Router();
const OrgCustomizations = require('../models/OrgCustomizations');
const { authenticate }  = require('../middleware/auth');
const { allowRoles }    = require('../middleware/rbac');
const asyncHandler      = require('../utils/asyncHandler');
const AppError          = require('../utils/AppError');

const guard = [authenticate, allowRoles('admin', 'super_admin')];

const COLLECTIONS = [
  'pipelineStatuses', 'tags', 'rejectionReasons', 'scoreCards',
  'documentTypes', 'questionBank', 'offerVariables', 'notificationMessages',
  'departments', 'locations', 'sources',
];
const SINGLETONS = ['emailSignature', 'fieldVisibility', 'brandColors', 'offerLetterTemplate'];

function resolveOrgId(req) {
  // super_admin can pass ?orgId=... or uses their own tenantId
  return req.query.orgId || req.user.tenantId || req.user.orgId;
}

function toPlain(doc) {
  const obj = doc.toObject ? doc.toObject({ virtuals: true }) : { ...doc };
  // Convert Map to plain object for fieldVisibility
  if (obj.fieldVisibility instanceof Map) {
    obj.fieldVisibility = Object.fromEntries(obj.fieldVisibility);
  }
  return obj;
}

// ── GET /api/customizations — full doc ────────────────────────────────────────
router.get('/', ...guard, asyncHandler(async (req, res) => {
  const orgId = resolveOrgId(req);
  const doc   = await OrgCustomizations.getOrCreate(orgId);
  res.json({ success: true, data: toPlain(doc) });
}));

// ── PATCH /api/customizations — update singleton sections ─────────────────────
router.patch('/', ...guard, asyncHandler(async (req, res) => {
  const orgId = resolveOrgId(req);
  const update = {};

  for (const key of SINGLETONS) {
    if (req.body[key] !== undefined) {
      if (key === 'fieldVisibility') {
        // Store as Map — set each key individually
        const entries = Object.entries(req.body[key]);
        entries.forEach(([k, v]) => { update[`fieldVisibility.${k}`] = v; });
      } else {
        // Merge patch for objects (emailSignature, brandColors)
        const fields = req.body[key];
        Object.entries(fields).forEach(([k, v]) => { update[`${key}.${k}`] = v; });
      }
    }
  }

  if (Object.keys(update).length === 0) throw new AppError('No valid fields to update.', 400);

  const doc = await OrgCustomizations.findOneAndUpdate(
    { orgId },
    { $set: update },
    { new: true, upsert: true }
  );
  res.json({ success: true, data: toPlain(doc) });
}));

// ── POST /api/customizations/:section — add item to collection ────────────────
router.post('/:section', ...guard, asyncHandler(async (req, res) => {
  const { section } = req.params;
  if (!COLLECTIONS.includes(section)) throw new AppError(`Unknown section: ${section}`, 400);

  const orgId = resolveOrgId(req);
  const item  = req.body;
  if (!item || typeof item !== 'object') throw new AppError('Item body required.', 400);

  const doc = await OrgCustomizations.findOneAndUpdate(
    { orgId },
    { $push: { [section]: item } },
    { new: true, upsert: true }
  );
  // Return the newly pushed item (last in array)
  const arr     = doc[section];
  const newItem = arr[arr.length - 1];
  res.status(201).json({ success: true, data: newItem });
}));

// ── PATCH /api/customizations/:section/:id — update one item ─────────────────
router.patch('/:section/:id', ...guard, asyncHandler(async (req, res) => {
  const { section, id } = req.params;
  if (!COLLECTIONS.includes(section)) throw new AppError(`Unknown section: ${section}`, 400);

  const orgId  = resolveOrgId(req);
  const update = {};
  Object.entries(req.body).forEach(([k, v]) => {
    update[`${section}.$.${k}`] = v;
  });

  const doc = await OrgCustomizations.findOneAndUpdate(
    { orgId, [`${section}._id`]: id },
    { $set: update },
    { new: true }
  );
  if (!doc) throw new AppError('Item not found.', 404);

  const updated = doc[section].id(id);
  res.json({ success: true, data: updated });
}));

// ── DELETE /api/customizations/:section/:id — remove one item ─────────────────
router.delete('/:section/:id', ...guard, asyncHandler(async (req, res) => {
  const { section, id } = req.params;
  if (!COLLECTIONS.includes(section)) throw new AppError(`Unknown section: ${section}`, 400);

  const orgId = resolveOrgId(req);
  await OrgCustomizations.findOneAndUpdate(
    { orgId },
    { $pull: { [section]: { _id: id } } }
  );
  res.json({ success: true, message: 'Item removed.' });
}));

// ── PATCH /api/customizations/:section — replace whole collection ─────────────
// Used for bulk reorder or full replace (e.g. drag-drop reorder)
router.put('/:section', ...guard, asyncHandler(async (req, res) => {
  const { section } = req.params;
  if (!COLLECTIONS.includes(section)) throw new AppError(`Unknown section: ${section}`, 400);

  const orgId = resolveOrgId(req);
  const items = req.body.items;
  if (!Array.isArray(items)) throw new AppError('items array required.', 400);

  const doc = await OrgCustomizations.findOneAndUpdate(
    { orgId },
    { $set: { [section]: items } },
    { new: true, upsert: true }
  );
  res.json({ success: true, data: doc[section] });
}));

module.exports = router;
