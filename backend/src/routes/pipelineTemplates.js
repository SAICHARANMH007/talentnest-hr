'use strict';
/**
 * Pipeline Templates — stored in Tenant.settings.pipelineTemplates
 * Each template is a named stage list an admin can apply to the active pipeline.
 *
 * GET  /api/pipeline-templates           — list templates for tenant
 * POST /api/pipeline-templates           — create template (saves current or custom stages)
 * PATCH /api/pipeline-templates/:name/apply — replace active pipeline stages with template
 * DELETE /api/pipeline-templates/:name   — remove a template
 */
const express    = require('express');
const router     = express.Router();
const Tenant     = require('../models/Tenant');
const { authenticate }  = require('../middleware/auth');
const { allowRoles }    = require('../middleware/rbac');
const asyncHandler      = require('../utils/asyncHandler');
const AppError          = require('../utils/AppError');

const tenantGuard = (req, res, next) => {
  if (!req.user?.tenantId) return res.status(403).json({ success: false, error: 'Tenant context missing.' });
  next();
};
const adminGuard = [authenticate, tenantGuard, allowRoles('admin', 'super_admin')];

const PRESET_TEMPLATES = [
  {
    name: 'Standard Hiring',
    stages: ['Applied', 'Screening', 'Shortlisted', 'Interview Round 1', 'Interview Round 2', 'Offer', 'Hired', 'Rejected'],
    isPreset: true,
  },
  {
    name: 'Fast Track',
    stages: ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'],
    isPreset: true,
  },
  {
    name: 'Technical Hiring',
    stages: ['Applied', 'Screening', 'Technical Test', 'Technical Interview', 'HR Interview', 'Offer', 'Hired', 'Rejected'],
    isPreset: true,
  },
  {
    name: 'Executive Search',
    stages: ['Identified', 'Initial Outreach', 'Screening', 'Shortlisted', 'Panel Interview', 'Background Check', 'Offer', 'Onboarded', 'Rejected'],
    isPreset: true,
  },
  {
    name: 'Internship',
    stages: ['Applied', 'Resume Review', 'Phone Screen', 'Assignment', 'Interview', 'Selected', 'Rejected'],
    isPreset: true,
  },
  {
    name: 'Bulk Hiring',
    stages: ['Applied', 'Bulk Screening', 'Assessment', 'Group Discussion', 'Final Interview', 'Offer', 'Hired', 'Rejected'],
    isPreset: true,
  },
];

// GET /api/pipeline-templates
router.get('/', ...adminGuard, asyncHandler(async (req, res) => {
  const tenant = await Tenant.findById(req.user.tenantId).select('settings').lean();
  const custom = tenant?.settings?.pipelineTemplates || [];
  res.json({ success: true, data: { presets: PRESET_TEMPLATES, custom } });
}));

// POST /api/pipeline-templates — save as named template
router.post('/', ...adminGuard, asyncHandler(async (req, res) => {
  const { name, stages } = req.body;
  if (!name?.trim()) throw new AppError('name is required.', 400);
  if (!Array.isArray(stages) || stages.length < 2) throw new AppError('stages array with at least 2 items is required.', 400);

  const tenant = await Tenant.findById(req.user.tenantId);
  if (!tenant) throw new AppError('Tenant not found.', 404);

  const templates = tenant.settings?.pipelineTemplates || [];
  const existingIdx = templates.findIndex(t => t.name.toLowerCase() === name.trim().toLowerCase());

  const entry = { name: name.trim(), stages: stages.map(s => s.trim()).filter(Boolean) };
  if (existingIdx >= 0) {
    templates[existingIdx] = entry; // update
  } else {
    templates.push(entry);
  }

  tenant.settings = { ...(tenant.settings || {}), pipelineTemplates: templates };
  tenant.markModified('settings');
  await tenant.save();

  res.json({ success: true, data: entry, message: `Template "${entry.name}" saved.` });
}));

// PATCH /api/pipeline-templates/:name/apply — set as active pipeline
router.patch('/:name/apply', ...adminGuard, asyncHandler(async (req, res) => {
  const name = decodeURIComponent(req.params.name);

  // Find stages from custom or preset
  const tenant = await Tenant.findById(req.user.tenantId);
  if (!tenant) throw new AppError('Tenant not found.', 404);

  const custom  = tenant.settings?.pipelineTemplates || [];
  const preset  = PRESET_TEMPLATES.find(p => p.name.toLowerCase() === name.toLowerCase());
  const custom_ = custom.find(c => c.name.toLowerCase() === name.toLowerCase());
  const template = custom_ || preset;

  if (!template) throw new AppError(`Template "${name}" not found.`, 404);

  tenant.settings = { ...(tenant.settings || {}), pipelineStages: template.stages };
  tenant.markModified('settings');
  await tenant.save();

  res.json({ success: true, message: `Pipeline updated to "${template.name}".`, stages: template.stages });
}));

// DELETE /api/pipeline-templates/:name — remove custom template
router.delete('/:name', ...adminGuard, asyncHandler(async (req, res) => {
  const name = decodeURIComponent(req.params.name);
  const tenant = await Tenant.findById(req.user.tenantId);
  if (!tenant) throw new AppError('Tenant not found.', 404);

  const templates = (tenant.settings?.pipelineTemplates || []).filter(
    t => t.name.toLowerCase() !== name.toLowerCase()
  );

  tenant.settings = { ...(tenant.settings || {}), pipelineTemplates: templates };
  tenant.markModified('settings');
  await tenant.save();

  res.json({ success: true, message: `Template "${name}" deleted.` });
}));

module.exports = router;
