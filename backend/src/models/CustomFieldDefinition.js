'use strict';
const mongoose = require('mongoose');

/**
 * CustomFieldDefinition — per-tenant schema for user-defined fields.
 * These appear on candidate, job, or application forms.
 *
 * Field types: text, textarea, number, date, select (single), multiselect, checkbox, url
 */
const customFieldSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },

  // Which entity this field belongs to
  entity: {
    type: String,
    enum: ['candidate', 'job', 'application'],
    required: true,
    index: true,
  },

  label:       { type: String, required: true, trim: true },     // Display label
  fieldKey:    { type: String, required: true, trim: true },     // snake_case key used in storage
  fieldType: {
    type: String,
    enum: ['text', 'textarea', 'number', 'date', 'select', 'multiselect', 'checkbox', 'url'],
    default: 'text',
  },

  placeholder: { type: String },
  helpText:    { type: String },

  // For select / multiselect
  options: [{ type: String, trim: true }],

  isRequired:  { type: Boolean, default: false },
  isActive:    { type: Boolean, default: true, index: true },

  // Display order within entity
  order:       { type: Number, default: 0 },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

// Enforce unique fieldKey per tenant+entity
customFieldSchema.index({ tenantId: 1, entity: 1, fieldKey: 1 }, { unique: true });
customFieldSchema.index({ tenantId: 1, entity: 1, isActive: 1, order: 1 });

customFieldSchema.set('toJSON', { virtuals: true });
customFieldSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('CustomFieldDefinition', customFieldSchema);
