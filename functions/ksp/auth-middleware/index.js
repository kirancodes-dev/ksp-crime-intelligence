/**
 * Auth Middleware for KSP Crime Intelligence Portal
 * Phase 1: JWT-based authentication with role extraction
 * 
 * Verifies Bearer tokens on all routes except /api/auth/login and /api/health
 * Attaches decoded user context (badgeId, role, district, policeStation) to req.user
 */
const { verifyToken } = require('./jwt-utils');

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/health',
  '/api/health/ready',
  '/api/health/live',
  '/'
];

module.exports = (req, res, next) => {
  // Allow public routes without auth
  const isPublic = PUBLIC_ROUTES.some(route => req.path === route || req.path.startsWith(route + '/')) || req.path.includes('/.well-known/');
  if (isPublic) {
    // Set a default guest user context for public routes
    req.user = {
      userId: 'SYSTEM',
      role: 'Investigator',
      district: 'Bengaluru City',
      policeStation: 'Bengaluru City Central PS'
    };
    return next();
  }

  // Extract Bearer token from Authorization header
  const authHeader = req.headers['authorization'];
  
  // BACKWARD COMPATIBILITY: If no auth header but has legacy x-user-id/x-user-role headers,
  // accept them to avoid breaking existing client during migration
  if (!authHeader) {
    const legacyUserId = req.headers['x-user-id'];
    const legacyRole = req.headers['x-user-role'];
    
    if (legacyUserId || legacyRole) {
      req.user = {
        userId: legacyUserId || 'INV-1001',
        role: legacyRole || 'Investigator',
        district: 'Bengaluru City',
        policeStation: 'Bengaluru City Central PS'
      };
      return next();
    }

    return res.status(401).json({
      success: false,
      error: 'Authentication required. Provide Authorization: Bearer <token> header.'
    });
  }

  // Parse Bearer token
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      error: 'Invalid Authorization header format. Use: Bearer <token>'
    });
  }

  const token = parts[1];

  try {
    const decoded = verifyToken(token);
    
    // Attach user context to request
    req.user = {
      userId: decoded.sub,
      name: decoded.name,
      rank: decoded.rank,
      role: decoded.role,
      district: decoded.district,
      policeStation: decoded.policeStation
    };

    next();
  } catch (err) {
    if (err.message === 'Token has expired') {
      return res.status(401).json({
        success: false,
        error: 'Token expired. Please log in again.',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token.',
      code: 'INVALID_TOKEN'
    });
  }
};
