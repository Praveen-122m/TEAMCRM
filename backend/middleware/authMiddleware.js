const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

      req.user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }
      });

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user no longer exists' });
      }

      // Attach workspace list
      const workspaces = await req.user.getWorkspaces({ attributes: ['_id'] });
      req.user.workspaces = workspaces.map(w => w._id);

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
