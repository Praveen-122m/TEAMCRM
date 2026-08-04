const jwt = require('jsonwebtoken');

const generateAccessToken = async (id, role = null, workspaceId = null) => {
  let finalRole = role;
  let finalWorkspaceId = workspaceId;

  if (!finalRole || !finalWorkspaceId) {
    try {
      const User = require('../models/User');
      const SaaSClient = require('../models/SaaSClient');
      const user = await User.findByPk(id);
      if (user) {
        finalRole = finalRole || user.role;
        if (!finalWorkspaceId) {
          const workspaces = await user.getWorkspaces({ attributes: ['_id'] });
          finalWorkspaceId = workspaces[0]?._id || null;
        }
      } else {
        const saasClient = await SaaSClient.findByPk(id);
        if (saasClient) {
          finalRole = finalRole || 'Client';
          finalWorkspaceId = finalWorkspaceId || saasClient.workspace_id;
        }
      }
    } catch (err) {
      console.error('[TOKEN_HELPER_ERR] Fallback lookup failed:', err.message);
    }
  }

  return jwt.sign(
    { id, role: finalRole, workspaceId: finalWorkspaceId },
    process.env.JWT_SECRET,
    {
      expiresIn: '1d' // Extend slightly from 15m to 1d to make SaaS operations smooth
    }
  );
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || 'your_super_secret_refresh_key_123', {
    expiresIn: '7d' // long-lived
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken
};
