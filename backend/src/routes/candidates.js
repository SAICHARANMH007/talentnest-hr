'use strict';
const express        = require('express');
const router         = express.Router();
const multer         = require('multer');
const pdfParse       = require('pdf-parse');
const XLSX           = require('xlsx');
const Candidate      = require('../models/Candidate');
const { authMiddleware } = require('../middleware/auth');
const { tenantGuard } = require('../middleware/tenantGuard');
const { allowRoles } = require('../middleware/rbac');
const { getPagination, paginatedResponse } = require('../middleware/paginate');
const asyncHandler   = require('../utils/asyncHandler');
const AppError       = require('../utils/AppError');
const logger         = require('../middleware/logger');
const { parseResume: parseResumeUtil } = require('../utils/resumeParser');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/** Escape regex special chars to prevent ReDoS on user-supplied search strings */
function escRe(s) { return String(s).slice(0, 200).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

const parseUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

const guard  = [authMiddleware, tenantGuard];

// ── PDF Parsing helpers ───────────────────────────────────────────────────────

const SKILL_KEYWORDS = [
  'javascript','typescript','python','java','c++','c#','go','rust','ruby','php','swift','kotlin',
  'react','vue','angular','node','express','django','flask','fastapi','spring','laravel',
  'mongodb','postgresql','mysql','redis','elasticsearch','dynamodb',
  'aws','gcp','azure','docker','kubernetes','terraform','ci/cd','git',
  'html','css','sass','tailwind','graphql','rest','sql','nosql',
  'machine learning','deep learning','tensorflow','pytorch','pandas','numpy',
  'figma','sketch','photoshop','illustrator',
  'agile','scrum','kanban','jira','confluence',
];

function extractSkills(text) {
  const lower = text.toLowerCase();
  return [...new Set(SKILL_KEYWORDS.filter(s => lower.includes(s)))];
}

function extractEmail(text) {
  const m = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return m ? m[0] : null;
}

function extractPhone(text) {
  const m = text.match(/(\+?\d[\d\s\-().]{7,}\d)/);
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

function extractName(text) {
  // First non-empty line is usually the name
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  return lines[0] || null;
}

function extractTotalExperienceYears(text) {
  const m = text.match(/(\d+)\s*\+?\s*years?\s+(?:of\s+)?(?:work\s+)?experience/i);
  return m ? parseInt(m[1], 10) : 0;
}

async function parsePDF(buffer) {
  const data = await pdfParse(buffer);
  const text = data.text || '';
  return {
    rawText: text,
    name:    extractName(text),
    email:   extractEmail(text),
    phone:   extractPhone(text),
    skills:  extractSkills(text),
    totalExperienceYears: extractTotalExperienceYears(text),
  };
}

// ── ROUTES ────────────────────────────────────────────────────────────────────

// GET /api/candidates — list (tenant-scoped, paginated)
router.get('/', ...guard,
  allowRoles('admin', 'super_admin', 'recruiter'),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    const filter = { tenantId: req.user.tenantId, deletedAt: null };
    if (req.query.search?.trim()) {
      const s = escRe(req.query.search.trim());
      filter.$or = [
        { name:  { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
      ];
    }
    if (req.query.source) filter.source = req.query.source;

    const [candidates, total] = await Promise.all([
      Candidate.find(filter).select('-__v').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Candidate.countDocuments(filter),
    ]);

    const result = candidates.map(c => ({ ...c, id: c._id?.toString(), skills: Array.isArray(c.parsedProfile?.skills) ? c.parsedProfile.skills : [] }));
    res.json(paginatedResponse(result, total, limit, page));
  })
);

// POST /api/candidates/parse-resume — parse resume file and return extracted fields
router.post('/parse-resume', ...guard,
  allowRoles('admin', 'super_admin', 'recruiter'),
  parseUpload.single('resume'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('No resume file provided.', 400);

    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (!allowed.includes(req.file.mimetype)) {
      throw new AppError('Only PDF, DOCX, or TXT files are accepted.', 415);
    }

    const result = await parseResumeUtil(req.file.buffer, req.file.mimetype);
    logger.audit('Resume parsed', req.user.id, req.user.tenantId, {
      fileName: req.file.originalname,
      fieldsFound: Object.keys(result.fields).filter(k => {
        const v = result.fields[k];
        return v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
      }).length,
    });

    res.json({ success: true, data: result });
  })
);

// GET /api/candidates/:id — single candidate
router.get('/:id', ...guard,
  allowRoles('admin', 'super_admin', 'recruiter'),
  asyncHandler(async (req, res) => {
    const filter = { _id: req.params.id, deletedAt: null };
    if (req.user.role !== 'super_admin') filter.tenantId = req.user.tenantId;
    const candidate = await Candidate.findOne(filter).lean();
    if (!candidate) throw new AppError('Candidate not found.', 404);
    res.json({ success: true, data: { ...candidate, id: candidate._id?.toString() } });
  })
);

// POST /api/candidates — manual create
router.post('/', ...guard,
  allowRoles('admin', 'super_admin', 'recruiter'),
  asyncHandler(async (req, res) => {
    const { name, email, phone, skills, location, noticePeriodDays, willingToRelocate, currentSalary, expectedSalary, source } = req.body;
    if (!name || !email) throw new AppError('name and email are required.', 400);

    const exists = await Candidate.findOne({ email: email.toLowerCase().trim(), tenantId: req.user.tenantId, deletedAt: null });
    if (exists) throw new AppError('A candidate with this email already exists.', 409);

    const candidate = await Candidate.create({
      tenantId: req.user.tenantId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || '',
      location: location || '',
      noticePeriodDays: noticePeriodDays || 0,
      willingToRelocate: !!willingToRelocate,
      currentSalary: currentSalary || 0,
      expectedSalary: expectedSalary || 0,
      source: source || 'manual',
      parsedProfile: {
        skills: Array.isArray(skills) ? skills.map(s => String(s).toLowerCase().trim()) : [],
        totalExperienceYears: req.body.totalExperienceYears || 0,
      },
    });

    logger.audit('Candidate created', req.user.id, req.user.tenantId, { candidateId: candidate._id });
    res.status(201).json({ success: true, data: { ...candidate.toObject(), id: candidate._id.toString() } });
  })
);

// PATCH /api/candidates/:id — update candidate
router.patch('/:id', ...guard,
  allowRoles('admin', 'super_admin', 'recruiter'),
  asyncHandler(async (req, res) => {
    const forbidden = ['tenantId', '_id'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => !forbidden.includes(k)));

    if (updates['parsedProfile.skills'] !== undefined) {
      updates['parsedProfile.skills'] = Array.isArray(updates['parsedProfile.skills'])
        ? updates['parsedProfile.skills'].map(s => String(s).toLowerCase().trim()) : [];
    }

    // Sanitize phone (remove spaces that break SMS/validation)
    if (typeof updates.phone === 'string') updates.phone = updates.phone.replace(/\s+/g, '');

    // Enforce linkedin.com/in/ prefix
    if (updates.linkedinUrl && !/^https?:\/\/(www\.)?linkedin\.com\/in\//i.test(updates.linkedinUrl)) {
      throw new AppError('LinkedIn URL must start with https://linkedin.com/in/', 400);
    }

    const filter = { _id: req.params.id, deletedAt: null };
    if (req.user.role !== 'super_admin') filter.tenantId = req.user.tenantId;

    const candidate = await Candidate.findOneAndUpdate(
      filter,
      { $set: updates },
      { new: true }
    );
    if (!candidate) throw new AppError('Candidate not found.', 404);

    res.json({ success: true, data: { ...candidate.toObject(), id: candidate._id.toString() } });
  })
);

