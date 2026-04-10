'use strict';
const express  = require('express');
const router   = express.Router();
const Client   = require('../models/Client');
const { authMiddleware }  = require('../middleware/auth');
const { tenantGuard }     = require('../middleware/tenantGuard');
const { allowRoles }      = require('../middleware/rbac');
const { getPagination, paginatedResponse } = require('../middleware/paginate');
const asyncHandler = require('../utils/asyncHandler');
const AppError     = require('../utils/AppError');
const logger       = require('../middleware/logger');

const guard = [authMiddleware, tenantGuard];

/** Escape regex special chars to prevent ReDoS on user-supplied search strings */
function escRe(s) { return String(s).slice(0, 200).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function normalize(c) {
  const o = c.toObject ? c.toObject() : { ...c };
  o.id = o.id || o._id?.toString();
  return o;
}

// GET /api/clients
router.get('/', ...guard,
  allowRoles('admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    const filter = { tenantId: req.user.tenantId };
    if (req.query.search) filter.companyName = { $regex: escRe(req.query.search), $options: 'i' };

    const [items, total] = await Promise.all([
      Client.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Client.countDocuments(filter),
    ]);
    res.json(paginatedResponse(items.map(c => ({ ...c, id: c._id?.toString() })), total, limit, page));
  })
);

// GET /api/clients/:id
router.get('/:id', ...guard, asyncHandler(async (req, res) => {
  const c = await Client.findOne({ _id: req.params.id, tenantId: req.user.tenantId }).lean();
  if (!c) throw new AppError('Client not found.', 404);
  res.json({ success: true, data: normalize(c) });
}));

// POST /api/clients
router.post('/', ...guard,
  allowRoles('admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const { companyName, contactPerson, email, phone, industry } = req.body;
    if (!companyName) throw new AppError('companyName is required.', 400);

    const c = await Client.create({
      tenantId: req.user.tenantId,
      companyName: companyName.trim(),
      contactPerson: contactPerson || '',
      email: email ? email.toLowerCase().trim() : '',
      phone: phone || '',
      industry: industry || '',
    });

    logger.audit('Client created', req.user.id, req.user.tenantId, { clientId: c._id });
    res.status(201).json({ success: true, data: normalize(c) });
  })
);

// PATCH /api/clients/:id
router.patch('/:id', ...guard,
  allowRoles('admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const forbidden = ['tenantId', '_id'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => !forbidden.includes(k)));

    const c = await Client.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { $set: updates },
      { new: true }
    );
    if (!c) throw new AppError('Client not found.', 404);

    logger.audit('Client updated', req.user.id, req.user.tenantId, { clientId: c._id });
    res.json({ success: true, data: normalize(c) });
  })
);

// DELETE /api/clients/:id — soft delete (isActive=false)
router.delete('/:id', ...guard,
  allowRoles('admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const c = await Client.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { $set: { isActive: false } },
      { new: true }
    );
    if (!c) throw new AppError('Client not found.', 404);
    res.json({ success: true, message: 'Client deactivated.' });
  })
);

module.exports = router;
