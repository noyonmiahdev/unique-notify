/**
 * Strict Admin Authentication Middleware
 * Verifies JWT token and checks AGAINST the dedicated admins table (NOT users table).
 */
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { logAudit } = require('../services/auditService');

async function adminAuth(req, res, next) {
  let token = req.headers['authorization'];
  if (token && token.startsWith('Bearer ')) {
    token = token.slice(7);
  } else {
    token = req.cookies?.admin_token || req.query.admin_token;
  }

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access Denied: Administrator authentication required.' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'unique_notify_jwt_secret_change_me_998877';
    const decoded = jwt.verify(token, secret);

    // Confirm token was issued for admin portal (has _src: 'admins' flag)
    if (decoded._src !== 'admins') {
      await logAudit({
        userId: decoded.id, action: 'ADMIN_ACCESS_WRONG_TOKEN_SOURCE', ip: String(ip),
        userAgent: req.headers['user-agent'],
        details: { url: req.originalUrl, note: 'User token used on admin endpoint' }
      });
      return res.status(403).json({ success: false, message: 'Forbidden: Use admin portal credentials, not user account.' });
    }

    // Verify admin STILL exists in admins table and is active
    const admin = await db.getOne('SELECT id, name, email, is_active FROM admins WHERE id = ?', [decoded.id]);
    if (!admin || !admin.is_active) {
      return res.status(401).json({ success: false, message: 'Invalid token: Administrator account not found or disabled.' });
    }

    req.admin = admin;
    next();
  } catch (err) {
    await logAudit({
      userId: null, action: 'ADMIN_INVALID_TOKEN', ip: String(ip),
      userAgent: req.headers['user-agent'],
      details: { error: err.message, url: req.originalUrl }
    });
    return res.status(401).json({ success: false, message: 'Session expired or invalid token. Please log in again.' });
  }
}

module.exports = adminAuth;
