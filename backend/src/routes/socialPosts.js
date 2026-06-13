'use strict';
const express      = require('express');
const router       = express.Router();
const FeedPost     = require('../models/FeedPost');
const PostReport   = require('../models/PostReport');
const User         = require('../models/User');
const { authMiddleware: auth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError     = require('../utils/AppError');
const multer       = require('multer');
const { uploadBuffer } = require('../utils/cloudinaryUpload');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
// Larger limit for feed video/audio uploads
const uploadMedia = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

// GET /api/social-posts/public/:id — no auth required
router.get('/public/:id', asyncHandler(async (req, res) => {
  const post = await FeedPost.findOne({ _id: req.params.id, isDeleted: false }).lean();
  if (!post) throw new AppError('Post not found.', 404);
  const preview = {
    _id          : post._id,
    authorName   : post.authorName,
    authorRole   : post.authorRole,
    authorAvatar : post.authorAvatar,
    authorTitle  : post.authorTitle,
    content      : post.content,
    images       : post.images,
    videos       : post.videos,
    audioUrl     : post.audioUrl,
    hashtags     : post.hashtags,
    postType     : post.postType,
    reactionCount: post.reactions?.length || 0,
    commentCount : post.comments?.length || 0,
    createdAt    : post.createdAt,
    communitySlug: post.communitySlug || null,
  };
  res.json({ success: true, data: preview });
}));

router.use(auth);

function extractHashtags(text) {
  const m = (text || '').match(/#[a-zA-Z0-9_]+/g);
  return m ? [...new Set(m.map(h => h.toLowerCase()))] : [];
}

function roleTitle(role) {
  return { admin: 'HR Administrator', recruiter: 'Talent Acquisition Specialist', candidate: 'Job Seeker', super_admin: 'Platform Admin', superadmin: 'Platform Admin' }[role] || 'TalentNest Member';
}

// Validate & dedupe a list of mentioned userIds, excluding the author themselves
function sanitizeMentions(mentions, selfId) {
  if (!Array.isArray(mentions)) return [];
  const self = String(selfId);
  const seen = new Set();
  return mentions.filter(id => {
    const s = String(id || '');
    if (!/^[a-f0-9]{24}$/i.test(s) || s === self || seen.has(s)) return false;
    seen.add(s);
    return true;
  });
}

// Notify mentioned users (non-blocking)
function notifyMentions(mentionIds, { tenantId, fromUser, link, snippet }) {
  if (!mentionIds.length) return;
  (async () => {
    try {
      const Notification = require('../models/Notification');
      await Notification.insertMany(mentionIds.map(userId => ({
        userId,
        tenantId,
        type   : 'mention',
        title  : 'You were mentioned',
        message: `${fromUser || 'Someone'} mentioned you: "${snippet}"`,
        link,
        read   : false,
      })));
    } catch {}
  })();
}

// GET /api/social-posts?page=1&limit=20&type=update
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type } = req.query;
  const tenantId = req.user.tenantId;
  const skip     = (Math.max(1, parseInt(page)) - 1) * Math.min(50, parseInt(limit));
  const filter   = { tenantId, isDeleted: false };
  if (type) filter.postType = type;

  const [posts, total] = await Promise.all([
    FeedPost.find(filter).sort({ isPinned: -1, createdAt: -1 }).skip(skip).limit(Math.min(50, parseInt(limit))).lean(),
    FeedPost.countDocuments(filter),
  ]);

  res.json({ success: true, data: posts, total, page: parseInt(page), hasMore: skip + posts.length < total });
}));

// GET /api/social-posts/user/:userId
router.get('/user/:userId', asyncHandler(async (req, res) => {
  const posts = await FeedPost.find({ tenantId: req.user.tenantId, authorId: req.params.userId, isDeleted: false })
    .sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: posts });
}));

// GET /api/social-posts/saved/list — posts saved (bookmarked) by the current user
router.get('/saved/list', asyncHandler(async (req, res) => {
  const uid = req.user._id || req.user.id;
  const posts = await FeedPost.find({ tenantId: req.user.tenantId, isDeleted: false, savedBy: uid })
    .sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: posts });
}));

