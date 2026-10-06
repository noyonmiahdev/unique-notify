/**
 * API Key Authentication Middleware
 * Secures REST API endpoints for external integrations (WHMCS, PHP scripts, WooCommerce, etc.)
 */

const db = require('../config/database');
const jwt = require('jsonwebtoken');

async function apiKeyAuth(req, res, next) {
  let apiKey = req.headers['x-api-key'] || req.query.api_key;
  let isBearerJwt = false;

  if (!apiKey && req.headers['authorization']) {
    const parts = req.headers['authorization'].split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      apiKey = parts[1];
      if (apiKey && apiKey.split('.').length === 3) {
        try {
          const secret = process.env.JWT_SECRET || 'unique_notify_jwt_secret_change_me_998877';
          const decoded = jwt.verify(apiKey, secret);
          const dbUser = await db.getOne('SELECT id, name, email, role, plan_id, plan_status, credits_remaining, sms_balance, sms_credits FROM users WHERE id = ?', [decoded.id]);
          req.user = dbUser || decoded;
          req.authType = 'jwt';
          return next();
        } catch (jwtErr) {
          // Continue to check api_keys table
        }
      }
    }
  }

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Missing API Key. Provide via X-API-Key header, api_key query param, or Bearer token.'
    });
  }

  try {
    let keyRecord = await db.getOne(
      'SELECT id, name, user_id, api_key, is_active, rate_limit_per_min, allowed_ips FROM api_keys WHERE api_key = ?',
      [apiKey]
    );

    // Auto-register default master key if needed
    const defaultKey = process.env.DEFAULT_API_KEY || 'un_live_8f3a9b2c1d4e5f6a7b8c9d0e1f2a3b4c';
    if (!keyRecord && (apiKey === defaultKey || apiKey === 'un_live_8f3a9b2c1d4e5f6a7b8c9d0e1f2a3b4c')) {
      try {
        const insertRes = await db.query(
          'INSERT INTO api_keys (user_id, name, api_key, is_active, rate_limit_per_min) VALUES (1, "Master Live Key", ?, 1, 300)',
          [apiKey]
        );
        keyRecord = {
          id: insertRes.insertId || 1,
          name: 'Master Live Key',
          user_id: 1,
          api_key: apiKey,
          is_active: 1,
          rate_limit_per_min: 300,
          allowed_ips: null
        };
      } catch (e) {
        keyRecord = await db.getOne('SELECT * FROM api_keys WHERE api_key = ?', [apiKey]);
      }
    }

    if (!keyRecord) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid API Key or expired authentication token.'
      });
    }

    if (!keyRecord.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: This API Key has been deactivated.'
      });
    }

    // IP Whitelist check if configured
    if (keyRecord.allowed_ips) {
      const clientIp = req.ip || req.connection?.remoteAddress || '';
      const allowedList = keyRecord.allowed_ips.split(',').map(ip => ip.trim());
      const isAllowed = allowedList.some(ip => clientIp.includes(ip) || ip === '*');
      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: IP ${clientIp} is not authorized for this API Key.`
        });
      }
    }

    // Update last used timestamp async
    db.query('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?', [keyRecord.id]).catch(() => {});

    const linkedUser = await db.getOne('SELECT id, name, email, role, plan_id, plan_status, credits_remaining, sms_balance, sms_credits FROM users WHERE id = ?', [keyRecord.user_id]);
    req.apiKey = keyRecord;
    req.user = linkedUser || { id: keyRecord.user_id || 1, role: 'USER', email: 'api@user.com' };
    next();
  } catch (err) {
    console.error('[API Auth] Error validating key:', err);
    return res.status(500).json({ success: false, message: 'Internal authentication error.' });
  }
}

module.exports = apiKeyAuth;
