const jwt = require('jsonwebtoken');
const User = require('../models/User');
const SaaSClient = require('../models/SaaSClient');
const Client = require('../models/Client');

/**
 * Verify JWT Token - Base authentication middleware
 */
const verifyToken = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Try searching standard User first
      let resolvedUser = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }
      });

      if (!resolvedUser) {
        // Enforce DB self-healing: if they have a SaaSClient record but no User record, create it
        const saasClient = await SaaSClient.findByPk(decoded.id);
        if (saasClient) {
          resolvedUser = await User.create({
            _id: saasClient.id,
            name: saasClient.client_name,
            email: saasClient.email,
            password: saasClient.password,
            role: 'Client'
          }, { hooks: false });
        }
      }

      if (resolvedUser) {
        // Attach workspace list
        const workspaces = await resolvedUser.getWorkspaces({ attributes: ['_id'] });
        const userObj = resolvedUser.toJSON();
        userObj.workspaces = workspaces.map(w => w._id);
        
        if (userObj.role === 'Client') {
          // Fetch SaaSClient details to enrich req.user
          const saasClient = await SaaSClient.findByPk(userObj._id);
          if (saasClient) {
            userObj.companyName = saasClient.company_name;
            userObj.secretKey = saasClient.secret_key;
            userObj.description = saasClient.description;
            if (saasClient.workspace_id && !userObj.workspaces.includes(saasClient.workspace_id)) {
              userObj.workspaces.push(saasClient.workspace_id);
            }
          }
          // Always attach clientProfileId so verify endpoint returns it correctly on refresh
          const clientProfile = await Client.findOne({ where: { userId: userObj._id } });
          userObj.clientProfileId = clientProfile?._id || saasClient?.id || userObj._id;
        }
        
        // Derive ID, Role, and active Workspace from verified JWT
        userObj.workspaceId = decoded.workspaceId || (userObj.workspaces && userObj.workspaces[0]) || null;
        // DB role should take precedence over the outdated JWT token role
        userObj.role = userObj.role || decoded.role || 'Member';
        
        // Enforce boundary verification: verify workspaceId matches membership list
        if (userObj.workspaceId && userObj.role !== 'Admin' && userObj.role !== 'SuperAdmin' && userObj.role !== 'super_admin') {
          const belongsToWs = userObj.workspaces.map(id => id.toString()).includes(userObj.workspaceId.toString());
          if (!belongsToWs) {
            return res.status(403).json({ message: 'Access denied: You do not belong to the selected workspace.' });
          }
        }
        
        req.user = userObj;
      } else {
        // Try searching client from the clients table
        const saasClient = await SaaSClient.findByPk(decoded.id);
        if (!saasClient) {
          return res.status(401).json({ message: 'Not authorized, user no longer exists' });
        }

        let profileImage = '';
        const matchingUser = await User.findByPk(saasClient.id);
        if (matchingUser) {
          profileImage = matchingUser.profileImage || '';
        }

        const wsId = decoded.workspaceId || saasClient.workspace_id || null;

        // Mock req.user format for compatibility
        req.user = {
          _id: saasClient.id,
          id: saasClient.id,
          name: saasClient.client_name,
          email: saasClient.email,
          role: 'Client',
          profileImage,
          companyName: saasClient.company_name,
          secretKey: saasClient.secret_key,
          description: saasClient.description,
          workspaces: saasClient.workspace_id ? [saasClient.workspace_id] : [],
          workspaceId: wsId
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
 * Require active workspace middleware
 */
const requireWorkspace = (req, res, next) => {
  if (!req.user || !req.user.workspaceId) {
    return res.status(400).json({ message: 'Active workspace ID is required' });
  }
  next();
};

/**
 * Reusable Role-Based Access Control (RBAC) middleware
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.map(r => r.toLowerCase()).includes(req.user.role.toLowerCase())) {
      return res.status(403).json({ message: 'Access denied: Insufficient permissions.' });
    }
    next();
  };
};

/**
 * Super Admin Role Middleware
 */
const isSuperAdmin = (req, res, next) => {
  const role = req.user?.role?.toLowerCase().replace(/[\s_]+/g, '') || '';
  const nameMatch = req.user?.name?.toLowerCase().replace(/[\s_]+/g, '').includes('superadmin') || false;
  if (req.user && (role === 'superadmin' || nameMatch)) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Super Admin role required.' });
  }
};

/**
 * Employee or Intern Role Middleware
 */
const isEmployeeOrIntern = (req, res, next) => {
  if (req.user && (req.user.role === 'employee' || req.user.role === 'intern' || req.user.role === 'Member')) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Employee or Intern role required.' });
  }
};

/**
 * Admin Role Middleware
 */
const isAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'super_admin' || req.user.role === 'Admin' || req.user.role === 'SuperAdmin')) {
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
  const r = req.user?.role;
  if (req.user && (r === 'Member' || r === 'Admin' || r === 'super_admin' || r === 'admin' || r === 'employee' || r === 'intern')) {
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
 * Strict Workspace Access Verification Middleware
 */
const checkWorkspaceAccess = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Not authorized, session missing' });
    }

    // Admins have access to all workspaces
    const r = user.role;
    if (r === 'Admin' || r === 'SuperAdmin' || r === 'super_admin' || r === 'admin') {
      return next();
    }

    // Try to extract workspaceId from params, query, or body
    let workspaceId = req.params?.workspaceId || req.query?.workspaceId || req.body?.workspaceId;

    // Fallback: check if the route param is ':id' and looks like a workspaceId (for workspace routes like /api/workspaces/:id)
    if (!workspaceId && req.params.id && req.baseUrl.includes('workspace')) {
      workspaceId = req.params.id;
    }

    if (!workspaceId) {
      // If no workspaceId is specified in the request, proceed (the controller/routes will handle validation if needed)
      return next();
    }

    const wsIdStr = workspaceId.toString();

    // Verify user belongs to the workspace
    const userWorkspaces = (user.workspaces || []).map(id => id.toString());
    if (userWorkspaces.includes(wsIdStr)) {
      return next();
    }

    return res.status(403).json({ message: 'Access denied: You do not belong to this workspace.' });
  } catch (error) {
    console.error('[WORKSPACE_ACCESS_MIDDLEWARE_ERR]', error);
    res.status(500).json({ message: 'Server authorization error' });
  }
};

/**
 * Admin or Member Role Middleware
 */
const isAdminOrMember = (req, res, next) => {
  const r = req.user?.role;
  if (req.user && (r === 'Admin' || r === 'Member' || r === 'super_admin' || r === 'admin' || r === 'employee' || r === 'intern')) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin or Member role required.' });
  }
};

module.exports = { verifyToken, protect, isAdmin, isSuperAdmin, isEmployeeOrIntern, admin, isMember, isClient, isAdminOrMember, checkWorkspaceAccess, requireWorkspace, requireRole };
