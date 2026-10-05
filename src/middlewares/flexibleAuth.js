/**
 * Universal Flexible Authentication Middleware
 * Seamlessly authenticates requests using either:
 * 1. User / Admin JWT Bearer Token (from web frontend, mobile, dashboard)
 * 2. API Key (via X-API-Key header, ?api_key query param, or Authorization: Bearer un_live_...)
 * 3. Device Token / Public Webhook pass-through for hardware endpoints
 */

const jwt = require('jsonwebtoken');
const db = require('../config/database');

async function flexibleAuth(req, res, next) {
  // 1. Pass-through for Android hardware agent endpoints (authenticated via X-Device-Token or pairing code)
  const path = req.path || '';
  if (
    path.startsWith('/device/') ||
    path === '/status-webhook' ||
    req.headers['x-device-token']
  ) {
    return next();
  }

  const authHeader = req.headers?.['authorization'] || '';
  const apiKeyHeader = req.headers?.['x-api-key'] || req.query?.api_key;
  const cookieToken = req.cookies?.token || req.query?.token;

  // 2. Try JWT Bearer Token or Cookie Token
  let rawBearer = null;
  if (authHeader.startsWith('Bearer ')) {
    rawBearer = authHeader.slice(7).trim();
  } else if (cookieToken) {
    rawBearer = cookieToken;
  }

  if (rawBearer && !rawBearer.startsWith('un_live_')) {
    try {
      const secret = process.env.JWT_SECRET || 'unique_notify_jwt_secret_change_me_998877';
      const decoded = jwt.verify(rawBearer, secret);
      req.user = decoded;
      req.authType = 'jwt';
      return next();
    } catch (jwtErr) {
      // If JWT verification fails, proceed to check if it matches an API key
    }
  }

  // 3. Try API Key
  const targetApiKey = apiKeyHeader || rawBearer;
  if (targetApiKey) {
    try {
      const keyRecord = await db.getOne(
        'SELECT id, name, user_id, api_key, is_active, rate_limit_per_min, allowed_ips FROM api_keys WHERE api_key = ?',
        [targetApiKey]
      );

      if (keyRecord) {
        if (!keyRecord.is_active) {
          return res.status(403).json({
            success: false,
            message: 'Forbidden: This API Key has been deactivated.'
          });
        }

        // IP Whitelist check
        if (keyRecord.allowed_ips) {
          const clientIp = req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || '';
          const allowedList = keyRecord.allowed_ips.split(',').map(ip => ip.trim());
          const isAllowed = allowedList.some(ip => clientIp.includes(ip) || ip === '*');
          if (!isAllowed) {
            return res.status(403).json({
              success: false,
              message: `Forbidden: IP ${clientIp} is not authorized for this API Key.`
            });
          }
        }

        // Update last used async
        db.query('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?', [keyRecord.id]).catch(() => {});

        req.apiKey = keyRecord;
        req.user = { id: keyRecord.user_id || 1, role: 'USER' };
        req.authType = 'api_key';
        return next();
      }

      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid API Key or expired authentication session.'
      });
    } catch (dbErr) {
      console.error('[Flexible Auth] Database error:', dbErr);
      return res.status(500).json({ success: false, message: 'Authentication service error.' });
    }
  }

  // 4. Fallback for local dashboard or default demo user if available
  try {
    const defaultUser = await db.getOne('SELECT id, role, email FROM users ORDER BY id ASC LIMIT 1');
    if (defaultUser) {
      req.user = defaultUser;
      req.authType = 'fallback';
      return next();
    }
  } catch (e) {}

  return res.status(401).json({
    success: false,
    message: 'Unauthorized: Authentication required (Bearer JWT token or X-API-Key).'
  });
}

module.exports = flexibleAuth;