const VALID_POST_TYPES = ['update', 'achievement', 'announcement', 'milestone', 'hiring', 'resource', 'tip', 'feedback', 'question', 'poll'];

// POST /api/social-posts
router.post('/', asyncHandler(async (req, res) => {
  const { content, images, videos, audioUrl, postType, communityId, communitySlug, mentions, jobDetails, resourceLink, poll } = req.body;
  if (!content?.trim()) throw new AppError('Post content is required.', 400);
  const safeType = VALID_POST_TYPES.includes(postType) ? postType : 'update';
  const u = req.user;
  const mentionIds = sanitizeMentions(mentions, u._id || u.id);

  let safePoll;
  if (safeType === 'poll' && poll?.question?.trim() && Array.isArray(poll.options)) {
    const options = poll.options.map(o => (typeof o === 'string' ? o : o?.text || '')).map(t => t.trim()).filter(Boolean).slice(0, 6);
    if (options.length >= 2) {
      const days = Number(poll.durationDays) || 3;
      safePoll = {
        question : poll.question.trim(),
        options  : options.map(text => ({ text, votes: [] })),
        expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      };
    }
  }

  let safeJobDetails;
  if (safeType === 'hiring' && jobDetails && typeof jobDetails === 'object') {
    safeJobDetails = {
      title   : String(jobDetails.title   || '').trim().slice(0, 120),
      company : String(jobDetails.company || '').trim().slice(0, 120),
      location: String(jobDetails.location|| '').trim().slice(0, 120),
      link    : String(jobDetails.link     || '').trim().slice(0, 300),
    };
  }

  const post = await FeedPost.create({
    tenantId    : u.tenantId,
    authorId    : u._id || u.id,
    authorName  : u.name   || '',
    authorRole  : u.role   || '',
    authorAvatar: u.avatarUrl || '',
    authorTitle : u.title  || roleTitle(u.role),
    content     : content.trim(),
    images      : Array.isArray(images) ? images.slice(0, 4) : [],
    videos      : Array.isArray(videos) ? videos.slice(0, 1) : [],
    audioUrl    : typeof audioUrl === 'string' ? audioUrl.slice(0, 500) : '',
    hashtags    : extractHashtags(content),
    mentions    : mentionIds,
    postType    : safeType,
    ...(safeJobDetails ? { jobDetails: safeJobDetails } : {}),
    ...(safeType === 'resource' && resourceLink ? { resourceLink: String(resourceLink).trim().slice(0, 300) } : {}),
    ...(safePoll ? { poll: safePoll } : {}),
    ...(communityId ? { communityId, communitySlug: communitySlug || '' } : {}),
  });

  notifyMentions(mentionIds, {
    tenantId: u.tenantId,
    fromUser: u.name,
    link    : `/app/feed?post=${post._id}`,
    snippet : content.trim().slice(0, 80) + (content.length > 80 ? '…' : ''),
  });

  // If posted in a community, notify other members (up to 20, non-blocking)
  if (communityId) {
    (async () => {
      try {
        const Community = require('../models/Community');
        const Notification = require('../models/Notification');
        const authorId = String(u._id || u.id);
        const community = await Community.findById(communityId).select('name slug memberIds').lean();
        if (!community) return;
        const notifyIds = (community.memberIds || [])
          .filter(id => String(id) !== authorId)
          .slice(0, 20);
        if (!notifyIds.length) return;
        const snippet = content.trim().slice(0, 80) + (content.length > 80 ? '…' : '');
        await Notification.insertMany(notifyIds.map(memberId => ({
          userId  : memberId,
          tenantId: u.tenantId,
          type    : 'system',
          title   : `New post in ${community.name}`,
          message : `${u.name || 'Someone'}: "${snippet}"`,
          link    : `/app/communities/${community.slug}`,
          read    : false,
        })));
      } catch {}
    })();
  }

  // Broadcast new post to all users in the tenant so feeds update in real time
  try {
    const socketRegistry = require('../socket');
    const { emitToTenant } = require('../socket/platformSocket');
    emitToTenant(socketRegistry.getIO(), post.tenantId, 'post:created', post.toObject());
  } catch {}

  res.status(201).json({ success: true, data: post });
}));

