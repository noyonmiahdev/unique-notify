/**
 * Device & Gateway Management Routes (/api/v1/devices)
 */

const express = require('express');
const router = express.Router();
const qrGateway = require('../../../services/qrGateway');
const MetaGateway = require('../../../services/metaGateway');
const db = require('../../../config/database');

/**
 * @route GET /api/v1/devices
 * @desc Get live status for all gateways (Meta + QR Devices)
 */
router.get('/', async (req, res) => {
  try {
    const gateways = await db.query('SELECT * FROM gateways ORDER BY id ASC');
    const qrStatus = qrGateway.getSessionInfo('primary_qr_session');
    const metaCreds = await MetaGateway.getCredentials();

    const enriched = gateways.map(gw => {
      if (gw.type === 'qr') {
        return {
          ...gw,
          liveStatus: qrStatus.status,
          phoneNumber: qrStatus.phoneNumber || gw.phone_number,
          pushName: qrStatus.pushName,
          qr: qrStatus.qr
        };
      } else {
        return {
          ...gw,
          isConfigured: !!(metaCreds.accessToken && metaCreds.phoneNumberId),
          phoneNumberId: metaCreds.phoneNumberId,
          wabaId: metaCreds.wabaId
        };
      }
    });

    return res.status(200).json({
      success: true,
      data: enriched
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/v1/devices/qr/init
 * @desc Initialize or refresh QR Code scanner for WhatsApp Web
 */
router.post('/qr/init', async (req, res) => {
  try {
    const sessionId = req.body.sessionId || 'primary_qr_session';
    await qrGateway.initSession(sessionId);
    const info = qrGateway.getSessionInfo(sessionId);

    return res.status(200).json({
      success: true,
      message: 'QR session initialization triggered.',
      data: info
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/v1/devices/qr/logout
 * @desc Disconnect WhatsApp session from device
 */
router.post('/qr/logout', async (req, res) => {
  try {
    const sessionId = req.body.sessionId || 'primary_qr_session';
    const result = await qrGateway.logoutSession(sessionId);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/v1/devices/meta/test
 * @desc Test Meta WhatsApp Cloud API credentials
 */
router.post('/meta/test', async (req, res) => {
  try {
    const testResult = await MetaGateway.testConnection();
    return res.status(testResult.success ? 200 : 400).json(testResult);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
