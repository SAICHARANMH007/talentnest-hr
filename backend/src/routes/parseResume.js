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
// Wrap a promise with a timeout — rejects with AppError(408) if too slow
function withTimeout(promise, ms, label = 'Operation') {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new AppError(`${label} timed out after ${ms / 1000}s. Try a smaller file.`, 408)), ms);
    promise.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

router.post('/', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No resume file uploaded.', 400);

  // Large PDFs can hang pdf-parse for 30+ seconds causing upstream 504s.
  // Cap extraction at 25 s so we return a meaningful 408 instead.
  const text = await withTimeout(
    extractText(req.file.buffer, req.file.mimetype, req.file.originalname || ''),
    25000,
    'Resume parsing'
  );

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
