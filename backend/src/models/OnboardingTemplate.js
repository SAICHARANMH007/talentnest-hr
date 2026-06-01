'use strict';
const mongoose = require('mongoose');

const taskTemplateSchema = new mongoose.Schema({
  title      : { type: String, required: true },
  description: { type: String, default: '' },
  category   : { type: String, enum: ['document', 'training', 'it_setup', 'policy', 'orientation', 'other'], default: 'other' },
  dueDays    : { type: Number, default: 1 }, // days from joining date
  isRequired : { type: Boolean, default: true },
}, { _id: true });

const onboardingTemplateSchema = new mongoose.Schema({
  tenantId  : { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name      : { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  isDefault : { type: Boolean, default: false }, // auto-apply to all new hires
  tasks     : [taskTemplateSchema],
  createdBy : { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt : { type: Date, default: null },
}, { timestamps: true });

onboardingTemplateSchema.index({ tenantId: 1, deletedAt: 1 });

module.exports = mongoose.model('OnboardingTemplate', onboardingTemplateSchema);
