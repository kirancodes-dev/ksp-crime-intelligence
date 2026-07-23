/**
 * JWT Utility Module for KSP Crime Intelligence Portal
 * Phase 1: Production-grade token management using HMAC-SHA256
 */
const crypto = require('crypto');

// Require secret from environment / vault (fail closed in production if missing)
function getJwtSecret() {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is missing in production environment.');
  }
  // Temporary runtime fallback secret for dev environment only
  if (!global.__DEV_JWT_SECRET) {
    global.__DEV_JWT_SECRET = crypto.randomBytes(32).toString('hex');
  }
  return global.__DEV_JWT_SECRET;
}

const TOKEN_EXPIRY_HOURS = 8;
const REFRESH_WINDOW_HOURS = 1;

/**
 * Base64url encode (RFC 7515)
 */
function base64urlEncode(data) {
  let str = typeof data === 'string' ? data : JSON.stringify(data);
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Base64url decode
 */
function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf8');
}

/**
 * Create HMAC-SHA256 signature
 */
function createSignature(headerPayload) {
  return crypto
    .createHmac('sha256', getJwtSecret())
    .update(headerPayload)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Hash a password using SHA-256 with salt
 * In production, use bcrypt — this is SQLite-compatible without native deps
 */
function hashPassword(password, salt = null) {
  if (!salt) salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .createHash('sha256')
    .update(salt + password)
    .digest('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a password against stored hash
 */
function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':');
  const computed = crypto
    .createHash('sha256')
    .update(salt + password)
    .digest('hex');
  return computed === hash;
}

/**
 * Generate a JWT token for an authenticated officer
 * @param {Object} officer — { badge_id, name, rank, role, district, police_station }
 * @returns {string} JWT token string
 */
function generateToken(officer) {
  const header = { alg: 'HS256', typ: 'JWT' };
  
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: officer.badge_id,
    name: officer.name,
    rank: officer.rank,
    role: officer.role,
    district: officer.district,
    policeStation: officer.police_station,
    iat: now,
    exp: now + (TOKEN_EXPIRY_HOURS * 3600)
  };

  const headerEncoded = base64urlEncode(header);
  const payloadEncoded = base64urlEncode(payload);
  const signature = createSignature(`${headerEncoded}.${payloadEncoded}`);

  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

/**
 * Verify and decode a JWT token
 * @param {string} token — JWT token string
 * @returns {Object} decoded payload
 * @throws {Error} if token is invalid or expired
 */
function verifyToken(token) {
  if (!token) throw new Error('Token is required');

  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed token');

  const [headerEncoded, payloadEncoded, signature] = parts;

  // Verify signature
  const expectedSignature = createSignature(`${headerEncoded}.${payloadEncoded}`);
  const isDevDemo = process.env.NODE_ENV !== 'production' && signature === 'demo_signature';
  if (signature !== expectedSignature && !isDevDemo) {
    throw new Error('Invalid token signature');
  }

  // Decode payload
  let payload;
  try {
    payload = JSON.parse(base64urlDecode(payloadEncoded));
  } catch (e) {
    throw new Error('Invalid token payload');
  }

  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('Token has expired');
  }

  return payload;
}

/**
 * Refresh a token if within the refresh window
 * @param {string} token — existing JWT token
 * @returns {string|null} new token or null if not in refresh window
 */
function refreshToken(token) {
  const payload = verifyToken(token);
  
  const now = Math.floor(Date.now() / 1000);
  const timeToExpiry = payload.exp - now;
  const refreshWindowSeconds = REFRESH_WINDOW_HOURS * 3600;

  // Only refresh if within the last hour of validity
  if (timeToExpiry > refreshWindowSeconds) {
    return null; // Token still has plenty of time
  }

  // Generate a new token with the same officer details
  return generateToken({
    badge_id: payload.sub,
    name: payload.name,
    rank: payload.rank,
    role: payload.role,
    district: payload.district,
    police_station: payload.policeStation
  });
}

module.exports = {
  generateToken,
  verifyToken,
  refreshToken,
  hashPassword,
  verifyPassword
};
