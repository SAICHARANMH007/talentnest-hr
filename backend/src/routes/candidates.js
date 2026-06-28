'use strict';
const express        = require('express');
const router         = express.Router();
const multer         = require('multer');
const pdfParse       = require('pdf-parse');
const ExcelJS        = require('exceljs');
const Candidate      = require('../models/Candidate');
const User           = require('../models/User');
const Application    = require('../models/Application');
const AuditLog       = require('../models/AuditLog');
const { authMiddleware } = require('../middleware/auth');
const { tenantGuard } = require('../middleware/tenantGuard');
const { allowRoles } = require('../middleware/rbac');
const { getPagination, paginatedResponse } = require('../middleware/paginate');
const asyncHandler   = require('../utils/asyncHandler');
const AppError       = require('../utils/AppError');
const logger         = require('../middleware/logger');
const { parseResume: parseResumeUtil } = require('../utils/resumeParser');
const { syncProfile } = require('../utils/syncProfile');
const { phoneSearchRegex } = require('../utils/phoneSearch');

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
    const isSuperAdmin = req.user.role === 'super_admin';
    const filter = isSuperAdmin ? { deletedAt: null } : { tenantId: req.user.tenantId, deletedAt: null };
    if (req.query.search?.trim()) {
      const s = escRe(req.query.search.trim());
      const phoneRe = phoneSearchRegex(req.query.search.trim());
      filter.$or = [
        { name:  { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
        { phone: { $regex: s, $options: 'i' } },
        ...(phoneRe ? [{ phone: phoneRe }] : []),
      ];
    }
    if (req.query.source) filter.source = req.query.source;

    // Invitation Status Filter (accountRequestSent tracking)
    if (req.query.inviteStatus === 'sent') {
      filter.accountRequestSent = true;
    } else if (req.query.inviteStatus === 'pending') {
      filter.accountRequestSent = { $ne: true };
      filter.userId = null; // Only show guest users who haven't registered
    }

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

// GET /api/candidates/search — MUST be before /:id or Express shadows it
router.get('/search', authMiddleware, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req, { limit: 50 });
  const andClauses = [{ deletedAt: null }];

  if (req.query.skills) {
    const skills = String(req.query.skills).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    if (skills.length) {
      andClauses.push({ skills: { $in: skills.map(s => new RegExp(escRe(s), 'i')) } });
    }
  }

  if (req.query.experienceLevel) {
    const lvlMap = { fresher: [0,1], junior: [1,3], mid: [3,6], senior: [6,12], lead: [10,60] };
    const range = lvlMap[req.query.experienceLevel.toLowerCase()];
    if (range) andClauses.push({ experience: { $gte: range[0], $lte: range[1] } });
  }

  if (req.query.minExperience || req.query.maxExperience) {
    const expFilter = {};
    if (req.query.minExperience) expFilter.$gte = Number(req.query.minExperience);
    if (req.query.maxExperience) expFilter.$lte = Number(req.query.maxExperience);
    andClauses.push({ experience: expFilter });
  }

  if (req.query.location) {
    andClauses.push({ location: { $regex: escRe(req.query.location.trim()), $options: 'i' } });
  }

  if (req.query.noticePeriod) {
    const npMap = { immediate: [0,3], '15days': [1,15], '30days': [15,35], '60days': [35,65], '90days': [65,95] };
    const range = npMap[req.query.noticePeriod];
    if (range) andClauses.push({ noticePeriodDays: { $gte: range[0], $lte: range[1] } });
  }

  if (req.query.jobType) {
    const jt = escRe(req.query.jobType);
    andClauses.push({ $or: [
      { availability: { $regex: jt, $options: 'i' } },
      { candidateStatus: { $regex: jt, $options: 'i' } },
      { additionalDetails: { $regex: jt, $options: 'i' } },
    ]});
  }

  if (req.query.keyword) {
    const kw = new RegExp(escRe(req.query.keyword.trim()), 'i');
    andClauses.push({ $or: [
      { name: kw }, { title: kw }, { currentCompany: kw },
      { skills: kw }, { summary: kw }, { email: kw },
    ]});
  }

  const filter = andClauses.length === 1 ? andClauses[0] : { $and: andClauses };

  const [data, total] = await Promise.all([
    Candidate.find(filter)
      .select('_id name email phone title currentCompany skills experience location noticePeriodDays availability candidateStatus resumeUrl photoUrl')
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Candidate.countDocuments(filter),
  ]);
  const normalized = data.map(c => ({
    ...c,
    id          : c._id?.toString(),
    skills      : Array.isArray(c.skills) ? c.skills : [],
    noticePeriod: c.noticePeriodDays ? `${c.noticePeriodDays} days` : (c.availability || ''),
  }));
  res.json(paginatedResponse(normalized, total, limit, page));
}));