// GET /api/social-posts/reported — admin/super_admin only
router.get('/reported', asyncHandler(async (req, res) => {
  const isAdmin     = ['admin', 'super_admin', 'superadmin'].includes(req.user.role);
  if (!isAdmin) throw new AppError('Not authorized.', 403);
  const isSuperAdmin = ['super_admin', 'superadmin'].includes(req.user.role);

  // super_admin sees platform-wide; regular admin sees only their tenant
  const reportFilter = { status: 'pending' };
  if (!isSuperAdmin) reportFilter.tenantId = req.user.tenantId;

  const reports = await PostReport.find(reportFilter)
    .sort({ createdAt: -1 })
    .lean();

  if (!reports.length) return res.json({ success: true, data: [] });

  const postIds = [...new Set(reports.map(r => r.postId))];
  // Exclude already-deleted posts from the view
  const posts   = await FeedPost.find({ _id: { $in: postIds }, isDeleted: false }).lean();
  const postMap = Object.fromEntries(posts.map(p => [String(p._id), p]));

  const grouped = {};
  for (const report of reports) {
    const pid = String(report.postId);
    // Skip reports whose post was already deleted
    if (!postMap[pid]) continue;
    if (!grouped[pid]) grouped[pid] = { post: postMap[pid], reports: [] };
    grouped[pid].reports.push(report);
  }

  res.json({ success: true, data: Object.values(grouped) });
}));

// DELETE /api/social-posts/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  const isSuperAdmin = ['super_admin', 'superadmin'].includes(req.user.role);
  const isAdmin      = ['admin', 'super_admin', 'superadmin'].includes(req.user.role);
  const filter       = isSuperAdmin
    ? { _id: req.params.id }
    : { _id: req.params.id, tenantId: req.user.tenantId };
  const post = await FeedPost.findOne(filter);
  if (!post) throw new AppError('Post not found.', 404);
  const uid = String(req.user._id || req.user.id);
  if (String(post.authorId) !== uid && !isAdmin) throw new AppError('Not authorized.', 403);
  post.isDeleted = true;
  await post.save();

  // Broadcast deletion to all users in the tenant so their feeds update in real time
  try {
    const socketRegistry = require('../socket');
    const { emitToTenant } = require('../socket/platformSocket');
    emitToTenant(socketRegistry.getIO(), post.tenantId, 'post:deleted', { postId: String(post._id) });
  } catch {}

  res.json({ success: true });
}));

// POST /api/social-posts/:id/save — toggle save/bookmark for the current user
router.post('/:id/save', asyncHandler(async (req, res) => {
  const post = await FeedPost.findOne({ _id: req.params.id, tenantId: req.user.tenantId, isDeleted: false });
  if (!post) throw new AppError('Post not found.', 404);
  const uid = String(req.user._id || req.user.id);
  const existing = post.savedBy.findIndex(id => String(id) === uid);
  let saved;
  if (existing >= 0) {
    post.savedBy.splice(existing, 1);
    saved = false;
  } else {
    post.savedBy.push(uid);
    saved = true;
  }
  await post.save();
  res.json({ success: true, saved, savedBy: post.savedBy });
}));

// POST /api/social-posts/:id/react
router.post('/:id/react', asyncHandler(async (req, res) => {
  const { type = 'like' } = req.body;
  if (!['like', 'celebrate', 'support', 'insightful'].includes(type)) throw new AppError('Invalid reaction.', 400);
  const post = await FeedPost.findOne({ _id: req.params.id, tenantId: req.user.tenantId, isDeleted: false });
  if (!post) throw new AppError('Post not found.', 404);
  const uid      = String(req.user._id || req.user.id);
  const existing = post.reactions.findIndex(r => String(r.userId) === uid);
  if (existing >= 0) {
    post.reactions[existing].type === type ? post.reactions.splice(existing, 1) : (post.reactions[existing].type = type);
  } else {
    post.reactions.push({ userId: uid, type });
  }
  await post.save();

  // Broadcast updated reactions to all users in the tenant
  try {
    const socketRegistry = require('../socket');
    const { emitToTenant } = require('../socket/platformSocket');
    emitToTenant(socketRegistry.getIO(), post.tenantId, 'post:reacted', { postId: String(post._id), reactions: post.reactions });
  } catch {}

  res.json({ success: true, reactions: post.reactions });
}));

