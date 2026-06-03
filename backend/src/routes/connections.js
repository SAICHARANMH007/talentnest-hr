'use strict';
const express     = require('express');
const router      = express.Router();
const mongoose    = require('mongoose');
const Connection  = require('../models/Connection');
const User        = require('../models/User');
const Candidate   = require('../models/Candidate');
const Application = require('../models/Application');
const { authMiddleware: auth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError    = require('../utils/AppError');

router.use(auth);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const USER_PUBLIC_FIELDS = 'name role title avatarUrl photoUrl location department';

function toId(v) {
  return String(v._id || v.id || v);
}

const toObjId = id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;

// ─── GET /api/connections — accepted connections list ─────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  const uid      = toId(req.user);
  const tenantId = req.user.tenantId;

  const connections = await Connection.find({
    tenantId,
    status: 'accepted',
    $or: [{ fromUserId: uid }, { toUserId: uid }],
  }).lean();

  const peerIds = connections.map(c =>
    String(c.fromUserId) === uid ? c.toUserId : c.fromUserId
  );

  const users = await User.find({
    _id      : { $in: peerIds },
    tenantId,
    deletedAt: null,
  }).select(USER_PUBLIC_FIELDS).lean();

  res.json({ success: true, data: users, total: users.length });
}));

// ─── GET /api/connections/pending — incoming pending requests ─────────────────
router.get('/pending', asyncHandler(async (req, res) => {
  const uid      = toId(req.user);
  const tenantId = req.user.tenantId;

  const requests = await Connection.find({
    tenantId,
    toUserId: uid,
    status  : 'pending',
  }).lean();

  const senderIds = requests.map(r => r.fromUserId);

  const senderMap = {};
  const senders   = await User.find({
    _id      : { $in: senderIds },
    tenantId,
    deletedAt: null,
  }).select(USER_PUBLIC_FIELDS).lean();
  senders.forEach(u => { senderMap[String(u._id)] = u; });

  const data = requests.map(r => ({
    requestId : r._id,
    createdAt : r.createdAt,
    from      : senderMap[String(r.fromUserId)] || null,
  }));

  res.json({ success: true, data, total: data.length });
}));

// ─── GET /api/connections/sent — outgoing pending requests ───────────────────
router.get('/sent', asyncHandler(async (req, res) => {
  const uid      = toId(req.user);
  const tenantId = req.user.tenantId;

  const requests = await Connection.find({
    tenantId,
    fromUserId: uid,
    status    : 'pending',
  }).lean();

  const recipientIds = requests.map(r => r.toUserId);

  const recipientMap = {};
  const recipients   = await User.find({
    _id      : { $in: recipientIds },
    tenantId,
    deletedAt: null,
  }).select(USER_PUBLIC_FIELDS).lean();
  recipients.forEach(u => { recipientMap[String(u._id)] = u; });

  const data = requests.map(r => ({
    requestId: r._id,
    createdAt: r.createdAt,
    to       : recipientMap[String(r.toUserId)] || null,
  }));

  res.json({ success: true, data, total: data.length });
}));

