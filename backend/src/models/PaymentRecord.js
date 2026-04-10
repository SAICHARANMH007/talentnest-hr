'use strict';
const mongoose = require('mongoose');

const paymentRecordSchema = new mongoose.Schema({
  tenantId          : { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },

  planName          : { type: String, required: true },
  amountInPaise     : { type: Number, required: true },
  amountINR         : { type: Number, required: true },
  currency          : { type: String, default: 'INR' },

  // Razorpay references
  razorpayOrderId   : { type: String },
  razorpayPaymentId : { type: String },
  razorpaySignature : { type: String },

  status: {
    type   : String,
    enum   : ['created', 'captured', 'failed', 'refunded'],
    default: 'created',
  },

  // Invoice
  invoiceNumber  : { type: String },
  invoicePdfUrl  : { type: String },

  // GST breakdown (all in INR)
  gstAmount      : { type: Number, default: 0 },
  cgst           : { type: Number, default: 0 },
  sgst           : { type: Number, default: 0 },
  igst           : { type: Number, default: 0 },
  isInterState   : { type: Boolean, default: false },
  customerGSTIN  : { type: String },

  paidAt         : { type: Date },
}, { timestamps: true });

paymentRecordSchema.index({ tenantId: 1, createdAt: -1 });
paymentRecordSchema.index({ razorpayOrderId: 1 });

paymentRecordSchema.set('toJSON', { virtuals: true });
paymentRecordSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('PaymentRecord', paymentRecordSchema);