// POST /api/social-posts/:id/vote — vote on a poll post
router.post('/:id/vote', asyncHandler(async (req, res) => {
  const { optionIndex } = req.body;
  const post = await FeedPost.findOne({ _id: req.params.id, tenantId: req.user.tenantId, isDeleted: false });
  if (!post) throw new AppError('Post not found.', 404);
  if (post.postType !== 'poll' || !post.poll?.options?.length) throw new AppError('This post is not a poll.', 400);
  if (post.poll.expiresAt && post.poll.expiresAt < new Date()) throw new AppError('This poll has closed.', 400);
  const idx = Number(optionIndex);
  if (!Number.isInteger(idx) || idx < 0 || idx >= post.poll.options.length) throw new AppError('Invalid poll option.', 400);

  const uid = String(req.user._id || req.user.id);
  // Remove any existing vote by this user, then add to the chosen option
  post.poll.options.forEach(o => { o.votes = o.votes.filter(v => String(v) !== uid); });
  post.poll.options[idx].votes.push(uid);
  await post.save();

  try {
    const socketRegistry = require('../socket');
    const { emitToTenant } = require('../socket/platformSocket');
    emitToTenant(socketRegistry.getIO(), post.tenantId, 'post:polled', { postId: String(post._id), poll: post.poll });
  } catch {}

  res.json({ success: true, poll: post.poll });
}));

// POST /api/social-posts/:id/comment
router.post('/:id/comment', asyncHandler(async (req, res) => {
  const { content, mentions } = req.body;
  if (!content?.trim()) throw new AppError('Comment content is required.', 400);
  const post = await FeedPost.findOne({ _id: req.params.id, tenantId: req.user.tenantId, isDeleted: false });
  if (!post) throw new AppError('Post not found.', 404);
  const u = req.user;
  const mentionIds = sanitizeMentions(mentions, u._id || u.id);
  post.comments.push({
    userId    : u._id || u.id,
    userName  : u.name   || '',
    userAvatar: u.avatarUrl || '',
    userRole  : u.role   || '',
    userTitle : u.title  || roleTitle(u.role),
    content   : content.trim(),
    mentions  : mentionIds,
    createdAt : new Date(),
  });
  await post.save();
  const newComment = post.comments[post.comments.length - 1];

  notifyMentions(mentionIds, {
    tenantId: u.tenantId,
    fromUser: u.name,
    link    : `/app/feed?post=${post._id}`,
    snippet : content.trim().slice(0, 80) + (content.length > 80 ? '…' : ''),
  });

  // Broadcast new comment to all users in the tenant
  try {
    const socketRegistry = require('../socket');
    const { emitToTenant } = require('../socket/platformSocket');
    emitToTenant(socketRegistry.getIO(), post.tenantId, 'post:commented', { postId: String(post._id), comment: newComment });
  } catch {}

  res.json({ success: true, comment: newComment });
}));

// DELETE /api/social-posts/:postId/comment/:commentId
router.delete('/:postId/comment/:commentId', asyncHandler(async (req, res) => {
  const post = await FeedPost.findOne({ _id: req.params.postId, tenantId: req.user.tenantId, isDeleted: false });
  if (!post) throw new AppError('Post not found.', 404);
  const uid = String(req.user._id || req.user.id);
  const isAdmin = ['admin', 'super_admin', 'superadmin'].includes(req.user.role);
  const idx = post.comments.findIndex(c => String(c._id) === req.params.commentId);
  if (idx < 0) throw new AppError('Comment not found.', 404);
  if (String(post.comments[idx].userId) !== uid && String(post.authorId) !== uid && !isAdmin) throw new AppError('Not authorized.', 403);
  post.comments.splice(idx, 1);
  await post.save();
  res.json({ success: true });
}));

