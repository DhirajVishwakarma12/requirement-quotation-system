const jwt = require('jsonwebtoken');
const { createHash } = require('crypto');
const User = require('../models/User');
const TokenBlacklist = require('../models/TokenBlacklist');

async function protect(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ message: 'Authentication required' });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  try {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    if (await TokenBlacklist.exists({ tokenHash })) {
      return res.status(401).json({ message: 'Session has been revoked' });
    }
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'User not found' });
    req.authToken = token;
    req.authTokenExpiresAt = new Date(decoded.exp * 1000);
    return next();
  } catch (error) {
    return next(error);
  }
}
function allow(...roles) {
  return (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'Permission denied' });
}
module.exports = { protect, allow };
