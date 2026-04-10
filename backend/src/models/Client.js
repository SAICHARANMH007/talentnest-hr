'use strict';
const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  tenantId: {
    type    : mongoose.Schema.Types.ObjectId,
    ref     : 'Tenant',
    required: true,
  },

  companyName   : { type: String },
  contactPerson : { type: String },
  email         : { type: String, lowercase: true, trim: true },
  phone         : { type: String },
  industry      : { type: String },

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

clientSchema.index({ tenantId: 1 });
clientSchema.index({ tenantId: 1, isActive: 1 });

clientSchema.set('toJSON', { virtuals: true });
clientSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Client', clientSchema);