// DELETE /api/candidates/:id — soft delete
router.delete('/:id', ...guard,
  allowRoles('admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const candidate = await Candidate.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true }
    );
    if (!candidate) throw new AppError('Candidate not found.', 404);

    logger.audit('Candidate archived', req.user.id, req.user.tenantId, { candidateId: candidate._id });
    res.json({ success: true, message: 'Candidate archived.' });
  })
);

// POST /api/candidates/upload-resume — single PDF upload + parse + Cloudinary store
router.post('/upload-resume', ...guard,
  allowRoles('admin', 'super_admin', 'recruiter'),
  upload.single('resume'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('No resume file provided.', 400);
    if (req.file.mimetype !== 'application/pdf') throw new AppError('Only PDF files are accepted.', 415);

    const parsed = await parsePDF(req.file.buffer);

    // Upload PDF to Cloudinary if credentials are configured
    let uploadedResumeUrl = req.body.resumeUrl || '';
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      try {
        const cloudinary = require('cloudinary').v2;
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key   : process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        });
        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { resource_type: 'raw', folder: 'talentnest/resumes', format: 'pdf' },
            (err, result) => err ? reject(err) : resolve(result)
          );
          stream.end(req.file.buffer);
        });
        uploadedResumeUrl = uploadResult.secure_url;
      } catch (e) {
        console.error('Cloudinary resume upload failed (non-fatal):', e.message);
      }
    }

    // Upsert by email if extractable
    let candidate = null;
    if (parsed.email) {
      candidate = await Candidate.findOne({ email: parsed.email, tenantId: req.user.tenantId, deletedAt: null });
    }

    if (candidate) {
      candidate.resumeUrl = uploadedResumeUrl || candidate.resumeUrl;
      candidate.parsedProfile = {
        ...candidate.parsedProfile,
        skills: [...new Set([...(candidate.parsedProfile?.skills || []), ...parsed.skills])],
        totalExperienceYears: parsed.totalExperienceYears || candidate.parsedProfile?.totalExperienceYears || 0,
      };
      await candidate.save();
    } else {
      candidate = await Candidate.create({
        tenantId: req.user.tenantId,
        name:  parsed.name  || req.body.name  || 'Unknown',
        email: parsed.email || req.body.email || `unknown_${Date.now()}@talentnest.internal`,
        phone: parsed.phone || '',
        source: 'resume_upload',
        resumeUrl: uploadedResumeUrl || '',
        parsedProfile: {
          skills: parsed.skills,
          totalExperienceYears: parsed.totalExperienceYears,
        },
      });
    }

    logger.audit('Resume uploaded & parsed', req.user.id, req.user.tenantId, { candidateId: candidate._id, skillCount: parsed.skills.length });
    res.status(201).json({
      success: true,
      data: { ...candidate.toObject(), id: candidate._id.toString() },
      parsed: { name: parsed.name, email: parsed.email, phone: parsed.phone, skills: parsed.skills, totalExperienceYears: parsed.totalExperienceYears },
    });
  })
);