// GET /api/candidates/find-duplicates — MUST be before /:id or Express shadows it
router.get('/find-duplicates', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const emailGroups = await Candidate.aggregate([
    { $match: { tenantId, deletedAt: null, email: { $exists: true, $ne: null, $ne: '' } } },
    { $group: { _id: { $toLower: '$email' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } },
  ]);

  const phoneGroups = await Candidate.aggregate([
    { $match: { tenantId, deletedAt: null, phone: { $exists: true, $ne: null, $ne: '' } } },
    { $group: { _id: { name: { $toLower: '$name' }, phone: '$phone' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } },
  ]);

  const allIdSets = [...emailGroups, ...phoneGroups].map(g => g.ids.map(String));
  const merged = [];
  const seen = new Set();
  for (const set of allIdSets) {
    const key = set.slice().sort().join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(set);
  }

  const groups = await Promise.all(merged.slice(0, 50).map(async (ids) => {
    const candidates = await Candidate.find({ _id: { $in: ids } })
      .select('name email phone title location currentCompany resumeUrl photoUrl createdAt parsedProfile')
      .lean();
    return candidates;
  }));

  res.json({ success: true, data: groups.filter(g => g.length > 1) });
}));

// GET /api/candidates/:id — single candidate
router.get('/:id', ...guard,
  allowRoles('admin', 'super_admin', 'recruiter'),
  asyncHandler(async (req, res) => {
    const baseFilter = { _id: req.params.id, deletedAt: null };
    let candidate = null;

    if (req.user.role !== 'super_admin') {
      // Fast path: same-tenant candidate (most common case)
      candidate = await Candidate.findOne({ ...baseFilter, tenantId: req.user.tenantId }).lean();

      if (!candidate) {
        // Cross-tenant path: platform candidates self-apply with their own tenantId,
        // but the Application is stored under the job's tenantId (recruiter's tenant).
        // If this recruiter has an application referencing this candidateId, allow the lookup.
        const hasApp = await Application.exists({
          candidateId: req.params.id,
          tenantId: req.user.tenantId,
          deletedAt: null,
        });
        if (hasApp) {
          candidate = await Candidate.findOne(baseFilter).lean();
        }
      }
    } else {
      candidate = await Candidate.findOne(baseFilter).lean();
    }

    if (!candidate) throw new AppError('Candidate not found.', 404);

    AuditLog.create({
      tenantId: req.user.tenantId,
      userId  : req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action  : 'VIEW_CANDIDATE_PII',
      entity  : 'Candidate',
      entityId: String(candidate._id),
      details : { candidateName: candidate.name, candidateEmail: candidate.email },
      ip      : req.ip,
      userAgent: req.get('user-agent'),
    }).catch(() => {});

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

    // Sync to User collection if account exists
    if (candidate.email) {
      await syncProfile(candidate.email, req.body, candidate.tenantId);
    }

    res.status(201).json({ success: true, data: { ...candidate.toObject(), id: candidate._id.toString() } });

    // Auto-create company community for this candidate's current company
    const companyRaw = candidate.currentCompany || (() => {
      try {
        const wh = JSON.parse(candidate.workHistory || '[]');
        const cur = wh.find(w => w.current) || wh[wh.length - 1];
        return cur?.company || '';
      } catch { return ''; }
    })();
    if (companyRaw) {
      require('../services/companyCommunity')
        .ensureOneCompanyCommunity(companyRaw, req.user.id, req.user.tenantId)
        .catch(() => {});
    }
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
    if (typeof updates.phone === 'string') {
      updates.phone = updates.phone.replace(/\s+/g, '');
      // Never clear an existing phone number with an empty string — skip the update if blank
      if (updates.phone === '') {
        const existing = await Candidate.findOne({ _id: req.params.id, deletedAt: null }).select('phone').lean();
        if (existing?.phone) delete updates.phone; // keep existing phone
      }
    }

    // Enforce linkedin.com/in/ prefix
    if (updates.linkedinUrl && !/^https?:\/\/(www\.)?linkedin\.com\/in\//i.test(updates.linkedinUrl)) {
      throw new AppError('LinkedIn URL must start with https://linkedin.com/in/', 400);
    }

    const filter = { _id: req.params.id, deletedAt: null };
    if (req.user.role !== 'super_admin') filter.tenantId = req.user.tenantId;

    let candidate = await Candidate.findOneAndUpdate(
      filter,
      { $set: updates },
      { new: true }
    );

    if (!candidate && req.user.role !== 'super_admin') {
      // Cross-tenant path: self-applied platform candidates have their own tenantId,
      // but the recruiter has an Application referencing that Candidate._id.
      // Mirror the same permission check used by GET /api/candidates/:id.
      const hasApp = await Application.exists({
        candidateId: req.params.id,
        tenantId: req.user.tenantId,
        deletedAt: null,
      });
      if (hasApp) {
        candidate = await Candidate.findOneAndUpdate(
          { _id: req.params.id, deletedAt: null },
          { $set: updates },
          { new: true }
        );
      }
    }

    if (!candidate && req.user.role !== 'super_admin') {
      // Last-resort fallback: req.params.id might be a User._id (Talent Match path).
      const user = await User.findById(req.params.id).lean();
      if (user && user.role === 'candidate') {
        candidate = await Candidate.findOneAndUpdate(
          { email: user.email, tenantId: req.user.tenantId, deletedAt: null },
          { $set: updates },
          { new: true }
        );
        // If still not found, the candidate may be cross-tenant too
        if (!candidate) {
          candidate = await Candidate.findOneAndUpdate(
            { email: user.email, deletedAt: null },
            { $set: updates },
            { new: true }
          );
        }
      }
    }

    if (!candidate) throw new AppError('Candidate not found.', 404);

    // Sync changes to User collection if a linked account exists
    if (candidate.email) {
      await syncProfile(candidate.email, updates, candidate.tenantId);
    }

    res.json({ success: true, data: { ...candidate.toObject(), id: candidate._id.toString() } });

    // Auto-create community if company name was set or changed
    if (updates.currentCompany) {
      require('../services/companyCommunity')
        .ensureOneCompanyCommunity(updates.currentCompany, req.user.id, candidate.tenantId)
        .catch(() => {});
    }
  })
);

