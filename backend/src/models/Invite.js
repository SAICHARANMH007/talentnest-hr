'use strict';
const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  candidateId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  jobId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  tenantId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true },
  token:          { type: String, unique: true, index: true },
  status:         { type: String, default: 'sent' }, // sent | opened | interested | declined | failed
  emailError:     String,
  sentAt:         String,
  openedAt:       String,
  respondedAt:    String,
  sentBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sentByName:     String,
  type:           { type: String, default: 'invite' }, // 'invite' | 'job_share'
  message:        String,
  candidateName:  String,
  candidateEmail: String,
  jobTitle:       String,
}, { timestamps: true, toJSON: { virtuals: true } });
module.exports = mongoose.model('Invite', schema);
