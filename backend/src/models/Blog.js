const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  heading: { type: String, default: '' },
  body:    { type: String, default: '' },
}, { _id: false });

const blogSchema = new mongoose.Schema({
  slug:        { type: String, required: true, unique: true, trim: true },
  title:       { type: String, required: true, trim: true },
  category:    { type: String, required: true, trim: true },
  excerpt:     { type: String, required: true, trim: true },
  coverImage:  { type: String, default: '' },
  coverEmoji:  { type: String, default: '📝' },
  accent:      { type: String, default: '#0176D3' },
  tags:        [{ type: String, trim: true }],
  sections:    [sectionSchema],
  readTime:    { type: String, default: '5 min read' },
  published:   { type: Boolean, default: false },
  featured:    { type: Boolean, default: false },
  author:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  authorName:  { type: String, default: 'TalentNest HR' },
  views:       { type: Number, default: 0 },
}, { timestamps: true });

// Auto-generate readTime from sections word count
blogSchema.pre('save', function (next) {
  const totalWords = this.sections.reduce((acc, s) => acc + (s.body || '').split(/\s+/).length, 0);
  const mins = Math.max(1, Math.round(totalWords / 200));
  this.readTime = `${mins} min read`;
  next();
});

module.exports = mongoose.model('Blog', blogSchema);
