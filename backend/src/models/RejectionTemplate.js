const mongoose = require('mongoose');

const rejectionTemplateSchema = new mongoose.Schema({
  tenantId  : { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  createdBy : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name      : { type: String, required: true, trim: true },
  stage     : { type: String, trim: true },
  subject   : { type: String, required: true, trim: true },
  body      : { type: String, required: true },
  isDefault : { type: Boolean, default: false },
  deletedAt : { type: Date, default: null },
}, { timestamps: true });

rejectionTemplateSchema.index({ tenantId: 1, deletedAt: 1 });

module.exports = mongoose.model('RejectionTemplate', rejectionTemplateSchema);
