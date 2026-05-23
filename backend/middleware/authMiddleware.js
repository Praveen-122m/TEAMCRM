const jwt = require('jsonwebtoken');
const User = require('../models/User');
const SaaSClient = require('../models/SaaSClient');

/**
 * Verify JWT Token - Base authentication middleware
 */
const verifyToken = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Try searching standard User first
      let resolvedUser = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }
      });

      if (resolvedUser) {
        // Attach workspace list
        const workspaces = await resolvedUser.getWorkspaces({ attributes: ['_id'] });
        resolvedUser.workspaces = workspaces.map(w => w._id);
        req.user = resolvedUser;
      } else {
        // Try searching client from the clients table
        const saasClient = await SaaSClient.findByPk(decoded.id);
        if (!saasClient) {
          return res.status(401).json({ message: 'Not authorized, user no longer exists' });
        }

        // Mock req.user format for compatibility
        req.user = {
          _id: saasClient.id,
          id: saasClient.id,
          name: saasClient.client_name,
          email: saasClient.email,
          role: 'Client',
          companyName: saasClient.company_name,
          secretKey: saasClient.secret_key,
          description: saasClient.description,
          workspaces: saasClient.workspace_id ? [saasClient.workspace_id] : []
        };
      }

      next();
    } catch (error) {
      console.error('[AUTH_MIDDLEWARE]', error.message);
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired, please login again' });
      }
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

// Alias for backward compatibility
const protect = verifyToken;

/**
 * Admin Role Middleware
 */
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
};

// Alias for backward compatibility
const admin = isAdmin;

/**
 * Member Role Middleware
 */
const isMember = (req, res, next) => {
  if (req.user && (req.user.role === 'Member' || req.user.role === 'Admin')) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Member role required.' });
  }
};

/**
 * Client Role Middleware
 */
const isClient = (req, res, next) => {
  if (req.user && req.user.role === 'Client') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Client role required.' });
  }
};

/**
 * Admin or Member Role Middleware
 */
const isAdminOrMember = (req, res, next) => {
  if (req.user && (req.user.role === 'Admin' || req.user.role === 'Member')) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin or Member role required.' });
  }
};

module.exports = { verifyToken, protect, isAdmin, admin, isMember, isClient, isAdminOrMember };
