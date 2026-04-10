'use strict';
/**
 * Workflow Engine — evaluates rules and executes actions.
 * Called after stage changes, assessment submissions, and new applications.
 */
const WorkflowRule  = require('../models/WorkflowRule');
const Notification  = require('../models/Notification');
const Application   = require('../models/Application');
const User          = require('../models/User');
const { sendEmailWithRetry } = require('../utils/email');
const logger = require('../middleware/logger');

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://talentnesthr.com';

// ── Condition evaluator ────────────────────────────────────────────────────────
function evaluateCondition(condition, eventData) {
  const { field, operator, value } = condition;
  const actual = eventData[field];
  if (actual === undefined || actual === null) return false;
  switch (operator) {
    case 'equals':     return String(actual) === String(value);
    case 'not_equals': return String(actual) !== String(value);
    case 'above':      return Number(actual) > Number(value);
    case 'below':      return Number(actual) < Number(value);
    case 'contains':   return String(actual).toLowerCase().includes(String(value).toLowerCase());
    default:           return false;
  }
}

function allConditionsPass(conditions, eventData) {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every(c => evaluateCondition(c, eventData));
}

// ── Action executors ───────────────────────────────────────────────────────────
async function execSendEmail(config, eventData) {
  const to      = config.to || eventData.candidateEmail;
  const subject = interpolate(config.subject || 'Update from TalentNest HR', eventData);
  const body    = interpolate(config.body    || '', eventData);
  if (!to) return;
  await sendEmailWithRetry(to, subject, `<div style="font-family:sans-serif">${body}</div>`).catch(e =>
    logger.error('[workflow] send_email failed', { to, err: e.message })
  );
}

async function execSendWhatsapp(config, eventData) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return;
  const phone = config.phone || eventData.candidatePhone;
  if (!phone) return;
  // Senior Developer Fix: Remove hardcoded +91 and 10-digit truncation.
  // We preserve the user's provided code if present, otherwise default to +91 only for 10-digit numbers.
  let cleanPhone = phone.replace(/\D/g, '');
  let formattedPhone = '';
  if (phone.startsWith('+')) {
    formattedPhone = `whatsapp:+${cleanPhone}`;
  } else if (cleanPhone.length === 10) {
    formattedPhone = `whatsapp:+91${cleanPhone}`;
  } else {
    formattedPhone = `whatsapp:+${cleanPhone}`;
  }
  const to = phone.startsWith('whatsapp:') ? phone : formattedPhone;
  const body = interpolate(config.message || 'Update from TalentNest HR', eventData);
  const url  = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const encoded = new URLSearchParams({ From: TWILIO_WHATSAPP_FROM, To: to, Body: body });
  await fetch(url, {
    method : 'POST',
    headers: {
      'Content-Type' : 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
    },
    body: encoded.toString(),
  }).catch(e => logger.error('[workflow] send_whatsapp failed', { to, err: e.message }));
}

async function execMoveStage(config, eventData) {
  if (!config.stage || !eventData.applicationId) return;
  const STAGE_ALIAS = {
    applied: 'Applied', screening: 'Screening', shortlisted: 'Shortlisted',
    'interview round 1': 'Interview Round 1', 'interview round 2': 'Interview Round 2',
    offer: 'Offer', hired: 'Hired', rejected: 'Rejected',
  };
  const stage = STAGE_ALIAS[config.stage.toLowerCase()] || config.stage;
  await Application.findByIdAndUpdate(eventData.applicationId, {
    $set: { currentStage: stage },
    $push: { stageHistory: { stage, movedBy: null, movedAt: new Date(), notes: 'Moved by workflow rule' } },
  }).catch(e => logger.error('[workflow] move_stage failed', { err: e.message }));
}

async function execNotifyUser(role, config, eventData) {
  let userId = eventData.recruiterId;
  if (role === 'admin') {
    const admin = await User.findOne({ tenantId: eventData.tenantId, role: 'admin', isActive: true }).select('_id').lean();
    if (admin) userId = admin._id;
  }
  if (!userId) return;
  await Notification.create({
    userId,
    tenantId: eventData.tenantId,
    type   : 'system',
    title  : interpolate(config.title   || 'Workflow Alert', eventData),
    message: interpolate(config.message || 'A workflow rule was triggered.', eventData),
    link   : config.link || `${FRONTEND_URL}/app/pipeline`,
  }).catch(() => {});
}

// Simple {{placeholder}} interpolation
function interpolate(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
}

// ── Main evaluator ─────────────────────────────────────────────────────────────
/**
 * @param {string|ObjectId} tenantId
 * @param {{ event: string, [key: string]: any }} eventData
 * @param {boolean} dryRun — if true, return matched rules without executing
 */
async function evaluateWorkflows(tenantId, eventData, dryRun = false) {
  try {
    const rules = await WorkflowRule.find({
      tenantId,
      isActive: true,
      'trigger.event': eventData.event,
    }).lean();

    if (!rules.length) return { triggered: 0 };

    const triggered = [];
    for (const rule of rules) {
      if (!allConditionsPass(rule.trigger.conditions, eventData)) continue;

      triggered.push(rule._id);
      if (dryRun) continue;

      // Senior Developer Optimization: Parallelize actions to prevent sequential blocking
      const actionPromises = rule.actions.map(async (action) => {
        try {
          switch (action.type) {
            case 'send_email':       return execSendEmail(action.config, eventData);
            case 'send_whatsapp':    return execSendWhatsapp(action.config, eventData);
            case 'move_stage':       return execMoveStage(action.config, eventData);
            case 'notify_recruiter': return execNotifyUser('recruiter', action.config, eventData);
            case 'notify_admin':     return execNotifyUser('admin', action.config, eventData);
            case 'create_task':
              logger.info('[workflow] create_task action (not yet wired)', action.config);
              return Promise.resolve();
            default:
              return Promise.resolve();
          }
        } catch (e) {
          logger.error('[workflow] action failed', { ruleId: rule._id, actionType: action.type, err: e.message });
        }
      });

      await Promise.allSettled(actionPromises);

      // Update rule stats
      await WorkflowRule.findByIdAndUpdate(rule._id, {
        $set: { lastTriggeredAt: new Date() },
        $inc: { triggerCount: 1 },
      }).catch(() => {});
    }

    return { triggered: triggered.length, ruleIds: triggered };
  } catch (e) {
    logger.error('[workflowEngine] evaluateWorkflows error', { err: e.message });
    return { triggered: 0, error: e.message };
  }
}

module.exports = { evaluateWorkflows };
