'use strict';
const mongoose = require('mongoose');
const { Schema } = mongoose;

const PipelineStatusSchema = new Schema({
  name:      { type: String, required: true, trim: true },
  color:     { type: String, default: '#0176D3' },
  order:     { type: Number, default: 0 },
  isDefault: { type: Boolean, default: false },
}, { _id: true });

const TagSchema = new Schema({
  name:     { type: String, required: true, trim: true },
  category: { type: String, default: 'Candidate' },
  color:    { type: String, default: '#0176D3' },
}, { _id: true });

const RejectionReasonSchema = new Schema({
  text:      { type: String, required: true, trim: true },
  isDefault: { type: Boolean, default: false },
}, { _id: true });

const ScoreCardSchema = new Schema({
  name:     { type: String, required: true, trim: true },
  criteria: [{ type: String }],
  maxScore: { type: Number, default: 10 },
}, { _id: true });

const DocumentTypeSchema = new Schema({
  name:     { type: String, required: true, trim: true },
  required: { type: Boolean, default: false },
}, { _id: true });

const QuestionSchema = new Schema({
  text:       { type: String, required: true, trim: true },
  category:   { type: String, default: 'Technical' },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
}, { _id: true });

const OfferVariableSchema = new Schema({
  key:     { type: String, required: true, trim: true },
  desc:    { type: String, default: '' },
  example: { type: String, default: '' },
}, { _id: true });

const NotificationMessageSchema = new Schema({
  trigger: { type: String, required: true },
  message: { type: String, default: '' },
  channel: { type: String, default: 'Email + In-app' },
}, { _id: true });

const SimpleNameSchema = new Schema({
  name: { type: String, required: true, trim: true },
}, { _id: true });

const OrgCustomizationsSchema = new Schema({
  orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, unique: true, index: true },

  // Collections
  pipelineStatuses:    [PipelineStatusSchema],
  tags:                [TagSchema],
  rejectionReasons:    [RejectionReasonSchema],
  scoreCards:          [ScoreCardSchema],
  documentTypes:       [DocumentTypeSchema],
  questionBank:        [QuestionSchema],
  offerVariables:      [OfferVariableSchema],
  notificationMessages:[NotificationMessageSchema],
  departments:         [SimpleNameSchema],
  locations:           [SimpleNameSchema],
  sources:             [SimpleNameSchema],

  // Singleton objects
  emailSignature: {
    companyName:  { type: String, default: '' },
    tagline:      { type: String, default: '' },
    website:      { type: String, default: '' },
    supportEmail: { type: String, default: '' },
    phone:        { type: String, default: '' },
    linkedIn:     { type: String, default: '' },
    footerNote:   { type: String, default: '' },
  },

  fieldVisibility: {
    type: Map,
    of: Boolean,
    default: () => new Map([
      ['salary', true], ['recruiter_name', true], ['company_name', true],
      ['application_count', true], ['interview_feedback', true], ['offer_details', true],
      ['internal_notes', true], ['candidate_score', true], ['source_tracking', true],
      ['diversity_data', false],
    ]),
  },

  brandColors: {
    primary:   { type: String, default: '#0176D3' },
    secondary: { type: String, default: '#032D60' },
    accent:    { type: String, default: '#10b981' },
    danger:    { type: String, default: '#ef4444' },
    warning:   { type: String, default: '#f59e0b' },
    bgCard:    { type: String, default: '#ffffff' },
    bgPage:    { type: String, default: '#f4f6f8' },
  },

  offerLetterTemplate: {
    // Intro / opening paragraph
    introText: {
      type: String,
      default: 'We are pleased to offer you the position of {{designation}} at {{companyName}}. This letter confirms the terms of your employment as discussed.',
    },
    // Compensation section body
    compensationText: {
      type: String,
      default: 'Your annual Cost to Company (CTC) will be {{ctc}}. The detailed break-up of your compensation will be shared separately.',
    },
    // Joining instructions
    joiningText: {
      type: String,
      default: 'Your date of joining is {{joiningDate}}. Please report to our office at 9:00 AM and bring the required documents listed below.',
    },
    // Terms and conditions (full rich text)
    termsAndConditions: {
      type: String,
      default: '1. This offer is contingent upon successful completion of background verification.\n2. You are expected to maintain strict confidentiality of company information.\n3. The employment is subject to a probation period of 6 months.\n4. Either party may terminate this agreement with 30 days written notice during probation and 60 days thereafter.\n5. You must not engage in any conflicting employment during your tenure.',
    },
    // Footer / closing
    closingText: {
      type: String,
      default: 'We look forward to welcoming you to the team. Please sign and return a copy of this letter as your acceptance. For any queries, contact HR at {{supportEmail}}.',
    },
    // Custom additional clauses (free-form)
    customClauses: {
      type: String,
      default: '',
    },
    // Signatory details defaults
    signatoryTitle:     { type: String, default: 'Head of Human Resources' },
    footerNote:         { type: String, default: 'This is a computer-generated offer letter.' },
  },

}, { timestamps: true });

