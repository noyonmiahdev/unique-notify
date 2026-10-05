/**
 * System Settings & Analytics Endpoints (/api/settings, /api/stats)
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const qrGateway = require('../services/qrGateway');

/**
 * @route GET /api/stats
 * @desc Overall Dashboard Statistics & Analytics
 */
router.get('/stats', async (req, res) => {
  try {
    const totalSentRow = await db.getOne("SELECT COUNT(*) as c FROM message_logs WHERE status IN ('SENT', 'DELIVERED', 'READ')");
    const totalDeliveredRow = await db.getOne("SELECT COUNT(*) as c FROM message_logs WHERE status IN ('DELIVERED', 'READ')");
    const totalReadRow = await db.getOne("SELECT COUNT(*) as c FROM message_logs WHERE status = 'READ'");
    const totalFailedRow = await db.getOne("SELECT COUNT(*) as c FROM message_logs WHERE status = 'FAILED'");

    const totalOtpRow = await db.getOne("SELECT COUNT(*) as c FROM otp_logs");
    const verifiedOtpRow = await db.getOne("SELECT COUNT(*) as c FROM otp_logs WHERE status = 'VERIFIED'");

    const recentLogs = await db.query(
      'SELECT id, gateway_type, recipient_phone, message_type, content, status, created_at FROM message_logs ORDER BY id DESC LIMIT 8'
    );

    const activeCampaignsCount = await db.getOne("SELECT COUNT(*) as c FROM campaigns WHERE status = 'RUNNING'");

    const qrInfo = qrGateway.getSessionInfo('primary_qr_session');
    const metaGateway = await db.getOne("SELECT config FROM gateways WHERE type = 'meta' LIMIT 1");
    let isMetaConfigured = false;
    if (metaGateway?.config) {
      try {
        const c = typeof metaGateway.config === 'string' ? JSON.parse(metaGateway.config) : metaGateway.config;
        isMetaConfigured = !!(c.phone_number_id && c.access_token);
      } catch (e) {}
    }

    return res.status(200).json({
      success: true,
      stats: {
        total_sent: totalSentRow?.c || 0,
        total_delivered: totalDeliveredRow?.c || 0,
        total_read: totalReadRow?.c || 0,
        total_failed: totalFailedRow?.c || 0,
        total_otp: totalOtpRow?.c || 0,
        verified_otp: verifiedOtpRow?.c || 0,
        otp_success_rate: totalOtpRow?.c > 0 ? Math.round((verifiedOtpRow.c / totalOtpRow.c) * 100) : 100,
        active_campaigns: activeCampaignsCount?.c || 0,
        qr_status: qrInfo.status,
        qr_phone: qrInfo.phoneNumber,
        meta_configured: isMetaConfigured
      },
      recent_logs: recentLogs
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/settings
 * @desc Retrieve all system settings and gateway configurations
 */
router.get('/settings', async (req, res) => {
  try {
    const settingsRows = await db.query('SELECT setting_key, setting_value, description FROM system_settings');
    const settingsMap = {};
    for (const row of settingsRows) {
      settingsMap[row.setting_key] = row.setting_value;
    }

    const metaGateway = await db.getOne("SELECT config, daily_limit FROM gateways WHERE type = 'meta' LIMIT 1");
    let metaConfig = {};
    if (metaGateway?.config) {
      try {
        metaConfig = typeof metaGateway.config === 'string' ? JSON.parse(metaGateway.config) : metaGateway.config;
      } catch (e) {}
    }

    return res.status(200).json({
      success: true,
      settings: settingsMap,
      meta_config: {
        api_version: metaConfig.api_version || 'v21.0',
        phone_number_id: metaConfig.phone_number_id || '',
        waba_id: metaConfig.waba_id || '',
        access_token: metaConfig.access_token ? `${metaConfig.access_token.substring(0, 10)}...${metaConfig.access_token.slice(-5)}` : '',
        has_token: !!metaConfig.access_token,
        verify_token: metaConfig.verify_token || 'unique_notify_verify_token_123',
        daily_limit: metaGateway?.daily_limit || 10000
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/settings
 * @desc Save updated system & gateway settings
 */
router.post('/settings', async (req, res) => {
  try {
    const { settings = {}, meta_config = {} } = req.body;

    // Update settings table
    for (const [key, val] of Object.entries(settings)) {
      await db.query(
        'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [key, String(val), String(val)]
      ).catch(async () => {
        // SQLite fallback syntax
        await db.query('UPDATE system_settings SET setting_value = ? WHERE setting_key = ?', [String(val), key]);
      });
    }

    // Update Meta Gateway config if provided
    if (meta_config && Object.keys(meta_config).length > 0) {
      const existingMeta = await db.getOne("SELECT config FROM gateways WHERE type = 'meta' LIMIT 1");
      let currentConfig = {};
      if (existingMeta?.config) {
        try { currentConfig = typeof existingMeta.config === 'string' ? JSON.parse(existingMeta.config) : existingMeta.config; } catch (e) {}
      }

      const updatedConfig = {
        api_version: meta_config.api_version || currentConfig.api_version || 'v21.0',
        phone_number_id: meta_config.phone_number_id !== undefined ? meta_config.phone_number_id : currentConfig.phone_number_id,
        waba_id: meta_config.waba_id !== undefined ? meta_config.waba_id : currentConfig.waba_id,
        access_token: (meta_config.access_token && !meta_config.access_token.includes('...')) ? meta_config.access_token : currentConfig.access_token,
        verify_token: meta_config.verify_token || currentConfig.verify_token || 'unique_notify_verify_token_123'
      };

      const dailyLimit = parseInt(meta_config.daily_limit || '10000', 10);
      const isConfigured = !!(updatedConfig.phone_number_id && updatedConfig.access_token);
      const status = isConfigured ? 'CONNECTED' : 'CONFIG_REQUIRED';

      await db.query(
        'UPDATE gateways SET config = ?, daily_limit = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE type = ?',
        [JSON.stringify(updatedConfig), dailyLimit, status, 'meta']
      );
    }

    return res.status(200).json({ success: true, message: 'Settings saved successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
