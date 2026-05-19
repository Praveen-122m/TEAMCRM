/**
 * Validates whether an email is in a valid format.
 * @param {string} email 
 * @returns {boolean}
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  // Standard RFC 5322 official email regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
};

/**
 * Validates password strength.
 * Criteria:
 * - At least 8 characters long
 * - Contains at least one uppercase letter
 * - Contains at least one lowercase letter
 * - Contains at least one numeric digit
 * - Contains at least one special character (e.g., @$!%*?&_#^-)
 * @param {string} password 
 * @returns {{isValid: boolean, message: string}}
 */
const validatePasswordStrength = (password) => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, message: 'Password must be a text string.' };
  }
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter (A-Z).' };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter (a-z).' };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one numeric digit (0-9).' };
  }
  if (!/[@$!%*?&_#^\-+=(){}[\]|\\:;"'<>,.?/~`]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one special character (e.g., @, $, !, %, *, ?, &, _, -).' };
  }
  return { isValid: true, message: 'Password meets complexity requirements.' };
};

module.exports = {
  validateEmail,
  validatePasswordStrength
};