// DELETE /api/candidates/:id — soft delete
router.delete('/:id', ...guard,
  allowRoles('admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const isSuperAdmin = req.user.role === 'super_admin';
    const delFilter = isSuperAdmin
      ? { _id: req.params.id, deletedAt: null }
      : { _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null };
    const candidate = await Candidate.findOneAndUpdate(
      delFilter,
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
        const { uploadBuffer } = require('../utils/cloudinaryUpload');
        const uploadResult = await uploadBuffer(req.file.buffer, { resource_type: 'raw', folder: 'talentnest/resumes', format: 'pdf' });
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

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new AppError('File is empty or has no sheets.', 400);

    // Build rows as objects keyed by the header row values
    const headers = [];
    worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNum) => {
      headers[colNum] = String(cell.value ?? '');
    });
    const rows = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const obj = {};
      headers.forEach((header, colNum) => { if (header) obj[header] = row.getCell(colNum).value ?? ''; });
      rows.push(obj);
    });

    if (!rows.length) throw new AppError('File is empty or has no data rows.', 400);

    const results = { created: 0, skipped: 0, errors: [] };
    const bulkCompanyNames = new Set(); // collect for community creation after loop

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

        const currentCompany = (row.currentCompany || row.current_company || row.company || row.Company || '').toString().trim();

        await Candidate.create({
          tenantId: req.user.tenantId,
          name,
          email,
          phone: (row.phone || row.Phone || '').toString().trim(),
          location: (row.location || row.Location || '').toString().trim(),
          source: 'bulk_import',
          currentCompany,
          noticePeriodDays: parseInt(row.noticePeriodDays || row.notice_period_days || 0, 10) || 0,
          willingToRelocate: ['true','yes','1'].includes(String(row.willingToRelocate || row.willing_to_relocate || '').toLowerCase()),
          parsedProfile: { skills, totalExperienceYears: parseInt(row.totalExperienceYears || row.experience_years || 0, 10) || 0 },
        });
        results.created++;
        if (currentCompany) bulkCompanyNames.add(currentCompany);
      } catch (err) {
        results.errors.push({ email, error: err.message });
      }
    }

    logger.audit('Bulk candidate import', req.user.id, req.user.tenantId, { created: results.created, skipped: results.skipped });
    res.json({ success: true, data: results });

    // Auto-create communities for all distinct company names found in the import
    if (bulkCompanyNames.size > 0) {
      const { ensureOneCompanyCommunity } = require('../services/companyCommunity');
      for (const company of bulkCompanyNames) {
        ensureOneCompanyCommunity(company, req.user.id, req.user.tenantId).catch(() => {});
      }
    }
  })
);