// POST /api/social-posts/:id/report
router.post('/:id/report', asyncHandler(async (req, res) => {
  const VALID_REASONS = ['spam', 'harassment', 'misinformation', 'inappropriate', 'hate_speech', 'other'];
  const { reason, details } = req.body;
  if (!VALID_REASONS.includes(reason)) throw new AppError('Invalid report reason.', 400);

  const post = await FeedPost.findOne({ _id: req.params.id, tenantId: req.user.tenantId, isDeleted: false }).lean();
  if (!post) throw new AppError('Post not found.', 404);

  const reporterId = req.user._id || req.user.id;
  const uid = String(reporterId);
  if (String(post.authorId) === uid) throw new AppError('You cannot report your own post.', 400);

  const existing = await PostReport.findOne({ postId: post._id, reportedBy: reporterId });
  if (existing) return res.json({ success: true, message: 'Already reported.' });

  await PostReport.create({
    postId      : post._id,
    reportedBy  : reporterId,
    reporterName: req.user.name || '',
    reporterRole: req.user.role || '',
    tenantId    : req.user.tenantId,
    reason,
    details: (details || '').trim().slice(0, 500),
  });

  // Notify super_admins non-blocking
  (async () => {
    try {
      const Notification = require('../models/Notification');
      const superAdmins = await User.find({ role: { $in: ['super_admin', 'superadmin'] }, tenantId: req.user.tenantId }).select('_id').lean();
      if (!superAdmins.length) return;
      const REASON_LABEL = { spam: 'Spam', harassment: 'Harassment', misinformation: 'Misinformation', inappropriate: 'Inappropriate Content', hate_speech: 'Hate Speech', other: 'Other' };
      const snippet = (post.content || '').slice(0, 60) + (post.content?.length > 60 ? '…' : '');
      await Notification.insertMany(superAdmins.map(sa => ({
        userId  : sa._id,
        tenantId: req.user.tenantId,
        type    : 'system',
        title   : `Post reported: ${REASON_LABEL[reason]}`,
        message : `${req.user.name || 'A user'} reported a post: "${snippet}"`,
        link    : '/app/reported-posts',
        read    : false,
      })));
    } catch {}
  })();

  res.json({ success: true, message: 'Post reported successfully.' });
}));

// PATCH /api/social-posts/reports/:reportId/dismiss — admin only
router.patch('/reports/:reportId/dismiss', asyncHandler(async (req, res) => {
  const isAdmin = ['admin', 'super_admin', 'superadmin'].includes(req.user.role);
  if (!isAdmin) throw new AppError('Not authorized.', 403);
  const reportFilter = { _id: req.params.reportId };
  if (!['super_admin', 'superadmin'].includes(req.user.role)) reportFilter.tenantId = req.user.tenantId;
  const report = await PostReport.findOne(reportFilter);
  if (!report) throw new AppError('Report not found.', 404);
  report.status     = 'dismissed';
  report.resolvedBy = req.user._id || req.user.id;
  report.resolvedAt = new Date();
  await report.save();
  res.json({ success: true });
}));

// DELETE /api/social-posts/reports/:reportId/delete-post — admin only
router.delete('/reports/:reportId/delete-post', asyncHandler(async (req, res) => {
  const isAdmin = ['admin', 'super_admin', 'superadmin'].includes(req.user.role);
  if (!isAdmin) throw new AppError('Not authorized.', 403);
  const reportFilter = { _id: req.params.reportId };
  if (!['super_admin', 'superadmin'].includes(req.user.role)) reportFilter.tenantId = req.user.tenantId;
  const report = await PostReport.findOne(reportFilter);
  if (!report) throw new AppError('Report not found.', 404);

  await FeedPost.findOneAndUpdate({ _id: report.postId, tenantId: report.tenantId }, { isDeleted: true });
  await PostReport.updateMany({ postId: report.postId }, { status: 'reviewed', resolvedBy: req.user._id || req.user.id, resolvedAt: new Date() });
  res.json({ success: true });
}));

