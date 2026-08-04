const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Encrypt text using AES-256-CBC
 */
const encrypt = (text) => {
  if (!text) return null;

  const key = Buffer.from(
    process.env.ENCRYPTION_KEY || '12345678901234567890123456789012',
    'utf8'
  );

  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
};

/**
 * Decrypt text
 */
const decrypt = (encryptedText) => {
  if (!encryptedText) return null;

  const key = Buffer.from(
    process.env.ENCRYPTION_KEY || '12345678901234567890123456789012',
    'utf8'
  );

  const parts = encryptedText.split(':');

  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

module.exports = { encrypt, decrypt };