'use strict';
const express      = require('express');
const router       = express.Router();
const crypto       = require('crypto');
const VideoRoom    = require('../models/VideoRoom');
const Application  = require('../models/Application');
const Candidate    = require('../models/Candidate');
const Job          = require('../models/Job');
const Organization = require('../models/Organization');
const { authenticate } = require('../middleware/auth');
const { allowRoles }   = require('../middleware/rbac');
const asyncHandler     = require('../utils/asyncHandler');
const AppError         = require('../utils/AppError');

const genToken = () => crypto.randomBytes(20).toString('hex');

// POST /api/video-rooms — create room for an interview (called internally + by recruiter)
router.post('/', authenticate, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const { interviewId } = req.body;
  if (!interviewId) throw new AppError('interviewId required', 400);

  const app = await Application.findOne({ _id: interviewId, deletedAt: null }).lean();
  if (!app) throw new AppError('Application not found', 404);

  const existing = await VideoRoom.findOne({ interviewId }).lean();
  if (existing) return res.json({ success: true, data: existing });

  const [job, candidate, org] = await Promise.all([
    Job.findById(app.jobId).select('title').lean(),
    Candidate.findById(app.candidateId).select('name').lean(),
    Organization.findById(app.tenantId).select('name').lean(),
  ]);

  const scheduledAt = app.interviewRounds?.slice(-1)[0]?.scheduledAt || new Date();
  const room = await VideoRoom.create({
    interviewId,
    tenantId: app.tenantId,
    jobTitle: job?.title || 'Interview',
    candidateName: candidate?.name || 'Candidate',
    orgName: org?.name || 'TalentNest HR',
    roomToken: genToken(),
    hostToken: genToken(),
    scheduledAt,
    validFrom: new Date(scheduledAt.getTime() - 15 * 60 * 1000),
    validUntil: new Date(scheduledAt.getTime() + 4 * 60 * 60 * 1000),
    hostUserId: String(req.user._id || req.user.id),
    status: 'scheduled',
  });

  res.json({ success: true, data: room });
}));

// GET /api/video-rooms/join/:roomToken — validate room & get metadata (public)
router.get('/join/:roomToken', asyncHandler(async (req, res) => {
  const room = await VideoRoom.findOne({ roomToken: req.params.roomToken }).select('-chatMessages').lean();
  if (!room) throw new AppError('Room not found', 404);
  if (room.status === 'ended') throw new AppError('This meeting has ended', 410);

  const now = new Date();
  if (now < room.validFrom) {
    const msUntil = room.validFrom - now;
    return res.status(425).json({ success: false, error: 'too_early', scheduledAt: room.scheduledAt, msUntil });
  }
  if (now > room.validUntil && room.status !== 'live') {
    throw new AppError('This meeting link has expired', 410);
  }

  res.json({ success: true, data: {
    roomToken: room.roomToken,
    status: room.status,
    jobTitle: room.jobTitle,
    candidateName: room.candidateName,
    orgName: room.orgName,
    scheduledAt: room.scheduledAt,
    validFrom: room.validFrom,
    validUntil: room.validUntil,
    isRecording: room.isRecording,
    activeParticipants: room.participants.filter(p => p.active).length,
  }});
}));

// GET /api/video-rooms/by-interview/:interviewId — get room for an interview
router.get('/by-interview/:interviewId', authenticate, asyncHandler(async (req, res) => {
  const room = await VideoRoom.findOne({ interviewId: req.params.interviewId }).select('-chatMessages').lean();
  if (!room) return res.json({ success: true, data: null });
  res.json({ success: true, data: room });
}));

// GET /api/video-rooms/:roomToken/transcript — get chat transcript (authenticated interviewers/admins only)
router.get('/:roomToken/transcript', authenticate, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const room = await VideoRoom.findOne({ roomToken: req.params.roomToken }).lean();
  if (!room) throw new AppError('Room not found', 404);
  res.json({ success: true, data: { chatMessages: room.chatMessages, startedAt: room.startedAt, endedAt: room.endedAt, participants: room.participants } });
}));

// GET /api/video-rooms/turn-credentials
// Returns time-limited TURN credentials for the caller's session.
// Uses HMAC-SHA1 with a shared secret (same secret configured in coturn).
// Credentials expire after 1 hour — coturn validates and rejects expired ones.
// This endpoint works for both authenticated users AND guests (no auth required —
// the credentials themselves are time-limited so abuse risk is minimal).
router.get('/turn-credentials', asyncHandler(async (req, res) => {
  const turnSecret = process.env.TURN_SECRET;
  const turnHost   = process.env.TURN_HOST;   // e.g. "turn.yourdomain.com"
  const turnPort   = process.env.TURN_PORT || '3478';

  // If TURN server not configured yet, return the public fallback servers
  // so existing calls keep working during transition.
  if (!turnSecret || !turnHost) {
    return res.json({
      success: true,
      iceServers: [
        { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
        { urls: 'stun:stun.cloudflare.com:3478' },
        { urls: 'turn:freestun.net:3479',  username: 'free', credential: 'free' },
        { urls: 'turn:freestun.net:5350',  username: 'free', credential: 'free' },
        { urls: 'turn:openrelay.metered.ca:80',  username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
      ],
      source: 'fallback',
    });
  }

  // HMAC-SHA1 credential generation — industry standard (RFC 5766 + coturn convention)
  const ttl       = 3600; // 1 hour in seconds
  const timestamp = Math.floor(Date.now() / 1000) + ttl;
  const username  = `${timestamp}:talentnest`;          // any string after colon
  const hmac      = crypto.createHmac('sha1', turnSecret);
  hmac.update(username);
  const credential = hmac.digest('base64');

  const iceServers = [
    // STUN (no auth needed)
    { urls: [`stun:${turnHost}:${turnPort}`] },
    { urls: 'stun:stun.l.google.com:19302' },
    // TURN UDP
    { urls: `turn:${turnHost}:${turnPort}`,           username, credential },
    // TURN TCP (fallback for firewalls that block UDP)
    { urls: `turn:${turnHost}:${turnPort}?transport=tcp`, username, credential },
    // TURNS (TLS — most secure, best firewall penetration)
    { urls: `turns:${turnHost}:5349`,                 username, credential },
  ];

  res.json({ success: true, iceServers, username, ttl, source: 'self-hosted' });
}));

module.exports = router;
