'use strict';
const router       = require('express').Router();
const asyncHandler = require('express-async-handler');
const authMiddleware = require('../middleware/authMiddleware');
const tenantGuard  = require('../middleware/tenantGuard');
const allowRoles   = require('../middleware/allowRoles');
const OnboardingTemplate = require('../models/OnboardingTemplate');
const PreBoarding   = require('../models/PreBoarding');

const guard        = [authMiddleware, tenantGuard];
const adminRoles   = allowRoles('admin', 'super_admin');

// List templates
router.get('/', ...guard, adminRoles, asyncHandler(async (req, res) => {
  const templates = await OnboardingTemplate.find({ tenantId: req.user.tenantId, deletedAt: null })
    .sort({ isDefault: -1, createdAt: -1 }).lean();
  res.json({ templates });
}));

// Create template
router.post('/', ...guard, adminRoles, asyncHandler(async (req, res) => {
  const { name, description, isDefault, tasks } = req.body;
  if (!name) return res.status(400).json({ message: 'Template name required' });

  if (isDefault) {
    await OnboardingTemplate.updateMany({ tenantId: req.user.tenantId }, { $set: { isDefault: false } });
  }

  const template = await OnboardingTemplate.create({
    tenantId: req.user.tenantId,
    name, description, isDefault: !!isDefault,
    tasks: Array.isArray(tasks) ? tasks : [],
    createdBy: req.user._id,
  });
  res.status(201).json({ template });
}));

// Update template
router.patch('/:id', ...guard, adminRoles, asyncHandler(async (req, res) => {
  const { name, description, isDefault, tasks } = req.body;
  if (isDefault) {
    await OnboardingTemplate.updateMany({ tenantId: req.user.tenantId }, { $set: { isDefault: false } });
  }
  const template = await OnboardingTemplate.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null },
    { $set: { name, description, isDefault: !!isDefault, tasks } },
    { new: true }
  );
  if (!template) return res.status(404).json({ message: 'Template not found' });
  res.json({ template });
}));

// Delete template
router.delete('/:id', ...guard, adminRoles, asyncHandler(async (req, res) => {
  const t = await OnboardingTemplate.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null },
    { $set: { deletedAt: new Date() } }
  );
  if (!t) return res.status(404).json({ message: 'Template not found' });
  res.json({ message: 'Deleted' });
}));

// Apply template to a preboarding record
router.post('/:id/apply/:preBoardingId', ...guard, adminRoles, asyncHandler(async (req, res) => {
  const template = await OnboardingTemplate.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null }).lean();
  if (!template) return res.status(404).json({ message: 'Template not found' });

  const pb = await PreBoarding.findOne({ _id: req.params.preBoardingId, tenantId: req.user.tenantId });
  if (!pb) return res.status(404).json({ message: 'Preboarding record not found' });

  const joiningDate = pb.joiningDate || new Date();
  const newTasks = template.tasks.map(t => ({
    title      : t.title,
    description: t.description,
    category   : t.category,
    isRequired : t.isRequired,
    dueDate    : new Date(joiningDate.getTime() + (t.dueDays || 1) * 86400000),
  }));

  pb.tasks.push(...newTasks);
  await pb.save();
  res.json({ message: `Applied ${newTasks.length} tasks`, taskCount: pb.tasks.length });
}));

module.exports = router;
