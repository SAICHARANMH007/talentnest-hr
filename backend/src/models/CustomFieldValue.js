'use strict';
const mongoose = require('mongoose');

/**
 * CustomFieldValue — stores the actual values for custom fields per record.
 * One document per (entity record + field definition).
 * e.g. candidate A's value for custom field "Expected CTC"
 */
const customFieldValueSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },

  // Which field definition this value belongs to
  fieldId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomFieldDefinition',
    required: true,
    index: true,
  },

  // The entity and its record ID
  entity: {
    type: String,
    enum: ['candidate', 'job', 'application'],
    required: true,
  },
  recordId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },

  // Stored as string; arrays stored as JSON.stringify for multiselect
  value: { type: String, default: '' },
}, { timestamps: true });

customFieldValueSchema.index({ tenantId: 1, entity: 1, recordId: 1 });
// Unique: one value per record per field
customFieldValueSchema.index({ fieldId: 1, recordId: 1 }, { unique: true });

customFieldValueSchema.set('toJSON', { virtuals: true });
customFieldValueSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('CustomFieldValue', customFieldValueSchema);