// POST /api/candidates/upload-my-resume — candidate self-upload (stores to Cloudinary, updates own resumeUrl)
router.post('/upload-my-resume', authMiddleware, tenantGuard, upload.single('resume'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No resume file provided.', 400);
  if (req.file.mimetype !== 'application/pdf') throw new AppError('Only PDF files are accepted.', 415);

  let resumeUrl = '';
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    const { uploadBuffer } = require('../utils/cloudinaryUpload');
    const result = await uploadBuffer(req.file.buffer, { resource_type: 'raw', folder: 'talentnest/resumes', format: 'pdf', public_id: `resume_${req.user._id || req.user.id}` });
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


// POST /api/candidates/merge — merge multiple candidates into one primary
router.post('/merge', ...guard,
  allowRoles('admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const { primaryId, duplicateIds, fieldOverrides: rawOverrides = {} } = req.body;
    if (!primaryId || !duplicateIds?.length) throw new AppError('primaryId and duplicateIds are required.', 400);
    const FORBIDDEN_OVERRIDE_FIELDS = ['_id', 'tenantId', 'deletedAt', 'mergedInto', '__v'];
    const fieldOverrides = Object.fromEntries(
      Object.entries(rawOverrides).filter(([k]) => !FORBIDDEN_OVERRIDE_FIELDS.includes(k))
    );

    const primary = await Candidate.findOne({ _id: primaryId, tenantId: req.user.tenantId, deletedAt: null });
    if (!primary) throw new AppError('Primary candidate not found.', 404);

    const duplicates = await Candidate.find({ _id: { $in: duplicateIds }, tenantId: req.user.tenantId, deletedAt: null });
    if (!duplicates.length) throw new AppError('No valid duplicate candidates found.', 404);

    // 1. Move all applications from duplicates to primary
    const Application = require('../models/Application');
    await Application.updateMany(
      { candidateId: { $in: duplicateIds }, tenantId: req.user.tenantId },
      { $set: { candidateId: primary._id } }
    );

    // 2. Consolidate skills
    let allSkills = [...(primary.parsedProfile?.skills || [])];
    duplicates.forEach(d => {
      if (d.parsedProfile?.skills) allSkills.push(...d.parsedProfile.skills);
    });
    allSkills = [...new Set(allSkills.map(s => s.toLowerCase().trim()))].filter(Boolean);

    // 3. Update primary record with overrides and consolidated skills
    const updates = {
      ...fieldOverrides,
      'parsedProfile.skills': allSkills,
    };
    // Ensure we don't accidentally overwrite primary with nulls from duplicates unless explicit
    ['phone', 'location', 'currentCompany', 'title', 'resumeUrl', 'photoUrl'].forEach(f => {
      if (!updates[f] && !primary[f]) {
        const found = duplicates.find(d => d[f]);
        if (found) updates[f] = found[f];
      }
    });

    await Candidate.findByIdAndUpdate(primaryId, { $set: updates });

    // 4. Soft-delete duplicates
    await Candidate.updateMany(
      { _id: { $in: duplicateIds } },
      { $set: { deletedAt: new Date(), mergedInto: primary._id } }
    );

    logger.audit('Candidates merged', req.user.id, req.user.tenantId, { primaryId, duplicateIds });
    res.json({ success: true, message: `Successfully merged ${duplicates.length} records into ${primary.name}.` });
  })
);

// GET /api/candidates/:id/suggested-jobs — jobs best matching this candidate
router.get('/:id/suggested-jobs', ...guard, asyncHandler(async (req, res) => {
  const { findSuggestedJobs } = require('../utils/candidateMatchingEngine');
  
  // Security: Candidates can only see their own suggestions.
  // Admins/Recruiters can see suggestions for any candidate in their tenant.
  const candId = req.params.id === 'me' ? req.user.id : req.params.id;
  
  const candFilter = { _id: candId, deletedAt: null };
  if (req.user.role !== 'super_admin' && req.user.role !== 'candidate') {
    candFilter.tenantId = req.user.tenantId;
  } else if (req.user.role === 'candidate') {
    // If candidate, ensure they are requesting THEIR own ID or 'me'
    if (String(candId) !== String(req.user.id)) throw new AppError('Access denied.', 403);
  }

  const candidate = await Candidate.findOne(candFilter).lean();
  if (!candidate) throw new AppError('Candidate not found.', 404);

  const jobs = await findSuggestedJobs(candidate, { limit: 10 });
  res.json({ success: true, data: jobs });
}));

// GET /api/candidates/:id/full-timeline — full CRM timeline across all applications
router.get('/:id/full-timeline', ...guard, asyncHandler(async (req, res) => {
  const candId = req.params.id;
  const tenantId = req.user.tenantId;

  const candLookup = { _id: candId, deletedAt: null };
  if (req.user.role !== 'super_admin') candLookup.tenantId = tenantId;
  let candidate = await Candidate.findOne(candLookup).select('name email phone tags source createdAt').lean();

  // Cross-tenant fallback: platform candidates self-apply with their own tenantId
  // but their Application is stored under the recruiter's tenant. Mirror the same
  // fallback that GET /:id uses so both endpoints are consistent.
  if (!candidate && req.user.role !== 'super_admin') {
    const hasApp = await Application.exists({ candidateId: candId, tenantId, deletedAt: null });
    if (hasApp) {
      candidate = await Candidate.findOne({ _id: candId, deletedAt: null }).select('name email phone tags source createdAt').lean();
    }
  }

  if (!candidate) throw new AppError('Candidate not found.', 404);

  // Super admins can see the full cross-tenant history; other roles only see
  // applications belonging to their own tenant (matches GET /:id behaviour above).
  const appFilter = { candidateId: candId, deletedAt: null };
  if (req.user.role !== 'super_admin') appFilter.tenantId = tenantId;

  const applications = await Application.find(appFilter)
    .populate('jobId', 'title department location')
    .lean();

  const events = [];

  // Profile created event
  events.push({
    type: 'profile_created',
    ts: candidate.createdAt,
    icon: '🧑‍💼',
    color: '#0176D3',
    title: 'Candidate profile created',
    detail: candidate.source ? `Source: ${candidate.source}` : null,
  });

  // Application events
  for (const app of applications) {
    const jobTitle = app.jobId?.title || 'Unknown Job';
    const dept     = app.jobId?.department || '';
    const loc      = app.jobId?.location || '';

    events.push({
      type: 'application',
      ts: app.createdAt,
      icon: '📥',
      color: '#7C3AED',
      title: `Applied — ${jobTitle}`,
      detail: [dept, loc].filter(Boolean).join(' · ') || null,
      appId: app._id,
      jobTitle,
    });

    // Stage history
    (app.stageHistory || []).forEach(h => {
      const stage = h.stage || h.stageId || '';
      if (stage.toLowerCase() === 'applied') return;
      events.push({
        type: 'stage_change',
        ts: h.movedAt || h.changedAt,
        icon: stage === 'Hired' || stage === 'selected' ? '🏆' : stage === 'Rejected' || stage === 'rejected' ? '❌' : stage === 'Offer' || stage === 'offer_extended' ? '📄' : '🔄',
        color: stage === 'Hired' || stage === 'selected' ? '#059669' : stage === 'Rejected' || stage === 'rejected' ? '#BA0517' : '#F59E0B',
        title: `Stage: ${stage}`,
        detail: `${jobTitle}${h.notes ? ' — ' + h.notes : ''}`,
        appId: app._id,
        jobTitle,
      });
    });

    // Interview rounds
    (app.interviewRounds || []).forEach((r, i) => {
      if (r.scheduledAt) {
        const d = new Date(r.scheduledAt);
        events.push({
          type: 'interview',
          ts: r.scheduledAt,
          icon: '📅',
          color: '#F59E0B',
          title: `Interview Round ${i + 1} — ${jobTitle}`,
          detail: `${r.format === 'video' ? '📹 Video' : r.format === 'phone' ? '📞 Phone' : '🏢 In-Person'}${r.interviewerName ? ' with ' + r.interviewerName : ''}`,
          videoLink: r.videoLink || null,
          feedback: r.feedback || null,
          kitScores: r.kitScores || [],
          appId: app._id,
          jobTitle,
        });
      }
    });

    // Feedback
    if (app.feedback?.strengths || app.feedback?.weaknesses || app.feedback?.rating) {
      events.push({
        type: 'feedback',
        ts: app.updatedAt,
        icon: '📋',
        color: '#0176D3',
        title: `Feedback recorded — ${jobTitle}`,
        detail: `Rating: ${app.feedback.rating || 0}/5 · ${app.feedback.recommendation ? '✓ Recommended' : '✕ Not Recommended'}`,
        strengths: app.feedback.strengths,
        weaknesses: app.feedback.weaknesses,
        appId: app._id,
        jobTitle,
      });
    }

    // Offer letter
    if (app.offerLetterId || app.currentStage === 'Offer' || app.currentStage === 'offer_extended') {
      const offerEvent = (app.stageHistory || []).find(h => (h.stage || '').toLowerCase().includes('offer'));
      if (offerEvent) {
        events.push({
          type: 'offer',
          ts: offerEvent.movedAt,
          icon: '🎉',
          color: '#D97706',
          title: `Offer Extended — ${jobTitle}`,
          detail: null,
          appId: app._id,
          jobTitle,
        });
      }
    }
  }

  // Sort by timestamp descending (most recent first)
  events.sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0));

  res.json({ success: true, data: { candidate, applications: applications.length, events } });
}));

module.exports = router;
