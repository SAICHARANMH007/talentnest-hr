'use strict';
const express    = require('express');
const router     = express.Router();
const CustomFieldDefinition = require('../models/CustomFieldDefinition');
const CustomFieldValue      = require('../models/CustomFieldValue');
const { authenticate }      = require('../middleware/auth');
const { allowRoles }        = require('../middleware/rbac');
const asyncHandler          = require('../utils/asyncHandler');
const AppError              = require('../utils/AppError');

const tenantGuard = (req, res, next) => {
  if (!req.user?.tenantId) return res.status(403).json({ success: false, error: 'Tenant context missing.' });
  next();
};
const hrGuard = [authenticate, tenantGuard, allowRoles('admin', 'super_admin', 'recruiter')];

// ── helpers ───────────────────────────────────────────────────────────────────
function toKey(label) {
  return label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function normalize(doc) {
  const o = doc.toObject ? doc.toObject() : { ...doc };
  return { ...o, id: o._id?.toString() };
}

// ── GET /api/custom-fields?entity=candidate ───────────────────────────────────
router.get('/', authenticate, tenantGuard, asyncHandler(async (req, res) => {
  const { entity } = req.query;
  const q = { tenantId: req.user.tenantId, isActive: true };
  if (entity) q.entity = entity;
  const fields = await CustomFieldDefinition.find(q).sort({ entity: 1, order: 1 }).lean();
  res.json({ success: true, data: fields.map(f => ({ ...f, id: f._id.toString() })) });
}));

// ── POST /api/custom-fields — create ─────────────────────────────────────────
router.post('/', ...hrGuard, asyncHandler(async (req, res) => {
  const { label, entity, fieldType, placeholder, helpText, section, options, isRequired, order } = req.body;
  if (!label || !entity) throw new AppError('label and entity are required.', 400);

  const fieldKey = toKey(label);

  // Check for duplicate key within tenant+entity
  const exists = await CustomFieldDefinition.findOne({ tenantId: req.user.tenantId, entity, fieldKey });
  if (exists) throw new AppError(`A field with key "${fieldKey}" already exists for ${entity}.`, 409);

  const maxOrder = await CustomFieldDefinition.countDocuments({ tenantId: req.user.tenantId, entity });

  const field = await CustomFieldDefinition.create({
    tenantId:    req.user.tenantId,
    entity,
    label:       label.trim(),
    fieldKey,
    fieldType:   fieldType || 'text',
    placeholder: placeholder || '',
    helpText:    helpText || '',
    section:     section  || '',
    options:     Array.isArray(options) ? options.filter(Boolean) : [],
    isRequired:  !!isRequired,
    order:       order !== undefined ? order : maxOrder,
    createdBy:   req.user._id || req.user.id,
  });

  res.status(201).json({ success: true, data: normalize(field) });
}));

// ── PATCH /api/custom-fields/:id ──────────────────────────────────────────────
router.patch('/:id', ...hrGuard, asyncHandler(async (req, res) => {
  const allowed = ['label', 'placeholder', 'helpText', 'section', 'options', 'isRequired', 'isActive', 'order', 'fieldType'];
  const update = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

  const field = await CustomFieldDefinition.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user.tenantId },
    { $set: update },
    { new: true }
  );
  if (!field) throw new AppError('Field not found.', 404);
  res.json({ success: true, data: normalize(field) });
}));

// ── DELETE /api/custom-fields/:id — soft delete ───────────────────────────────
router.delete('/:id', ...hrGuard, asyncHandler(async (req, res) => {
  const field = await CustomFieldDefinition.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user.tenantId },
    { $set: { isActive: false } },
    { new: true }
  );
  if (!field) throw new AppError('Field not found.', 404);
  res.json({ success: true, message: 'Field deactivated.' });
}));

// ── Reorder — PATCH /api/custom-fields/reorder ───────────────────────────────
router.patch('/reorder/batch', ...hrGuard, asyncHandler(async (req, res) => {
  // body: { items: [{ id, order }] }
  const { items } = req.body;
  if (!Array.isArray(items)) throw new AppError('items array is required.', 400);

  await Promise.all(items.map(({ id, order }) =>
    CustomFieldDefinition.findOneAndUpdate(
      { _id: id, tenantId: req.user.tenantId },
      { $set: { order } }
    )
  ));
  res.json({ success: true });
}));

// ── VALUES: GET /api/custom-fields/values/:entity/:recordId ──────────────────
router.get('/values/:entity/:recordId', authenticate, tenantGuard, asyncHandler(async (req, res) => {
  const { entity, recordId } = req.params;

  // Get active field definitions
  const defs = await CustomFieldDefinition.find({ tenantId: req.user.tenantId, entity, isActive: true })
    .sort({ order: 1 }).lean();

  // Get stored values
  const values = await CustomFieldValue.find({ tenantId: req.user.tenantId, entity, recordId }).lean();
  const valMap = {};
  values.forEach(v => { valMap[v.fieldId.toString()] = v.value; });

  const result = defs.map(d => ({
    ...d,
    id: d._id.toString(),
    value: valMap[d._id.toString()] ?? '',
  }));

  res.json({ success: true, data: result });
}));

// ── VALUES: PUT /api/custom-fields/values/:entity/:recordId ──────────────────
// Upsert all field values for a record at once
router.put('/values/:entity/:recordId', authenticate, tenantGuard, asyncHandler(async (req, res) => {
  const { entity, recordId } = req.params;
  // body: { values: { fieldId: value, ... } }
  const { values } = req.body;
  if (!values || typeof values !== 'object') throw new AppError('values object is required.', 400);

  const ops = Object.entries(values).map(([fieldId, value]) => ({
    updateOne: {
      filter: { fieldId, recordId, tenantId: req.user.tenantId },
      update: { $set: { value: String(value ?? ''), entity, tenantId: req.user.tenantId } },
      upsert: true,
    },
  }));

  if (ops.length) await CustomFieldValue.bulkWrite(ops);
  res.json({ success: true, message: `${ops.length} field value(s) saved.` });
}));

module.exports = router;