// Seed defaults if document is new
OrgCustomizationsSchema.statics.getOrCreate = async function(orgId) {
  let doc = await this.findOne({ orgId });
  if (!doc) {
    doc = await this.create({
      orgId,
      pipelineStatuses: [
        { name: 'Applied',            color: '#6366f1', order: 0, isDefault: true },
        { name: 'Screening',          color: '#0176D3', order: 1, isDefault: true },
        { name: 'Phone Interview',    color: '#0891b2', order: 2, isDefault: true },
        { name: 'Technical Round',    color: '#059669', order: 3, isDefault: true },
        { name: 'HR Round',           color: '#d97706', order: 4, isDefault: true },
        { name: 'Offer',              color: '#7c3aed', order: 5, isDefault: true },
        { name: 'Hired',              color: '#065f46', order: 6, isDefault: true },
        { name: 'Rejected',           color: '#dc2626', order: 7, isDefault: true },
      ],
      tags: [
        { name: 'Hot Candidate', category: 'Candidate', color: '#dc2626' },
        { name: 'Passive',       category: 'Candidate', color: '#6366f1' },
        { name: 'Referred',      category: 'Source',    color: '#059669' },
        { name: 'Urgent',        category: 'Priority',  color: '#d97706' },
        { name: 'Remote OK',     category: 'Job',       color: '#0176D3' },
      ],
      rejectionReasons: [
        { text: 'Not enough experience',          isDefault: true },
        { text: 'Skills mismatch',                isDefault: true },
        { text: 'Salary expectations too high',   isDefault: true },
        { text: 'Position filled internally',     isDefault: true },
        { text: 'Candidate withdrew',             isDefault: true },
        { text: 'Failed technical assessment',    isDefault: true },
        { text: 'Cultural fit concerns',          isDefault: true },
        { text: 'Location constraints',           isDefault: true },
        { text: 'Overqualified',                  isDefault: true },
        { text: 'Role on hold',                   isDefault: true },
      ],
      scoreCards: [
        { name: 'Technical Round', criteria: ['Problem Solving', 'Code Quality', 'Communication', 'System Design'], maxScore: 10 },
        { name: 'HR Round',        criteria: ['Culture Fit', 'Motivation', 'Teamwork', 'Expectations'],            maxScore: 5  },
      ],
      documentTypes: [
        { name: 'Resume / CV',            required: true  },
        { name: 'Cover Letter',           required: false },
        { name: 'Aadhar Card',            required: true  },
        { name: 'PAN Card',               required: false },
        { name: 'Experience Letter',      required: false },
        { name: 'Education Certificate',  required: false },
        { name: 'Background Check',       required: false },
      ],
      questionBank: [
        { text: 'Tell me about yourself and your background.',             category: 'Behavioral', difficulty: 'Easy'   },
        { text: 'Describe a challenging project and how you overcame it.', category: 'Behavioral', difficulty: 'Medium' },
        { text: 'Where do you see yourself in 5 years?',                  category: 'Culture Fit',difficulty: 'Easy'   },
      ],
      offerVariables: [
        { key: '{{CANDIDATE_NAME}}', desc: 'Full name of the candidate',     example: 'John Doe'        },
        { key: '{{JOB_TITLE}}',      desc: 'Position title',                 example: 'Senior Developer' },
        { key: '{{START_DATE}}',     desc: 'Expected joining date',          example: '01 May 2026'      },
        { key: '{{SALARY}}',         desc: 'Annual CTC / salary',            example: '₹12,00,000'       },
        { key: '{{COMPANY_NAME}}',   desc: 'Hiring organization name',       example: 'TalentNest HR'    },
        { key: '{{DEPARTMENT}}',     desc: 'Department / team name',         example: 'Engineering'      },
        { key: '{{MANAGER_NAME}}',   desc: 'Reporting manager name',         example: 'Jane Smith'       },
        { key: '{{WORK_LOCATION}}',  desc: 'Office location or Remote',      example: 'Hyderabad / Remote' },
        { key: '{{PROBATION_PERIOD}}', desc: 'Probation duration',           example: '3 months'         },
        { key: '{{OFFER_EXPIRY}}',   desc: 'Offer acceptance deadline',      example: '15 Apr 2026'      },
      ],
      notificationMessages: [
        { trigger: 'Application Received',    message: "Thanks for applying! We've received your application and will review it shortly.", channel: 'Email + In-app' },
        { trigger: 'Interview Scheduled',     message: 'Your interview has been scheduled. Please check your calendar for details.',        channel: 'Email + In-app' },
        { trigger: 'Application Shortlisted', message: "Congratulations! You've been shortlisted for the next round.",                      channel: 'Email + In-app' },
        { trigger: 'Offer Extended',          message: 'We are pleased to extend an offer. Please review the attached offer letter.',       channel: 'Email'         },
        { trigger: 'Application Rejected',    message: 'Thank you for your interest. After careful consideration, we will not be moving forward at this time.', channel: 'Email' },
      ],
    });
  }
  return doc;
};

module.exports = mongoose.model('OrgCustomizations', OrgCustomizationsSchema);
