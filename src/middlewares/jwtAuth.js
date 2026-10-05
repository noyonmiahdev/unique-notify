/**
 * JWT Authentication Middleware for Admin Dashboard
 */

const jwt = require('jsonwebtoken');

function jwtAuth(req, res, next) {
  let token = req.headers['authorization'];
  if (token && token.startsWith('Bearer ')) {
    token = token.slice(7, token.length);
  } else {
    token = req.cookies?.token || req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Admin session required.' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'unique_notify_jwt_secret_change_me_998877';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Session expired or invalid token.' });
  }
}

module.exports = jwtAuth;
