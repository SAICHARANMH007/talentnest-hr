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
