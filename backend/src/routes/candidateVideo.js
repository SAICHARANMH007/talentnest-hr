'use strict';
/**
 * Candidate Video Resume
 * POST /api/candidates/:id/video — upload video to Cloudinary
 */
const express    = require('express');
const router     = express.Router({ mergeParams: true });
const multer     = require('multer');
const cloudinary = require('cloudinary').v2;
const Candidate  = require('../models/Candidate');
const { authMiddleware } = require('../middleware/auth');
const { tenantGuard }    = require('../middleware/tenantGuard');
const asyncHandler       = require('../utils/asyncHandler');
const AppError           = require('../utils/AppError');
const logger = require('../middleware/logger');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key   : process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits : { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) return cb(null, true);
    cb(new Error('Only video files are allowed.'), false);
  },
});

const guard = [authMiddleware, tenantGuard];

// POST /api/candidates/:id/video
router.post('/', ...guard, upload.single('video'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Video file is required.', 400);

  const candidate = await Candidate.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!candidate) throw new AppError('Candidate not found.', 404);

  // Upload to Cloudinary video folder
  const uploadResult = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'candidate-videos', resource_type: 'video' },
      (err, result) => err ? reject(err) : resolve(result)
    );
    stream.end(req.file.buffer);
  });

  candidate.videoResumeUrl = uploadResult.secure_url;
  await candidate.save();

  logger.audit('Video resume uploaded', req.user.id, req.user.tenantId, { candidateId: req.params.id });
  res.json({ success: true, data: { videoResumeUrl: uploadResult.secure_url } });
}));

module.exports = router;
