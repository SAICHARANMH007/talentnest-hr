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
const cloudinary   = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key   : process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

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

const VALID_POST_TYPES = ['update', 'achievement', 'announcement', 'milestone', 'hiring', 'resource', 'tip', 'feedback', 'question'];

// POST /api/social-posts
router.post('/', asyncHandler(async (req, res) => {
  const { content, images, postType, communityId, communitySlug } = req.body;
  if (!content?.trim()) throw new AppError('Post content is required.', 400);
  const safeType = VALID_POST_TYPES.includes(postType) ? postType : 'update';
  const u = req.user;
  const post = await FeedPost.create({
    tenantId    : u.tenantId,
    authorId    : u._id || u.id,
    authorName  : u.name   || '',
    authorRole  : u.role   || '',
    authorAvatar: u.avatarUrl || '',
    authorTitle : u.title  || roleTitle(u.role),
    content     : content.trim(),
    images      : Array.isArray(images) ? images.slice(0, 4) : [],
    hashtags    : extractHashtags(content),
    postType    : safeType,
    ...(communityId ? { communityId, communitySlug: communitySlug || '' } : {}),
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
  res.json({ success: true, reactions: post.reactions });
}));

// POST /api/social-posts/:id/comment
router.post('/:id/comment', asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) throw new AppError('Comment content is required.', 400);
  const post = await FeedPost.findOne({ _id: req.params.id, tenantId: req.user.tenantId, isDeleted: false });
  if (!post) throw new AppError('Post not found.', 404);
  const u = req.user;
  post.comments.push({
    userId    : u._id || u.id,
    userName  : u.name   || '',
    userAvatar: u.avatarUrl || '',
    userRole  : u.role   || '',
    userTitle : u.title  || roleTitle(u.role),
    content   : content.trim(),
    createdAt : new Date(),
  });
  await post.save();
  res.json({ success: true, comment: post.comments[post.comments.length - 1] });
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
  const report = await PostReport.findById(req.params.reportId);
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
  const report = await PostReport.findById(req.params.reportId);
  if (!report) throw new AppError('Report not found.', 404);

  await FeedPost.findByIdAndUpdate(report.postId, { isDeleted: true });
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
router.post('/upload-image', upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No image provided.', 400);
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'talentnest/feed', resource_type: 'image', transformation: [{ width: 1200, crop: 'limit', quality: 'auto:good' }] },
      (err, r) => err ? reject(err) : resolve(r)
    );
    stream.end(req.file.buffer);
  });
  res.json({ success: true, url: result.secure_url });
}));

module.exports = router;