// POST /api/social-posts/seed — create sample posts (safe to run multiple times)
router.post('/seed', asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;

  const existing = await FeedPost.countDocuments({ tenantId });
  if (existing >= 10) return res.json({ success: true, message: 'Seed data already exists.', count: existing });

  const users = await User.find({ tenantId, deletedAt: null }).select('name role title avatarUrl').limit(6).lean();
  if (!users.length) return res.json({ success: false, message: 'No users found.' });

  const POSTS = [
    { content: "Excited to be part of this amazing platform! Looking forward to connecting with everyone here and exploring new opportunities. This is the future of hiring! 🚀\n\n#NewBeginnings #TalentNest #Excited", postType: 'update' },
    { content: "Just wrapped up 3 interviews this week — the scheduling was seamless and feedback came within 24 hours. Shoutout to the whole recruiting team! 🙌\n\n#CandidateExperience #HiringDoneRight", postType: 'achievement' },
    { content: "🎉 Big milestone — we filled all 5 open engineering roles this quarter! Huge thank you to every recruiter who hustled and every candidate who trusted us with their career journey.\n\n#Milestone #TeamWork #Hiring", postType: 'milestone' },
    { content: "Pro tip: tailor your resume for EACH job application. Generic resumes get generic results. Spend 10 extra minutes per application — it pays off every time. 💡\n\n#CareerAdvice #JobSearch #ProTip", postType: 'tip' },
    { content: "We're hiring! 🔥 Looking for passionate Full-Stack Developers who love clean code and great culture. Remote-friendly, competitive package, and a team that actually cares.\n\nDM me or check our jobs page! #OpenRole #Engineering #Hiring", postType: 'hiring' },
    { content: "Officially accepted my offer today! 🎊 This platform made the entire process so transparent and human. From first application to offer letter — exactly how hiring should feel.\n\n#NewJob #Grateful #NextChapter", postType: 'achievement' },
    { content: "Building diverse teams isn't a trend — it's a competitive advantage. We updated our job descriptions this quarter to be more inclusive. Early results: 23% more applicants. 📊\n\n#DEI #InclusiveHiring #Data", postType: 'announcement' },
    { content: "My interview experience at TechCorp was exceptional — they responded within 24 hours, the process was transparent, and the interviewers genuinely cared about fit both ways. That's how it should be.\n\n⭐⭐⭐⭐⭐\n\n#InterviewExperience #CandidateFeedback #GreatCompany", postType: 'feedback' },
    { content: "Our time-to-hire dropped 40% this quarter. The secret? Faster feedback loops and a clear hiring rubric. When the process is clear, everyone moves faster. 🏎️\n\n#HRMetrics #Efficiency #HiringOps", postType: 'milestone' },
    { content: "Has anyone else noticed a rise in salary expectation gaps this year? Candidates are asking for 30-40% more than posted ranges in tech roles. How are you handling this in your offers?\n\nWould love to hear how other recruiters are navigating this 🤔\n\n#HRQuestion #Recruiting #Salaries", postType: 'question' },
    { content: "Resource alert: The best free template for structured interview scorecards that I've ever used. Consistent scoring = fairer decisions = better hires.\n\nLink in our company jobs page under Resources tab!\n\n#InterviewKit #HR #FreeResource", postType: 'resource' },
    { content: "Just hit 100 connections on TalentNest! The quality of professional conversations here is genuinely different — focused on careers, hiring, and real growth. Not noise. 🎯\n\n#Networking #TalentNest #Community", postType: 'achievement' },
  ];

  const REACTION_TYPES = ['like', 'celebrate', 'support', 'insightful'];
  const COMMENTS = [
    'Really helpful, thanks for sharing this! 👏',
    'Congratulations! So well deserved 🎉',
    'Totally agree — this is so important.',
    'Bookmarking this for later. Gold content!',
    'Love this perspective. The community here is great!',
    'This is exactly what I needed to read today. Thank you!',
  ];

  const created = [];
  for (let i = 0; i < POSTS.length; i++) {
    const author = users[i % users.length];
    const daysAgo = Math.floor(i / 2);
    const hoursAgo = (i % 4) * 3 + 1;
    const createdAt = new Date(Date.now() - daysAgo * 86400000 - hoursAgo * 3600000);

    const post = await FeedPost.create({
      tenantId,
      authorId    : author._id,
      authorName  : author.name || 'TalentNest Member',
      authorRole  : author.role || 'candidate',
      authorAvatar: author.avatarUrl || '',
      authorTitle : author.title || roleTitle(author.role),
      ...POSTS[i],
      hashtags    : extractHashtags(POSTS[i].content),
      createdAt,
      updatedAt   : createdAt,
    });

    // Add reactions from other users
    for (const reactor of users.filter(u => String(u._id) !== String(author._id))) {
      if (Math.random() > 0.35) {
        post.reactions.push({ userId: reactor._id, type: REACTION_TYPES[Math.floor(Math.random() * REACTION_TYPES.length)] });
      }
    }

    // Add 0–2 comments from other users
    const commenters = users.filter(u => String(u._id) !== String(author._id)).slice(0, 2);
    for (let ci = 0; ci < commenters.length; ci++) {
      if (Math.random() > 0.45) {
        post.comments.push({
          userId    : commenters[ci]._id,
          userName  : commenters[ci].name || 'Member',
          userAvatar: commenters[ci].avatarUrl || '',
          userRole  : commenters[ci].role || '',
          userTitle : commenters[ci].title || '',
          content   : COMMENTS[(i + ci) % COMMENTS.length],
          createdAt : new Date(createdAt.getTime() + (ci + 1) * 8 * 60000),
        });
      }
    }

    await post.save();
    created.push(post._id);
  }

  res.json({ success: true, message: `Created ${created.length} sample posts.`, count: created.length });
}));

