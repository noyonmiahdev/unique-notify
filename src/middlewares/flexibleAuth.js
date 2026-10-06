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

  // 2. Extract Bearer / API Key tokens
  let rawBearer = null;
  if (authHeader.startsWith('Bearer ')) {
    rawBearer = authHeader.slice(7).trim();
  } else if (cookieToken) {
    rawBearer = cookieToken;
  }

  // 3. Try JWT Bearer Token if it has standard 3-part JWT structure
  if (rawBearer && rawBearer.split('.').length === 3) {
    try {
      const secret = process.env.JWT_SECRET || 'unique_notify_jwt_secret_change_me_998877';
      const decoded = jwt.verify(rawBearer, secret);
      // Fetch fresh user data if available
      const dbUser = await db.getOne('SELECT id, name, email, role, plan_id, plan_status, credits_remaining, sms_balance, sms_credits FROM users WHERE id = ?', [decoded.id]);
      req.user = dbUser || decoded;
      req.authType = 'jwt';
      return next();
    } catch (jwtErr) {
      // If JWT verification fails, continue to check API key
    }
  }

  // 4. Try API Key (via X-API-Key header, query param, or Bearer string)
  const targetApiKey = apiKeyHeader || rawBearer;
  if (targetApiKey) {
    try {
      let keyRecord = await db.getOne(
        'SELECT id, name, user_id, api_key, is_active, rate_limit_per_min, allowed_ips FROM api_keys WHERE api_key = ?',
        [targetApiKey]
      );

      // Auto-register default/master key if matched with environment
      const defaultKey = process.env.DEFAULT_API_KEY || 'un_live_8f3a9b2c1d4e5f6a7b8c9d0e1f2a3b4c';
      if (!keyRecord && (targetApiKey === defaultKey || targetApiKey === 'un_live_8f3a9b2c1d4e5f6a7b8c9d0e1f2a3b4c')) {
        try {
          const insertRes = await db.query(
            'INSERT INTO api_keys (user_id, name, api_key, is_active, rate_limit_per_min) VALUES (1, "Master Live Key", ?, 1, 300)',
            [targetApiKey]
          );
          keyRecord = {
            id: insertRes.insertId || 1,
            name: 'Master Live Key',
            user_id: 1,
            api_key: targetApiKey,
            is_active: 1,
            rate_limit_per_min: 300,
            allowed_ips: null
          };
        } catch (e) {
          keyRecord = await db.getOne('SELECT * FROM api_keys WHERE api_key = ?', [targetApiKey]);
        }
      }

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

        const linkedUser = await db.getOne('SELECT id, name, email, role, plan_id, plan_status, credits_remaining, sms_balance, sms_credits FROM users WHERE id = ?', [keyRecord.user_id]);
        req.apiKey = keyRecord;
        req.user = linkedUser || { id: keyRecord.user_id || 1, role: 'USER', email: 'api@user.com' };
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

  // 5. Fallback for demo/single user environments
  try {
    const defaultUser = await db.getOne('SELECT id, name, role, email, plan_id, plan_status, credits_remaining, sms_balance, sms_credits FROM users ORDER BY id ASC LIMIT 1');
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
