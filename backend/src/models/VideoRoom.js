'use strict';
const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  senderId:   { type: String, required: true },
  senderName: { type: String, required: true },
  text:       { type: String, required: true },
  type:       { type: String, enum: ['message', 'system'], default: 'message' },
  timestamp:  { type: Date, default: Date.now },
}, { _id: true });

const participantSchema = new mongoose.Schema({
  socketId:   String,
  userId:     String,
  name:       String,
  email:      String,
  role:       { type: String, enum: ['interviewer', 'candidate', 'observer', 'guest'], default: 'guest' },
  isGuest:    { type: Boolean, default: false },
  isHost:     { type: Boolean, default: false },
  joinedAt:   { type: Date, default: Date.now },
  leftAt:     Date,
  active:     { type: Boolean, default: true },
}, { _id: false });

const videoRoomSchema = new mongoose.Schema({
  interviewId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
  tenantId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  jobTitle:       String,
  candidateName:  String,
  orgName:        String,
  roomToken:      { type: String, required: true }, // public join token — unique index below
  hostToken:      { type: String, required: true }, // host-only token
  scheduledAt:    { type: Date, required: true },
  validFrom:      Date, // scheduledAt - 15 min
  validUntil:     Date, // scheduledAt + 4 hours
  status:         { type: String, enum: ['scheduled', 'live', 'ended'], default: 'scheduled' },
  hostUserId:     String,
  isRecording:    { type: Boolean, default: false },
  recordingStartedAt: Date,
  participants:   [participantSchema],
  chatMessages:   [chatMessageSchema],
  startedAt:      Date,
  endedAt:        Date,
}, { timestamps: true });

videoRoomSchema.index({ roomToken: 1 }, { unique: true });
videoRoomSchema.index({ interviewId: 1 });
videoRoomSchema.index({ tenantId: 1, status: 1 });

module.exports = mongoose.model('VideoRoom', videoRoomSchema);