// POST /api/candidates/bulk-import — Excel/CSV import
router.post('/bulk-import', ...guard,
  allowRoles('admin', 'super_admin'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('No file provided.', 400);

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

    if (!rows.length) throw new AppError('File is empty or has no data rows.', 400);

    const results = { created: 0, skipped: 0, errors: [] };

    for (const row of rows) {
      const email = (row.email || row.Email || '').toString().toLowerCase().trim();
      const name  = (row.name  || row.Name  || '').toString().trim();
      if (!email || !name) { results.skipped++; continue; }

      try {
        const exists = await Candidate.findOne({ email, tenantId: req.user.tenantId, deletedAt: null });
        if (exists) { results.skipped++; continue; }

        const rawSkills = row.skills || row.Skills || '';
        const skills = typeof rawSkills === 'string'
          ? rawSkills.split(/[,;]+/).map(s => s.toLowerCase().trim()).filter(Boolean)
          : [];

        await Candidate.create({
          tenantId: req.user.tenantId,
          name,
          email,
          phone: (row.phone || row.Phone || '').toString().trim(),
          location: (row.location || row.Location || '').toString().trim(),
          source: 'bulk_import',
          noticePeriodDays: parseInt(row.noticePeriodDays || row.notice_period_days || 0, 10) || 0,
          willingToRelocate: ['true','yes','1'].includes(String(row.willingToRelocate || row.willing_to_relocate || '').toLowerCase()),
          parsedProfile: { skills, totalExperienceYears: parseInt(row.totalExperienceYears || row.experience_years || 0, 10) || 0 },
        });
        results.created++;
      } catch (err) {
        results.errors.push({ email, error: err.message });
      }
    }

    logger.audit('Bulk candidate import', req.user.id, req.user.tenantId, { created: results.created, skipped: results.skipped });
    res.json({ success: true, data: results });
  })
);

// POST /api/candidates/upload-my-resume — candidate self-upload (stores to Cloudinary, updates own resumeUrl)
router.post('/upload-my-resume', authMiddleware, tenantGuard, upload.single('resume'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No resume file provided.', 400);
  if (req.file.mimetype !== 'application/pdf') throw new AppError('Only PDF files are accepted.', 415);

  let resumeUrl = '';
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    const cloudinary = require('cloudinary').v2;
    cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'raw', folder: 'talentnest/resumes', format: 'pdf', public_id: `resume_${req.user._id || req.user.id}` },
        (err, r) => err ? reject(err) : resolve(r)
      );
      stream.end(req.file.buffer);
    });
    resumeUrl = result.secure_url;
  } else {
    throw new AppError('Resume storage is not configured. Please contact support.', 503);
  }

  // Update User and Candidate records
  const uid = req.user._id || req.user.id;
  const User = require('../models/User');
  await User.findByIdAndUpdate(uid, { $set: { resumeUrl } });
  const cand = await Candidate.findOne({ $or: [{ userId: uid }, { email: req.user.email }], tenantId: req.user.tenantId, deletedAt: null });
  if (cand) { cand.resumeUrl = resumeUrl; await cand.save(); }

  res.json({ success: true, data: { resumeUrl } });
}));

module.exports = router;
