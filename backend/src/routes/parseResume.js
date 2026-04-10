'use strict';
const express = require('express');
const multer = require('multer');
const { parseResume } = require('../utils/resumeParser');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

/**
 * File → Plain Text extraction remains in the route layer
 * to handle multipart buffers and PDF/DOCX dependencies.
 */
async function extractText(buffer, mimetype, originalname = '') {
  const ext = (originalname.split('.').pop() || '').toLowerCase();

  // PDF
  if (mimetype === 'application/pdf' || ext === 'pdf') {
    try {
      const pdf = require('pdf-parse');
      const data = await pdf(buffer);
      return data.text || '';
    } catch (err) {
      console.error('PDF extraction error:', err.message);
      return '';
    }
  }

  // DOCX / DOC
  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimetype === 'application/msword' ||
    ext === 'docx' || ext === 'doc'
  ) {
    try {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    } catch (err) {
      console.error('DOCX extraction error:', err.message);
      return buffer.toString('utf8');
    }
  }

  // Plain text / RTF / CSV
  return buffer.toString('utf8');
}

/**
 * POST /api/parse-resume
 * Uploads a file, extracts text, parses fields with confidence scoring.
 */
router.post('/', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No resume file uploaded.', 400);

  const text = await extractText(req.file.buffer, req.file.mimetype, req.file.originalname || '');
  if (!text.trim()) {
    throw new AppError('Could not extract text from this file. Please ensure the file is not empty or corrupted.', 422);
  }

  // Call the advanced parser utility
  const { fields, confidence } = parseResume(text);

  res.json({
    success: true,
    data: {
      text: text.slice(0, 10000), // Return sample text for preview
      fields,
      confidence,
    }
  });
}));

module.exports = router;
