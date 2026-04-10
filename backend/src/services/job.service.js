const Job = require('../models/Job');
const Application = require('../models/Application');
const Notification = require('../models/Notification');
const User = require('../models/User');
const mongoose = require('mongoose');
const AppError = require('../utils/AppError');

const normalize = require('../utils/normalize');

/**
 * JobService — Professional Logic for Job Management
 */
class JobService {
  /**
   * Helper: Normalize internal Mongoose IDs to client-friendly strings
   */
  normalize(doc) {
    return normalize(doc);
  }

  /**
   * Fetch Public Jobs (Public browsing)
   */
  async getPublicJobs(query, { skip = 0, limit = 12 }) {
    const filter = { status: 'active' };
    
    if (query.search) {
      filter.$or = [
        { title: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
        { skills: { $regex: query.search, $options: 'i' } },
      ];
    }
    if (query.location) filter.location = { $regex: query.location, $options: 'i' };
    if (query.type)     filter.type     = query.type;
    if (query.urgency)  filter.urgency  = query.urgency;
    if (query.skills)   filter.skills   = { $in: query.skills.split(',') };

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate('orgId', 'name logo industry')
        .select('-assignedRecruiters -createdBy -approvalStatus')
        .sort({ urgency: -1, createdAt: -1 })
        .skip(skip).limit(limit).lean(),
      Job.countDocuments(filter)
    ]);

    return { jobs: jobs.map(j => this.normalize(j)), total };
  }

  /**
   * Fetch Jobs for Management (Admin/Recruiter)
   */
  async getManagementJobs(user, query, { skip = 0, limit = 10 }) {
    const filter = {};
    if (user.role === 'recruiter') filter.assignedRecruiters = user._id;
    else if (user.role === 'admin') filter.orgId = user.orgId;

    if (query.status)  filter.status = query.status;
    if (query.search) {
      filter.$or = [
        { title: { $regex: query.search, $options: 'i' } },
        { companyName: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [jobs, total] = await Promise.all([
      Job.find(filter).populate('orgId', 'name').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Job.countDocuments(filter)
    ]);

    // Aggregate applicant stats in bulk for performance
    const jobIds = jobs.map(j => j._id);
    const [appCounts, hireCounts] = await Promise.all([
      Application.aggregate([
        { $match: { jobId: { $in: jobIds } } },
        { $group: { _id: '$jobId', count: { $sum: 1 } } }
      ]),
      Application.aggregate([
        { $match: { jobId: { $in: jobIds }, stage: { $in: ['offer_extended', 'selected'] } } },
        { $group: { _id: '$jobId', count: { $sum: 1 } } }
      ])
    ]);

    const appMap = Object.fromEntries(appCounts.map(x => [x._id.toString(), x.count]));
    const hireMap = Object.fromEntries(hireCounts.map(x => [x._id.toString(), x.count]));

    const enriched = jobs.map(j => ({
      ...this.normalize(j),
      applicantsCount: appMap[j._id.toString()] || 0,
      selectedCount: hireMap[j._id.toString()] || 0,
    }));

    return { jobs: enriched, total };
  }

  /**
   * Approve/Reject Job
   */
  async handleApproval(jobId, action, reason) {
    if (!['approved', 'rejected'].includes(action)) throw new AppError('Invalid approval action.', 400);
    
    const updates = { approvalStatus: action };
    if (action === 'approved') updates.status = 'active';
    if (action === 'rejected') { 
      updates.status = 'closed'; 
      if (reason) updates.rejectionReason = reason;
    }

    const job = await Job.findByIdAndUpdate(jobId, { $set: updates }, { new: true });
    if (!job) throw new AppError('Job not found.', 404);
    
    return job;
  }

  /**
   * Request Candidates (Recruiter -> Admin)
   */
  async requestCandidates(jobId, requesterId) {
    const job = await Job.findByIdAndUpdate(jobId, {
      $set: { candidateRequestStatus: 'requested', candidateRequestDate: new Date() }
    }, { new: true });
    if (!job) throw new AppError('Job not found.', 404);

    // Notify all Admins in the Org
    const admins = await User.find({ orgId: job.orgId, role: { $in: ['admin', 'super_admin'] } }).select('_id').lean();
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id, orgId: job.orgId, type: 'system',
        title: 'Candidate Request',
        message: `Candidates requested for: ${job.title}`, link: `/admin/jobs/requests`
      });
    }

    return job;
  }

  /**
   * Bulk Assign Candidates to Job (ATOMIC TRANSACTION)
   */
  async assignCandidatesToJob(jobId, candidateIds, assignerId) {
    const job = await Job.findById(jobId).lean();
    if (!job) throw new AppError('Job not found.', 404);

    const session = await mongoose.startSession();
    const createdApps = [];

    try {
      await session.withTransaction(async () => {
        for (const cId of candidateIds) {
          const exists = await Application.findOne({ jobId, candidateId: cId }).session(session);
          if (exists) continue;

          const [app] = await Application.create([{
            jobId, candidateId: cId, orgId: job.orgId,
            stage: 'applied', source: 'Internal Assignment',
            metadata: { assignedBy: assignerId }
          }], { session });

          createdApps.push(app);
        }

        if (job.assignedRecruiters?.length > 0) {
          for (const rId of job.assignedRecruiters) {
            await Notification.create([{
              userId: rId, orgId: job.orgId, type: 'system',
              title: 'Candidates Assigned',
              message: `${createdApps.length} candidates assigned to ${job.title}`,
              link: `/recruiter/pipeline?jobId=${jobId}`
            }], { session });
          }
        }
      });
    } catch (err) {
      throw new AppError(`Bulk assignment failed: ${err.message}`, 500);
    } finally {
      session.endSession();
    }

    return createdApps;
  }

  /**
   * Soft Delete Job (Archive)
   */
  async softDelete(jobId) {
    const job = await Job.findByIdAndUpdate(jobId, {
      $set: { deletedAt: new Date(), status: 'closed' }
    }, { new: true });
    if (!job) throw new AppError('Job not found', 404);
    return job;
  }
}

module.exports = new JobService();