// ─── GET /api/connections/suggestions — smart scored people you may know ──────
router.get('/suggestions', asyncHandler(async (req, res) => {
  const uid      = toId(req.user);
  const tenantId = req.user.tenantId;

  // ── Step 1: exclude already-connected / pending / rejected users ─────────────
  const existing = await Connection.find({
    tenantId,
    $or: [{ fromUserId: uid }, { toUserId: uid }],
  }).select('fromUserId toUserId').lean();

  const excludedIds = new Set([uid]);
  existing.forEach(c => {
    excludedIds.add(String(c.fromUserId));
    excludedIds.add(String(c.toUserId));
  });

  // ── Step 2: load current user's profile for scoring ──────────────────────────
  const me = await User.findById(uid).select('role skills department invitedBy').lean();
  const mySkillSet = new Set((me?.skills || []).map(s => s.toLowerCase().trim()));

  // ── Step 3: mutual connections (friends-of-friends) ───────────────────────────
  const myAccepted = await Connection.find({
    tenantId, status: 'accepted',
    $or: [{ fromUserId: uid }, { toUserId: uid }],
  }).select('fromUserId toUserId').lean();

  const myFriendIds = myAccepted.map(c =>
    String(c.fromUserId) === uid ? String(c.toUserId) : String(c.fromUserId)
  );

  const mutualMap = {}; // peerId → count of mutual connections
  if (myFriendIds.length) {
    const friendsLinks = await Connection.find({
      tenantId, status: 'accepted',
      $or: [
        { fromUserId: { $in: myFriendIds } },
        { toUserId:   { $in: myFriendIds } },
      ],
    }).select('fromUserId toUserId').lean();

    const myFriendSet = new Set(myFriendIds);
    friendsLinks.forEach(c => {
      const a = String(c.fromUserId), b = String(c.toUserId);
      // If one side is a friend of mine and the other is NOT me and NOT my friend
      if (myFriendSet.has(a) && !myFriendSet.has(b) && b !== uid) {
        mutualMap[b] = (mutualMap[b] || 0) + 1;
      }
      if (myFriendSet.has(b) && !myFriendSet.has(a) && a !== uid) {
        mutualMap[a] = (mutualMap[a] || 0) + 1;
      }
    });
  }

  // ── Step 4: same-job applicants (candidates only) ────────────────────────────
  const sameJobUserIdSet = new Set();
  if (me?.role === 'candidate') {
    const myCandidate = await Candidate.findOne({
      userId: uid, tenantId,
    }).select('_id').lean();

    if (myCandidate) {
      const myApps = await Application.find({
        candidateId: myCandidate._id, deletedAt: null,
      }).select('jobId').limit(20).lean();

      const myJobIds = [...new Set(myApps.map(a => String(a.jobId)))];

      if (myJobIds.length) {
        const peerApps = await Application.find({
          jobId: { $in: myJobIds.map(toObjId) },
          candidateId: { $ne: myCandidate._id },
          deletedAt: null,
        }).select('candidateId').limit(100).lean();

        const peerCandIds = [...new Set(peerApps.map(a => String(a.candidateId)))];
        const peerCands   = await Candidate.find({
          _id: { $in: peerCandIds.map(toObjId) },
          tenantId,
          userId: { $exists: true, $ne: null },
        }).select('userId').lean();

        peerCands.forEach(c => sameJobUserIdSet.add(String(c.userId)));
      }
    }
  }

  // ── Step 5: fetch candidate pool (larger than final result) ──────────────────
  const pool = await User.find({
    tenantId,
    deletedAt: null,
    isActive : true,
    _id      : { $nin: [...excludedIds].map(toObjId) },
  }).select(USER_PUBLIC_FIELDS + ' skills department invitedBy').limit(150).lean();

  // ── Step 6: score each candidate ─────────────────────────────────────────────
  const scored = pool.map(u => {
    let score = 0;
    const reasons = [];

    // Invited by me → strongest signal
    if (u.invitedBy && String(u.invitedBy) === uid) {
      score += 12; reasons.push('you_invited');
    }
    // I was invited by them
    if (me?.invitedBy && String(me.invitedBy) === String(u._id)) {
      score += 12; reasons.push('invited_you');
    }
    // Mutual connections
    const mutuals = mutualMap[String(u._id)] || 0;
    if (mutuals) { score += mutuals * 4; reasons.push(`${mutuals}_mutual`); }

    // Applied to same job (candidate → candidate)
    if (sameJobUserIdSet.has(String(u._id))) {
      score += 5; reasons.push('same_job');
    }
    // Same role
    if (me?.role && u.role === me.role) {
      score += 3; reasons.push('same_role');
    }
    // Same department
    if (me?.department && u.department && me.department === u.department) {
      score += 3; reasons.push('same_department');
    }
    // Shared skills
    const sharedSkills = (u.skills || []).filter(s => mySkillSet.has(s.toLowerCase().trim()));
    if (sharedSkills.length) {
      score += sharedSkills.length * 2;
      reasons.push(`${sharedSkills.length}_shared_skills`);
    }

    return {
      ...u,
      skills    : undefined,         // don't expose raw skills array
      invitedBy : undefined,         // don't expose
      _score    : score,
      mutualConnections: mutuals,
      suggestionReason : deriveSuggestionLabel(reasons, sharedSkills),
    };
  });

  scored.sort((a, b) => b._score - a._score);

  const data = scored.slice(0, 15).map(({ _score, ...rest }) => rest);
  res.json({ success: true, data, total: data.length });
}));

