const ActivityLog = require('../models/ActivityLog');

/**
 * Record a security-related event in the database for auditing.
 */
const logSecurityEvent = async ({ userId, userEmail, action, details, workspaceId, req }) => {
  try {
    let ipAddress = null;
    if (req) {
      ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    }

    await ActivityLog.create({
      userId: userId || null,
      userEmail: userEmail || null,
      action,
      details: details || {},
      workspaceId: workspaceId || null,
      ipAddress
    });
    console.log(`[AUDIT_LOG] [${action}] User: ${userEmail || userId || 'Anonymous'}, IP: ${ipAddress}`);
  } catch (error) {
    console.error('[LOGGER_ERR] Failed to save security audit log:', error);
  }
};

module.exports = { logSecurityEvent };
