'use strict';
const mongoose = require('mongoose');

const conditionSchema = new mongoose.Schema({
  field   : { type: String, required: true },
  operator: { type: String, required: true, enum: ['equals', 'not_equals', 'above', 'below', 'contains'] },
  value   : { type: mongoose.Schema.Types.Mixed },
}, { _id: false });

const actionSchema = new mongoose.Schema({
  type  : {
    type    : String,
    required: true,
    enum    : ['send_email', 'send_whatsapp', 'move_stage', 'notify_recruiter', 'notify_admin', 'create_task'],
  },
  config: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false });

const workflowRuleSchema = new mongoose.Schema({
  // null tenantId = system/platform-level template (not tenant-specific)
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null },
  name    : { type: String, required: true, trim: true },
  isActive: { type: Boolean, default: true },

  // System template flags
  isSystem        : { type: Boolean, default: false },  // true = platform template (super admin owns)
  isSystemCopy    : { type: Boolean, default: false },  // true = org's activated copy of a system template
  systemKey       : { type: String, default: null },    // unique key linking copies ↔ template (e.g. 'welcome_on_apply')
  description     : { type: String, default: '' },      // human-readable description
  category        : {                                   // grouping for display
    type   : String,
    default: 'General',
    enum   : ['General', 'Communication', 'Pipeline', 'Assessment', 'Offer', 'Onboarding'],
  },

  trigger: {
    event     : {
      type    : String,
      required: true,
      enum    : [
        'stage_changed',
        'candidate_stuck',
        'assessment_completed',
        'offer_not_signed',
        'candidate_applied',
        'interview_scheduled',
      ],
    },
    conditions: { type: [conditionSchema], default: [] },
  },

  actions      : { type: [actionSchema], default: [] },
  lastTriggeredAt: { type: Date },
  triggerCount   : { type: Number, default: 0 },
  createdBy      : { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

workflowRuleSchema.index({ tenantId: 1, isActive: 1 });
workflowRuleSchema.index({ tenantId: 1, 'trigger.event': 1 });
workflowRuleSchema.index({ isSystem: 1 });                  // fast lookup of all system templates
workflowRuleSchema.index({ tenantId: 1, systemKey: 1 });    // fast lookup of org's copy for a given key

workflowRuleSchema.virtual('id').get(function () { return this._id.toHexString(); });
workflowRuleSchema.set('toJSON', { virtuals: true });
workflowRuleSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('WorkflowRule', workflowRuleSchema);

