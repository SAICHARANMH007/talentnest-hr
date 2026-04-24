'use strict';
const User         = require('../models/User');
const Notification = require('../models/Notification');

/**
 * Create a notification for every active super_admin in the platform.
 * Fire-and-forget — never throws.
 */
async function notifyAllSuperAdmins(type, title, message, metadata = {}) {
  try {
    const admins = await User.find({ role: 'super_admin', isActive: true }).select('_id').lean();
    if (!admins.length) return;
    const docs = admins.map(a => ({
      userId  : a._id,
      type    : type || 'system',
      title,
      message,
      metadata,
      read    : false,
    }));
    await Notification.insertMany(docs, { ordered: false });
  } catch (_) {}
}

module.exports = notifyAllSuperAdmins;