function deriveSuggestionLabel(reasons, sharedSkills) {
  if (reasons.includes('you_invited'))    return 'You invited them';
  if (reasons.includes('invited_you'))    return 'They invited you';
  const mutR = reasons.find(r => r.endsWith('_mutual'));
  if (mutR) {
    const n = parseInt(mutR, 10);
    return `${n} mutual connection${n !== 1 ? 's' : ''}`;
  }
  if (reasons.includes('same_job'))       return 'Applied to similar roles';
  if (reasons.includes('same_department'))return 'Same department';
  const skillR = reasons.find(r => r.endsWith('_shared_skills'));
  if (skillR) {
    const n = parseInt(skillR, 10);
    return `${n} shared skill${n !== 1 ? 's' : ''}`;
  }
  if (reasons.includes('same_role'))      return 'Same role';
  return 'On TalentNest';
}

// ─── GET /api/connections/search?q= — search users by name/email ─────────────
router.get('/search', asyncHandler(async (req, res) => {
  const { q = '' } = req.query;
  if (q.trim().length < 2) throw new AppError('Search query must be at least 2 characters.', 400);

  const uid      = toId(req.user);
  const tenantId = req.user.tenantId;
  const regex    = new RegExp(q.trim(), 'i');

  const users = await User.find({
    tenantId,
    deletedAt: null,
    _id      : { $ne: uid },
    $or      : [{ name: regex }, { email: regex }, { phone: regex }],
  }).select(USER_PUBLIC_FIELDS + ' email').limit(20).lean();

  // Fetch all connections involving the current user for status resolution
  const userIds = users.map(u => u._id);
  const connections = await Connection.find({
    tenantId,
    $or: [
      { fromUserId: uid, toUserId: { $in: userIds } },
      { toUserId: uid,   fromUserId: { $in: userIds } },
    ],
  }).lean();

  // Build a map: peerId -> connection
  const connMap = {};
  connections.forEach(c => {
    const peerId = String(c.fromUserId) === uid
      ? String(c.toUserId)
      : String(c.fromUserId);
    connMap[peerId] = c;
  });

  const data = users.map(u => {
    const conn = connMap[String(u._id)];
    let connectionStatus = null;
    if (conn) {
      if (conn.status === 'accepted') {
        connectionStatus = 'accepted';
      } else if (conn.status === 'pending') {
        connectionStatus = String(conn.fromUserId) === uid ? 'pending_sent' : 'pending_received';
      }
    }
    return { ...u, connectionStatus };
  });

  res.json({ success: true, data, total: data.length });
}));

// ─── POST /api/connections/sync-contacts ─────────────────────────────────────
router.post('/sync-contacts', asyncHandler(async (req, res) => {
  const uid      = toId(req.user);
  const tenantId = req.user.tenantId;
  const { contacts = [] } = req.body; // [{name?, email?, phone?}]

  if (!Array.isArray(contacts) || contacts.length === 0) {
    return res.json({ success: true, matched: [], unmatched: [] });
  }

  const emails = contacts.map(c => c.email?.toLowerCase().trim()).filter(Boolean);
  const phones = contacts.map(c => c.phone?.replace(/\D/g,'').slice(-10)).filter(Boolean);

  const matchedUsers = await User.find({
    tenantId,
    deletedAt: null,
    _id: { $ne: toObjId(uid) },
    $or: [
      ...(emails.length ? [{ email: { $in: emails } }] : []),
      ...(phones.length ? [{ phone: { $in: phones } }] : []),
    ],
  }).select(USER_PUBLIC_FIELDS + ' email phone').lean();

  // Get existing connections for status
  const matchedIds = matchedUsers.map(u => u._id);
  const existingConns = await Connection.find({
    tenantId,
    $or: [
      { fromUserId: uid, toUserId: { $in: matchedIds } },
      { toUserId: uid, fromUserId: { $in: matchedIds } },
    ],
  }).lean();
  const connMap = {};
  existingConns.forEach(c => {
    const peerId = String(c.fromUserId) === uid ? String(c.toUserId) : String(c.fromUserId);
    connMap[peerId] = c;
  });

  const matchedEmailSet = new Set(matchedUsers.map(u => u.email?.toLowerCase()));
  const matchedPhoneSet = new Set(matchedUsers.map(u => u.phone?.replace(/\D/g,'').slice(-10)));

  const matched = matchedUsers.map(u => {
    const conn = connMap[String(u._id)];
    let connectionStatus = null;
    if (conn) {
      connectionStatus = conn.status === 'accepted' ? 'accepted'
        : conn.status === 'pending' ? (String(conn.fromUserId) === uid ? 'pending_sent' : 'pending_received')
        : null;
    }
    return { ...u, connectionStatus };
  });

  const unmatched = contacts.filter(c => {
    const email = c.email?.toLowerCase().trim();
    const phone = c.phone?.replace(/\D/g,'').slice(-10);
    return (!email || !matchedEmailSet.has(email)) && (!phone || !matchedPhoneSet.has(phone));
  });

  res.json({ success: true, matched, unmatched });
}));

