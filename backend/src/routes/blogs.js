const express  = require('express');
const router   = express.Router();
const Blog     = require('../models/Blog');
const { authenticate } = require('../middleware/auth');
const { allowRoles }   = require('../middleware/rbac');

// ── PUBLIC: list published blogs (marketing page) ──────────────────────────
router.get('/public', async (req, res) => {
  try {
    const blogs = await Blog.find({ published: true })
      .sort({ createdAt: -1 })
      .select('-sections -__v')
      .lean();
    res.json({ success: true, data: blogs });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── PUBLIC: single blog post by slug ───────────────────────────────────────
router.get('/public/:slug', async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug, published: true }).lean();
    if (!blog) return res.status(404).json({ success: false, message: 'Not found' });
    // Increment views
    Blog.findByIdAndUpdate(blog._id, { $inc: { views: 1 } }).exec();
    res.json({ success: true, data: blog });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── SUPER ADMIN: list all (published + draft) ──────────────────────────────
router.get('/', authenticate, allowRoles('super_admin'), async (req, res) => {
  try {
    const blogs = await Blog.find()
      .sort({ createdAt: -1 })
      .populate('author', 'firstName lastName email')
      .lean();
    res.json({ success: true, data: blogs });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── SUPER ADMIN: get single blog (for editing) ────────────────────────────
router.get('/:id', authenticate, allowRoles('super_admin'), async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).populate('author', 'firstName lastName').lean();
    if (!blog) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: blog });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── SUPER ADMIN: create blog ──────────────────────────────────────────────
router.post('/', authenticate, allowRoles('super_admin'), async (req, res) => {
  try {
    const { title, slug, category, excerpt, coverImage, coverEmoji, accent, tags, sections, published, featured } = req.body;

    // Auto-generate slug if not provided
    const finalSlug = (slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).slice(0, 120);

    // Check duplicate slug
    const existing = await Blog.findOne({ slug: finalSlug });
    if (existing) return res.status(409).json({ success: false, message: 'A blog with this slug already exists' });

    const blog = await Blog.create({
      slug: finalSlug, title, category, excerpt,
      coverImage: coverImage || '',
      coverEmoji: coverEmoji || '📝',
      accent: accent || '#0176D3',
      tags: Array.isArray(tags) ? tags : (tags || '').split(',').map(t => t.trim()).filter(Boolean),
      sections: Array.isArray(sections) ? sections : [],
      published: !!published,
      featured: !!featured,
      author: req.user._id,
      authorName: `${req.user.firstName} ${req.user.lastName}`.trim() || 'TalentNest HR',
    });

    res.status(201).json({ success: true, data: blog });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── SUPER ADMIN: update blog ──────────────────────────────────────────────
router.put('/:id', authenticate, allowRoles('super_admin'), async (req, res) => {
  try {
    const { title, slug, category, excerpt, coverImage, coverEmoji, accent, tags, sections, published, featured } = req.body;

    const updates = {
      title, category, excerpt,
      coverImage: coverImage || '',
      coverEmoji: coverEmoji || '📝',
      accent: accent || '#0176D3',
      tags: Array.isArray(tags) ? tags : (tags || '').split(',').map(t => t.trim()).filter(Boolean),
      sections: Array.isArray(sections) ? sections : [],
      published: !!published,
      featured: !!featured,
    };

    // Only update slug if explicitly provided and changed
    if (slug) {
      const clean = slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const conflict = await Blog.findOne({ slug: clean, _id: { $ne: req.params.id } });
      if (conflict) return res.status(409).json({ success: false, message: 'Slug already in use' });
      updates.slug = clean;
    }

    // Use save() so pre-save hook recalculates readTime
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Not found' });
    Object.assign(blog, updates);
    await blog.save();
    res.json({ success: true, data: blog });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── SUPER ADMIN: toggle publish ───────────────────────────────────────────
router.patch('/:id/publish', authenticate, allowRoles('super_admin'), async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Not found' });
    blog.published = !blog.published;
    await blog.save();
    res.json({ success: true, data: { published: blog.published } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── SUPER ADMIN: delete blog ──────────────────────────────────────────────
router.delete('/:id', authenticate, allowRoles('super_admin'), async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
