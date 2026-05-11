'use strict';
const mongoose = require('mongoose');

const importedCandidateSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  // Flexible JSON object to store any Excel row data exactly as it is
  data: {
    type: mongoose.Schema.Types.Map,
    of: mongoose.Schema.Types.Mixed,
  },
  // Metadata for the "Deep Scan" and "Self-Healing" logic
  email: { type: String, lowercase: true, trim: true },
  name: { type: String, trim: true },
  
  status: {
    type: String,
    enum: ['pending', 'invited', 'joined'],
    default: 'pending'
  },
  
  invitedAt: { type: Date },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Link to the User account once they accept the invite
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  minimize: false // Ensure empty fields are preserved in the data map
});

// Index for fast email lookups and search
importedCandidateSchema.index({ tenantId: 1, email: 1 });
importedCandidateSchema.index({ tenantId: 1, status: 1 });

module.exports = mongoose.model('ImportedCandidate', importedCandidateSchema);
