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
// Returns time-limited TURN/ICE credentials for this session.
//
// Priority order (first configured wins):
//   1. Metered.ca free account  — set METERED_APP_NAME + METERED_API_KEY
//   2. Self-hosted coturn        — set TURN_HOST + TURN_SECRET
//   3. Free public fallback      — works out-of-the-box, no config needed
//
// No auth required — credentials are time-limited (1h) so guests can fetch them.
router.get('/turn-credentials', asyncHandler(async (req, res) => {

  // ── Option 1: Metered.ca (free account — recommended) ──────────────────────
  // Sign up free at app.metered.ca → create app → copy App Name + API Key
  // Add to Render env vars: METERED_APP_NAME=yourapname  METERED_API_KEY=yourkey
  if (process.env.METERED_APP_NAME && process.env.METERED_API_KEY) {
    try {
      const meteredUrl = `https://${process.env.METERED_APP_NAME}.metered.live/api/v1/turn/credentials?apiKey=${process.env.METERED_API_KEY}`;
      const resp = await fetch(meteredUrl, { signal: AbortSignal.timeout(5000) });
      if (resp.ok) {
        const iceServers = await resp.json();
        if (Array.isArray(iceServers) && iceServers.length > 0) {
          // Metered returns plain array — wrap it
          return res.json({ success: true, iceServers, source: 'metered' });
        }
      }
    } catch { /* fall through to next option */ }
  }

  // ── Option 2: Self-hosted coturn (own VPS, free tier Oracle/Fly.io etc.) ───
  // Add to Render env vars: TURN_HOST=your.vps.ip  TURN_SECRET=your_secret
  const turnSecret = process.env.TURN_SECRET;
  const turnHost   = process.env.TURN_HOST;
  const turnPort   = process.env.TURN_PORT || '3478';

  if (turnSecret && turnHost) {
    const ttl       = 3600;
    const timestamp = Math.floor(Date.now() / 1000) + ttl;
    const username  = `${timestamp}:talentnest`;
    const hmac      = crypto.createHmac('sha1', turnSecret);
    hmac.update(username);
    const credential = hmac.digest('base64');

    const iceServers = [
      { urls: [`stun:${turnHost}:${turnPort}`] },
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: `turn:${turnHost}:${turnPort}`,                  username, credential },
      { urls: `turn:${turnHost}:${turnPort}?transport=tcp`,    username, credential },
      { urls: `turns:${turnHost}:5349`,                        username, credential },
    ];
    return res.json({ success: true, iceServers, source: 'self-hosted' });
  }

  // ── Option 3: Free public fallback (no config needed, works immediately) ───
  return res.json({
    success: true,
    iceServers: [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
      { urls: 'stun:stun.cloudflare.com:3478' },
      { urls: 'turn:freestun.net:3479',     username: 'free', credential: 'free' },
      { urls: 'turn:freestun.net:5350',     username: 'free', credential: 'free' },
      { urls: 'turn:openrelay.metered.ca:80',  username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    ],
    source: 'fallback',
  });
}));

module.exports = router;
