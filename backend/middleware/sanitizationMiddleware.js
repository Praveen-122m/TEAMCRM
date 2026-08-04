/**
 * Recursively sanitize input to strip out script tags, inline script event handlers, and javascript: protocols.
 */
const sanitize = (val) => {
  if (typeof val === 'string') {
    return val
      .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '') // Remove <script> blocks
      .replace(/on\w+="[^"]*"/gi, '') // Remove onmouseover, onload, onerror attributes
      .replace(/on\w+='[^']*'/gi, '')
      .replace(/javascript:[^"']*/gi, ''); // Remove javascript: href injections
  }
  if (Array.isArray(val)) {
    return val.map(sanitize);
  }
  if (val !== null && typeof val === 'object') {
    const sanitizedObj = {};
    for (const key in val) {
      if (Object.prototype.hasOwnProperty.call(val, key)) {
        sanitizedObj[key] = sanitize(val[key]);
      }
    }
    return sanitizedObj;
  }
  return val;
};

const sanitizationMiddleware = (req, res, next) => {
  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);
  next();
};

module.exports = sanitizationMiddleware;