// POST /api/social-posts/upload-image
// Multer error handler must come before asyncHandler so file-too-large returns proper JSON
function handleUpload(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'Image is too large. Maximum size is 10 MB.'
        : err.message || 'File upload error.';
      return res.status(400).json({ success: false, error: msg });
    }
    next();
  });
}

router.post('/upload-image', handleUpload, asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No image provided.', 400);

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.error('[upload-image] Cloudinary env vars missing');
    throw new AppError('Image upload not configured on server.', 503);
  }

  try {
    const result = await uploadBuffer(req.file.buffer, {
      folder: 'talentnest/feed',
      resource_type: 'image',
      transformation: [{ width: 1200, crop: 'limit', quality: 'auto:good' }],
    });
    res.json({ success: true, url: result.secure_url });
  } catch (err) {
    console.error('[upload-image] Cloudinary upload failed:', err.message || err);
    throw new AppError(`Image upload failed: ${err.message || 'Cloudinary error'}`, 502);
  }
}));

// POST /api/social-posts/upload-video
function handleVideoUpload(req, res, next) {
  uploadMedia.single('video')(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'Video is too large. Maximum size is 100 MB.'
        : err.message || 'File upload error.';
      return res.status(400).json({ success: false, error: msg });
    }
    next();
  });
}

router.post('/upload-video', handleVideoUpload, asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No video provided.', 400);

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.error('[upload-video] Cloudinary env vars missing');
    throw new AppError('Video upload not configured on server.', 503);
  }

  try {
    const result = await uploadBuffer(req.file.buffer, {
      folder: 'talentnest/feed',
      resource_type: 'video',
    });
    res.json({ success: true, url: result.secure_url });
  } catch (err) {
    console.error('[upload-video] Cloudinary upload failed:', err.message || err);
    throw new AppError(`Video upload failed: ${err.message || 'Cloudinary error'}`, 502);
  }
}));

// POST /api/social-posts/upload-audio
function handleAudioUpload(req, res, next) {
  uploadMedia.single('audio')(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'Audio is too large. Maximum size is 100 MB.'
        : err.message || 'File upload error.';
      return res.status(400).json({ success: false, error: msg });
    }
    next();
  });
}

router.post('/upload-audio', handleAudioUpload, asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No audio provided.', 400);

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.error('[upload-audio] Cloudinary env vars missing');
    throw new AppError('Audio upload not configured on server.', 503);
  }

  try {
    // Cloudinary treats audio files as 'video' resource type
    const result = await uploadBuffer(req.file.buffer, {
      folder: 'talentnest/feed',
      resource_type: 'video',
    });
    res.json({ success: true, url: result.secure_url });
  } catch (err) {
    console.error('[upload-audio] Cloudinary upload failed:', err.message || err);
    throw new AppError(`Audio upload failed: ${err.message || 'Cloudinary error'}`, 502);
  }
}));

module.exports = router;
