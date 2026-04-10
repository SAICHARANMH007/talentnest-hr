'use strict';
const express      = require('express');
const router       = express.Router();
const Lead         = require('../models/Lead');
const { authenticate: auth } = require('../middleware/auth');
const { allowRoles }        = require('../middleware/rbac');
const asyncHandler = require('../utils/asyncHandler');
const AppError     = require('../utils/AppError');
const logger       = require('../middleware/logger');

// POST /api/leads — Public submission from contact page
router.post('/', asyncHandler(async (req, res) => {
  const { name, email, phone, company, service, message } = req.body;
  if (!name || !email || !service) throw new AppError('name, email and service fields are required.', 400);

  const lead = await Lead.create({
    name, email, phone, company, service, message,
    source: req.body.source || 'contact-page',
  });

  // Track activity silently
  logger.info(`New lead submitted from ${email} for ${service}`);

  res.status(201).json({ success: true, data: lead.toJSON ? lead.toJSON() : lead });
}));

// GET /api/leads — List leads (Super Admin only per user request)
router.get('/', auth, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status && ['new', 'contacted', 'converted', 'closed'].includes(status)) {
    filter.status = status;
  }

  const leads = await Lead.find(filter).sort({ createdAt: -1 }).lean();
  
  // Normalise ids for frontend
  const result = leads.map(l => ({ ...l, id: l._id.toString() }));
  res.json({ success: true, data: result });
}));

// PATCH /api/leads/:id — Update lead status/notes (Super Admin only)
router.patch('/:id', auth, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  const updates = {};
  if (status && ['new', 'contacted', 'converted', 'closed'].includes(status)) updates.status = status;
  if (notes !== undefined) updates.notes = notes;

  const lead = await Lead.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true }).lean();
  if (!lead) throw new AppError('Lead not found.', 404);

  logger.audit(`Super Admin updated lead ${req.params.id}`, req.user._id, null, { status, id: req.params.id });
  res.json({ success: true, data: { ...lead, id: lead._id.toString() } });
}));

// DELETE /api/leads/:id — Remove lead (Super Admin only)
router.delete('/:id', auth, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const lead = await Lead.findByIdAndDelete(req.params.id);
  if (!lead) throw new AppError('Lead not found.', 404);

  logger.audit(`Super Admin deleted lead ${req.params.id}`, req.user._id, null, { email: lead.email });
  res.json({ success: true, message: 'Lead record removed.' });
}));

module.exports = router;
