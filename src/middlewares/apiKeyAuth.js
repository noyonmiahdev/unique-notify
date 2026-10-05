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
      if (!apiKey.startsWith('un_live_')) {
        try {
          const secret = process.env.JWT_SECRET || 'unique_notify_jwt_secret_change_me_998877';
          const decoded = jwt.verify(apiKey, secret);
          req.user = decoded;
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
    const keyRecord = await db.getOne(
      'SELECT id, name, user_id, api_key, is_active, rate_limit_per_min, allowed_ips FROM api_keys WHERE api_key = ?',
      [apiKey]
    );

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

    req.apiKey = keyRecord;
    req.user = { id: keyRecord.user_id || 1, role: 'USER' };
    next();
  } catch (err) {
    console.error('[API Auth] Error validating key:', err);
    return res.status(500).json({ success: false, message: 'Internal authentication error.' });
  }
}

module.exports = apiKeyAuth;
