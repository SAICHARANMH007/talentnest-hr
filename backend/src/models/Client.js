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

  // Commercial terms — how this client is billed for placements
  billingType    : { type: String, enum: ['percentage_of_ctc', 'flat_per_hire', 'retainer', 'custom'], default: 'percentage_of_ctc' },
  billingValue   : { type: Number, default: 0, min: 0 },
  billingCurrency: { type: String, default: 'INR' },
  billingNotes   : { type: String, default: '' },

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

clientSchema.index({ tenantId: 1 });
clientSchema.index({ tenantId: 1, isActive: 1 });

clientSchema.set('toJSON', { virtuals: true });
clientSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Client', clientSchema);
