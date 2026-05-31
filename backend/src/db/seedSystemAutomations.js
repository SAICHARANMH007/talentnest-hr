'use strict';
/**
 * Seeds the 7 standard system automation templates.
 * Safe to run multiple times — uses upsert by systemKey.
 * Usage: node src/db/seedSystemAutomations.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const connectDB    = require('./connect');
const WorkflowRule = require('../models/WorkflowRule');

const SYSTEM_AUTOMATIONS = [
  {
    systemKey  : 'welcome_on_apply',
    name       : 'Welcome Email on Application',
    description: 'Sends a personalised welcome email to every candidate the moment they apply.',
    category   : 'Communication',
    trigger    : { event: 'candidate_applied', conditions: [] },
    actions    : [{
      type  : 'send_email',
      config: {
        subject: 'We received your application for {{jobTitle}} — {{candidateName}}!',
        body   : '<p>Hi {{candidateName}},</p><p>Thank you for applying for <strong>{{jobTitle}}</strong>. We have received your application and our team will be in touch soon.</p><p>Best regards,<br>The Recruitment Team</p>',
      },
    }],
  },
  {
    systemKey  : 'notify_recruiter_on_apply',
    name       : 'Notify Recruiter on New Application',
    description: 'Pings the assigned recruiter with an in-app notification when a candidate applies.',
    category   : 'Communication',
    trigger    : { event: 'candidate_applied', conditions: [] },
    actions    : [{
      type  : 'notify_recruiter',
      config: {
        title  : 'New Application — {{jobTitle}}',
        message: '{{candidateName}} just applied. Review their profile.',
      },
    }],
  },
  {
    systemKey  : 'shortlisted_notification',
    name       : 'Shortlisted — Notify Candidate',
    description: 'Emails the candidate when they are moved to the Shortlisted stage.',
    category   : 'Pipeline',
    trigger    : {
      event     : 'stage_changed',
      conditions: [{ field: 'stage', operator: 'equals', value: 'Shortlisted' }],
    },
    actions: [{
      type  : 'send_email',
      config: {
        subject: 'Great news, {{candidateName}} — you have been shortlisted!',
        body   : '<p>Hi {{candidateName}},</p><p>Congratulations! You have been shortlisted for <strong>{{jobTitle}}</strong>. Our team will contact you shortly to schedule the next steps.</p>',
      },
    }],
  },
  {
    systemKey  : 'interview_confirmation',
    name       : 'Interview Scheduled — Confirm to Candidate',
    description: 'Sends an email and WhatsApp confirmation when an interview is scheduled.',
    category   : 'Communication',
    trigger    : { event: 'interview_scheduled', conditions: [] },
    actions    : [
      {
        type  : 'send_email',
        config: {
          subject: 'Your interview for {{jobTitle}} is confirmed — {{candidateName}}',
          body   : '<p>Hi {{candidateName}},</p><p>Your interview for <strong>{{jobTitle}}</strong> has been scheduled. Please check your calendar for the details. Best of luck!</p>',
        },
      },
      {
        type  : 'send_whatsapp',
        config: { message: 'Hi {{candidateName}}, your interview for {{jobTitle}} is confirmed. Check your email for details. Good luck! 🎯' },
      },
    ],
  },
  {
    systemKey  : 'offer_not_signed_reminder',
    name       : 'Offer Not Signed — Reminder',
    description: 'Reminds candidates who have not yet signed their offer letter.',
    category   : 'Offer',
    trigger    : { event: 'offer_not_signed', conditions: [] },
    actions    : [
      {
        type  : 'send_email',
        config: {
          subject: 'Reminder: Your offer letter for {{jobTitle}} is waiting, {{candidateName}}',
          body   : '<p>Hi {{candidateName}},</p><p>Just a friendly reminder — your offer letter for <strong>{{jobTitle}}</strong> is still awaiting your signature. Please review and sign it at your earliest convenience.</p>',
        },
      },
      {
        type  : 'send_whatsapp',
        config: { message: 'Hi {{candidateName}}, friendly reminder — your offer letter for {{jobTitle}} is still awaiting your signature. Please check your email. 📄' },
      },
    ],
  },
  {
    systemKey  : 'admin_alert_stuck_candidate',
    name       : 'Admin Alert — Candidate Stuck in Stage',
    description: 'Notifies the admin when a candidate has been in the same stage for too long.',
    category   : 'Pipeline',
    trigger    : { event: 'candidate_stuck', conditions: [] },
    actions    : [{
      type  : 'notify_admin',
      config: {
        title  : 'Candidate Stuck — Action Required',
        message: '{{candidateName}} has been in the {{stage}} stage for too long on {{jobTitle}}. Please review.',
      },
    }],
  },
  {
    systemKey  : 'assessment_passed_move_stage',
    name       : 'Assessment Passed → Move to Shortlisted',
    description: 'Automatically moves candidates who score 70+ on their assessment to the Shortlisted stage.',
    category   : 'Assessment',
    trigger    : {
      event     : 'assessment_completed',
      conditions: [{ field: 'assessmentScore', operator: 'above', value: '70' }],
    },
    actions: [{
      type  : 'move_stage',
      config: { stage: 'Shortlisted' },
    }],
  },

  // ── 8 ───────────────────────────────────────────────────────────────────────
  {
    systemKey  : 'candidate_hired_congratulations',
    name       : 'Congratulations Email on Hire',
    description: 'Sends a warm congratulations email to the candidate when they are marked as Hired.',
    category   : 'Onboarding',
    trigger    : { event: 'candidate_hired', conditions: [] },
    actions    : [
      {
        type  : 'send_email',
        config: {
          subject: 'Welcome aboard, {{candidateName}}! 🎉',
          body   : '<p>Dear {{candidateName}},</p><p>We are thrilled to officially welcome you to the team! You have been selected for the position of <strong>{{jobTitle}}</strong> and we cannot wait to have you on board.</p><p>Your onboarding details will be shared with you shortly. Please keep an eye on your inbox.</p><p>Congratulations and welcome!<br>The HR Team</p>',
        },
      },
      {
        type  : 'send_whatsapp',
        config: { message: '🎉 Congratulations {{candidateName}}! You have been selected for {{jobTitle}}. Welcome to the team! Our HR team will reach out shortly with next steps.' },
      },
    ],
  },

  // ── 9 ───────────────────────────────────────────────────────────────────────
  {
    systemKey  : 'candidate_rejected_compassionate',
    name       : 'Rejection Email — Compassionate',
    description: 'Sends an empathetic rejection notification when a candidate is moved to Rejected. Preserves employer brand.',
    category   : 'Communication',
    trigger    : { event: 'candidate_rejected', conditions: [] },
    actions    : [{
      type  : 'send_email',
      config: {
        subject: 'Update on your application for {{jobTitle}}',
        body   : '<p>Dear {{candidateName}},</p><p>Thank you sincerely for taking the time to apply for the <strong>{{jobTitle}}</strong> position and for your interest in joining our team.</p><p>After careful consideration, we have decided to move forward with other candidates whose experience more closely matches our current requirements. This was a difficult decision — we genuinely appreciated your time and effort.</p><p>We will keep your profile on file and encourage you to apply for future openings that match your skills. We wish you every success in your career journey.</p><p>Warm regards,<br>The Recruitment Team</p>',
      },
    }],
  },

  // ── 10 ──────────────────────────────────────────────────────────────────────
  {
    systemKey  : 'offer_accepted_onboarding_alert',
    name       : 'Offer Accepted → Trigger Onboarding',
    description: 'Notifies the admin and recruiter to initiate onboarding when a candidate accepts an offer.',
    category   : 'Onboarding',
    trigger    : { event: 'offer_accepted', conditions: [] },
    actions    : [
      {
        type  : 'notify_admin',
        config: {
          title  : '🎊 Offer Accepted — Start Onboarding',
          message: '{{candidateName}} accepted the offer for {{jobTitle}}. Please initiate the onboarding checklist and document collection.',
        },
      },
      {
        type  : 'notify_recruiter',
        config: {
          title  : '✅ {{candidateName}} Accepted the Offer',
          message: 'Great news! {{candidateName}} has formally accepted the offer for {{jobTitle}}. Coordinate with HR to begin onboarding.',
        },
      },
    ],
  },

  // ── 11 ──────────────────────────────────────────────────────────────────────
  {
    systemKey  : 'job_published_team_notify',
    name       : 'Job Published — Notify Admin',
    description: 'Notifies the admin when a new job goes live so they can assign recruiters and promote the listing.',
    category   : 'Pipeline',
    trigger    : { event: 'job_published', conditions: [] },
    actions    : [{
      type  : 'notify_admin',
      config: {
        title  : '🚀 New Job Published',
        message: '{{jobTitle}} is now live. Assign recruiters and share the listing to start receiving applications.',
      },
    }],
  },

  // ── 12 ──────────────────────────────────────────────────────────────────────
  {
    systemKey  : 'high_match_score_auto_tag',
    name       : 'High Match Score → Tag as Top Talent',
    description: 'Automatically tags candidates with a Talent Match Score of 80% or above as "Top Talent" for priority review.',
    category   : 'Assessment',
    trigger    : {
      event     : 'candidate_applied',
      conditions: [{ field: 'assessmentScore', operator: 'above', value: '80' }],
    },
    actions: [
      {
        type  : 'assign_tag',
        config: { tag: 'Top Talent' },
      },
      {
        type  : 'notify_recruiter',
        config: {
          title  : '⭐ High Match Candidate',
          message: '{{candidateName}} scored above 80% on match criteria for {{jobTitle}}. Priority review recommended.',
        },
      },
    ],
  },

  // ── 13 ──────────────────────────────────────────────────────────────────────
  {
    systemKey  : 'interview_24h_reminder',
    name       : 'Interview 24-Hour Reminder',
    description: 'Sends a reminder email and WhatsApp to the candidate one day before their scheduled interview.',
    category   : 'Communication',
    trigger    : { event: 'interview_scheduled', conditions: [] },
    actions    : [
      {
        type        : 'send_email',
        delayMinutes: 0,
        config      : {
          subject: 'Reminder: Your interview for {{jobTitle}} is tomorrow',
          body   : '<p>Hi {{candidateName}},</p><p>This is a friendly reminder that your interview for <strong>{{jobTitle}}</strong> is scheduled. Please ensure you have the meeting details ready and prepare any required documents.</p><p>Best of luck — we are looking forward to speaking with you!</p>',
        },
      },
      {
        type        : 'send_whatsapp',
        delayMinutes: 0,
        config      : { message: '📅 Hi {{candidateName}}, reminder: your interview for {{jobTitle}} is coming up soon. Please be prepared and check your email for the full details. All the best! 🌟' },
      },
    ],
  },
];

async function seed() {
  await connectDB();
  console.log('Seeding system automation templates…');
  let created = 0; let skipped = 0;

  for (const tpl of SYSTEM_AUTOMATIONS) {
    const exists = await WorkflowRule.findOne({ isSystem: true, systemKey: tpl.systemKey });
    if (exists) { console.log(`  ↩ skipped  ${tpl.systemKey} (already exists)`); skipped++; continue; }
    await WorkflowRule.create({
      tenantId    : null,
      isSystem    : true,
      isSystemCopy: false,
      isActive    : true,
      ...tpl,
    });
    console.log(`  ✅ created  ${tpl.systemKey}`);
    created++;
  }

  console.log(`\nDone — ${created} created, ${skipped} skipped.`);
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
