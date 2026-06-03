'use strict';
const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const commentSchema = new Schema({
  userId    : { type: Types.ObjectId, ref: 'User', required: true },
  userName  : { type: String, default: '' },
  userAvatar: { type: String, default: '' },
  userRole  : { type: String, default: '' },
  userTitle : { type: String, default: '' },
  content   : { type: String, required: true, maxlength: 1000 },
  createdAt : { type: Date, default: Date.now },
});

const reactionSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', required: true },
  type  : { type: String, enum: ['like', 'celebrate', 'support', 'insightful'], default: 'like' },
}, { _id: false });

const feedPostSchema = new Schema({
  tenantId    : { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
  authorId    : { type: Types.ObjectId, ref: 'User',   required: true },
  authorName  : { type: String, default: '' },
  authorRole  : { type: String, default: '' },
  authorAvatar: { type: String, default: '' },
  authorTitle : { type: String, default: '' },
  content     : { type: String, required: true, maxlength: 3000 },
  images      : [{ type: String }],
  hashtags    : [{ type: String }],
  reactions   : [reactionSchema],
  comments    : [commentSchema],
  postType    : {
    type   : String,
    enum   : ['update', 'achievement', 'announcement', 'milestone', 'hiring', 'resource', 'tip', 'feedback', 'question'],
    default: 'update',
  },
  isPinned : { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

feedPostSchema.index({ tenantId: 1, createdAt: -1 });

module.exports = mongoose.model('FeedPost', feedPostSchema);