// ─── POST /api/connections/request/:userId — send connection request ──────────
router.post('/request/:userId', asyncHandler(async (req, res) => {
  const uid      = toId(req.user);
  const tenantId = req.user.tenantId;
  const { userId } = req.params;

  if (String(userId) === uid) throw new AppError('You cannot connect with yourself.', 400);

  const target = await User.findOne({ _id: userId, tenantId, deletedAt: null }).lean();
  if (!target) throw new AppError('User not found.', 404);

  const existing = await Connection.findOne({
    tenantId,
    $or: [
      { fromUserId: uid,    toUserId: userId },
      { fromUserId: userId, toUserId: uid    },
    ],
  }).lean();

  if (existing) {
    throw new AppError('A connection request already exists between these users.', 400);
  }

  const connection = await Connection.create({
    tenantId,
    fromUserId: uid,
    toUserId  : userId,
    status    : 'pending',
  });

  res.status(201).json({ success: true, data: connection });
}));

// ─── POST /api/connections/accept/:requestId — accept incoming request ────────
router.post('/accept/:requestId', asyncHandler(async (req, res) => {
  const uid      = toId(req.user);
  const tenantId = req.user.tenantId;

  const connection = await Connection.findOne({
    _id     : req.params.requestId,
    tenantId,
    status  : 'pending',
  });

  if (!connection) throw new AppError('Connection request not found.', 404);
  if (String(connection.toUserId) !== uid) throw new AppError('Not authorized to accept this request.', 403);

  connection.status    = 'accepted';
  connection.updatedAt = new Date();
  await connection.save();

  res.json({ success: true, data: connection });
}));

// ─── POST /api/connections/reject/:requestId — reject incoming request ─────────
router.post('/reject/:requestId', asyncHandler(async (req, res) => {
  const uid      = toId(req.user);
  const tenantId = req.user.tenantId;

  const connection = await Connection.findOne({
    _id     : req.params.requestId,
    tenantId,
    status  : 'pending',
  });

  if (!connection) throw new AppError('Connection request not found.', 404);
  if (String(connection.toUserId) !== uid) throw new AppError('Not authorized to reject this request.', 403);

  connection.status    = 'rejected';
  connection.updatedAt = new Date();
  await connection.save();

  res.json({ success: true, data: connection });
}));

// ─── DELETE /api/connections/remove/:userId — remove accepted connection ──────
router.delete('/remove/:userId', asyncHandler(async (req, res) => {
  const uid      = toId(req.user);
  const tenantId = req.user.tenantId;
  const { userId } = req.params;

  const connection = await Connection.findOne({
    tenantId,
    status: 'accepted',
    $or: [
      { fromUserId: uid,    toUserId: userId },
      { fromUserId: userId, toUserId: uid    },
    ],
  });

  if (!connection) throw new AppError('Connection not found.', 404);

  await connection.deleteOne();

  res.json({ success: true });
}));

// ─── DELETE /api/connections/cancel/:requestId — cancel outgoing pending request
router.delete('/cancel/:requestId', asyncHandler(async (req, res) => {
  const uid      = toId(req.user);
  const tenantId = req.user.tenantId;

  const connection = await Connection.findOne({
    _id       : req.params.requestId,
    tenantId,
    fromUserId: uid,
    status    : 'pending',
  });

  if (!connection) throw new AppError('Pending request not found or you are not the sender.', 404);

  await connection.deleteOne();

  res.json({ success: true });
}));

module.exports = router;
