/**
 * Unified SMS Gateway & Android Mobile SIM Management Routes (/api/v1/sms)
 * Handles Android Phone Pairing, Queue Polling, Direct SMS, Bulk Campaigns, and 3rd Party Integrations.
 */

const express = require('express');
const router = express.Router();
const smsQueueEngine = require('../../../services/smsQueueEngine');
const ThirdPartySmsGateway = require('../../../services/thirdPartySmsGateway');
const db = require('../../../config/database');
const jwtAuth = require('../../../middlewares/jwtAuth');
const apiKeyAuth = require('../../../middlewares/apiKeyAuth');

/**
 * Flexible Authenticator Middleware (Supports JWT or API Key)
 */
async function flexibleAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const apiKeyHeader = req.headers['x-api-key'] || req.query.api_key;

  if (authHeader.startsWith('Bearer ') && !authHeader.includes('un_live_')) {
    return jwtAuth(req, res, next);
  } else if (apiKeyHeader || authHeader.includes('un_live_')) {
    return apiKeyAuth(req, res, next);
  } else {
    // Default to public/demo user if not specified in local dev
    const defaultUser = await db.getOne('SELECT id, role FROM users ORDER BY id ASC LIMIT 1');
    if (defaultUser) {
      req.user = defaultUser;
      return next();
    }
    return res.status(401).json({ success: false, message: 'Authentication required (Bearer JWT or X-API-Key)' });
  }
}

function getUserId(req) {
  if (req.user && req.user.id) return req.user.id;
  if (req.apiKey && req.apiKey.user_id) return req.apiKey.user_id;
  return 1;
}

/* ════════════════════════════════════════════════════
   1. ANDROID APP DIRECT APIs (AUTHENTICATED VIA DEVICE TOKEN)
   ════════════════════════════════════════════════════ */

/**
 * POST /api/v1/sms/device/pair
 * Android App sends pairing code to bind with the SaaS account
 */
router.post('/device/pair', async (req, res) => {
  try {
    const { pairing_code, pairingCode, device_name, deviceName, phone_number, phoneNumber, sim1_operator, sim1Operator, sim2_operator, sim2Operator, battery_level, batteryLevel, is_charging, isCharging } = req.body;
    const code = pairing_code || pairingCode;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Pairing code is required.' });
    }

    const result = await smsQueueEngine.pairDeviceWithCode(code, {
      deviceName: device_name || deviceName,
      phoneNumber: phone_number || phoneNumber,
      sim1Operator: sim1_operator || sim1Operator,
      sim2Operator: sim2_operator || sim2Operator,
      batteryLevel: battery_level !== undefined ? battery_level : batteryLevel,
      isCharging: is_charging !== undefined ? is_charging : isCharging
    });

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/v1/sms/device/heartbeat
 * Android background service reports battery %, charging status, and SIM states
 */
router.post('/device/heartbeat', async (req, res) => {
  try {
    const deviceToken = req.headers['x-device-token'] || req.query.device_token || req.body.device_token;
    if (!deviceToken) {
      return res.status(401).json({ success: false, message: 'Device token required in X-Device-Token header.' });
    }

    const { battery_level, batteryLevel, is_charging, isCharging, sim1_operator, sim1Operator, sim2_operator, sim2Operator } = req.body;
    const result = await smsQueueEngine.updateHeartbeat(deviceToken, {
      batteryLevel: battery_level !== undefined ? battery_level : batteryLevel,
      isCharging: is_charging !== undefined ? is_charging : isCharging,
      sim1Operator: sim1_operator || sim1Operator,
      sim2Operator: sim2_operator || sim2Operator
    });

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/v1/sms/device/queue
 * Android App polls pending SMS jobs to dispatch through local SIM 1 or SIM 2
 */
router.get('/device/queue', async (req, res) => {
  try {
    const deviceToken = req.headers['x-device-token'] || req.query.device_token;
    if (!deviceToken) {
      return res.status(401).json({ success: false, message: 'Device token required.' });
    }

    const limit = parseInt(req.query.limit || '5', 10);
    const jobs = await smsQueueEngine.getPendingQueue(deviceToken, limit);

    return res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/v1/sms/device/ack
 * Android App confirms SMS was sent or failed by modem
 */
router.post('/device/ack', async (req, res) => {
  try {
    const deviceToken = req.headers['x-device-token'] || req.query.device_token;
    if (!deviceToken) {
      return res.status(401).json({ success: false, message: 'Device token required.' });
    }

    const { job_id, jobId, status, error_reason, errorReason } = req.body;
    const targetJobId = job_id || jobId;
    if (!targetJobId || !status) {
      return res.status(400).json({ success: false, message: 'job_id and status are required.' });
    }

    const result = await smsQueueEngine.acknowledgeJob(deviceToken, targetJobId, status, error_reason || errorReason);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* ════════════════════════════════════════════════════
   2. CLIENT DASHBOARD & API DISPATCH ENDPOINTS
   ════════════════════════════════════════════════════ */

/**
 * POST /api/v1/sms/device/pair-request
 * Client generates a new 6-character Pairing Code to enter in their Android App
 */
router.post('/device/pair-request', flexibleAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const deviceName = req.body.deviceName || req.body.device_name || 'My Android Phone';
    const pairing = await smsQueueEngine.createPairingCode(userId, deviceName);

    return res.status(200).json({
      success: true,
      message: 'Pairing code generated',
      data: {
        code: pairing.pairingCode,
        pairingCode: pairing.pairingCode,
        deviceToken: pairing.deviceToken,
        device: pairing.device
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/v1/sms/devices
 * List all paired Android SMS devices for the logged-in client
 */
router.get('/devices', flexibleAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const devices = await db.query(
      `SELECT id, device_name, phone_number, sim1_operator, sim2_operator, default_sim_slot, battery_level, is_charging, status, last_seen_at, created_at
       FROM sms_devices 
       WHERE user_id = ? 
       ORDER BY id DESC`,
      [userId]
    );

    // Also get active 3rd party providers
    const thirdParty = await db.query(
      'SELECT id, provider_name, api_url, sender_id, is_active FROM sms_gateways WHERE user_id = ? OR user_id IS NULL',
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: devices,
      devices,
      thirdParty
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/v1/sms/devices/:id
 * Unpair and delete an Android SMS device
 */
router.delete('/devices/:id', flexibleAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    await db.query('DELETE FROM sms_devices WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    return res.status(200).json({ success: true, message: 'Device unpaired and removed successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST or PUT /api/v1/sms/devices/:id/default-sim
 * Toggle default SIM slot (1 or 2)
 */
router.all('/devices/:id/default-sim', flexibleAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const simSlot = parseInt(req.body.simSlot || req.body.sim_slot) === 2 ? 2 : 1;
    await db.query('UPDATE sms_devices SET default_sim_slot = ? WHERE id = ? AND user_id = ?', [simSlot, req.params.id, userId]);
    return res.status(200).json({ success: true, message: `Default SIM slot updated to SIM ${simSlot}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/v1/sms/send
 * Unified SMS Dispatch API
 */
router.post('/send', flexibleAuth, async (req, res) => {
  const { phone, recipient, message, simSlot, sim_slot, gateway, gateway_type, deviceId, device_id } = req.body;
  const targetPhone = phone || recipient;

  if (!targetPhone || !message) {
    return res.status(400).json({ success: false, message: 'Both phone/recipient and message are required.' });
  }

  try {
    const userId = getUserId(req);
    const result = await smsQueueEngine.enqueueSms({
      userId,
      recipient: targetPhone,
      message,
      gatewayType: gateway || gateway_type || 'android_sim',
      simSlot: simSlot || sim_slot || 1,
      deviceId: deviceId || device_id || null
    });

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/v1/sms/broadcast
 * Bulk SMS Campaign Dispatch via Android SIM 1 / SIM 2 or 3rd Party
 */
router.post('/broadcast', flexibleAuth, async (req, res) => {
  const { name, campaign_name, contacts, recipients, message, simSlot, sim_slot, gateway, gateway_type, deviceId, device_id } = req.body;
  const list = contacts || recipients;
  const campaignTitle = name || campaign_name || 'SMS Campaign';

  if (!list || !Array.isArray(list) || list.length === 0) {
    return res.status(400).json({ success: false, message: 'A non-empty contacts/recipients array is required.' });
  }
  if (!message) {
    return res.status(400).json({ success: false, message: 'Message content is required.' });
  }

  try {
    const userId = getUserId(req);
    const queuedJobs = [];

    for (const c of list) {
      const recipientPhone = typeof c === 'string' ? c : (c.phone || c.recipient);
      const recipientName = typeof c === 'object' ? (c.name || '') : '';
      const personalizedMsg = message.replace(/{name}/gi, recipientName || 'Customer');

      if (recipientPhone) {
        const job = await smsQueueEngine.enqueueSms({
          userId,
          recipient: recipientPhone,
          message: personalizedMsg,
          gatewayType: gateway || gateway_type || 'android_sim',
          simSlot: simSlot || sim_slot || 1,
          deviceId: deviceId || device_id || null
        });
        queuedJobs.push(job);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Broadcast '${campaignTitle}' scheduled: ${queuedJobs.length} messages queued for dispatch.`,
      data: {
        queued_count: queuedJobs.length,
        jobs: queuedJobs
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/v1/sms/logs
 * Retrieve SMS transmission history
 */
router.get('/logs', flexibleAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { status, limit = 50, search } = req.query;

    let sql = 'SELECT * FROM sms_queue WHERE user_id = ?';
    const params = [userId];

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (search) {
      sql += ' AND (recipient LIKE ? OR message LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY id DESC LIMIT ?';
    params.push(parseInt(limit));

    const logs = await db.query(sql, params);
    return res.status(200).json({ success: true, data: logs, logs, count: logs.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/v1/sms/jobs/:id/retry
 * Retry a failed SMS job
 */
router.post('/jobs/:id/retry', flexibleAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    await db.query(
      `UPDATE sms_queue 
       SET status = 'queued', attempts = 0, error_reason = NULL, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND user_id = ?`,
      [req.params.id, userId]
    );
    return res.status(200).json({ success: true, message: 'SMS job requeued for dispatch.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/v1/sms/settings/third-party
 * Get 3rd party SMS gateway settings
 */
router.get('/settings/third-party', flexibleAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const rows = await db.query('SELECT provider_name, api_url, api_key, sender_id, is_active FROM sms_gateways WHERE user_id = ? OR user_id IS NULL', [userId]);
    const configMap = {};
    for (const row of rows) {
      configMap[row.provider_name] = {
        token: row.api_key,
        api_key: row.api_key,
        url: row.api_url,
        sender_id: row.sender_id,
        is_active: !!row.is_active
      };
    }
    return res.status(200).json({ success: true, data: configMap });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/v1/sms/settings/third-party
 * Save or update 3rd party SMS gateway configuration (Greenweb, BulkSMSBD, Custom HTTP)
 */
router.post('/settings/third-party', flexibleAuth, async (req, res) => {
  const { provider_name, api_url, url, api_key, token, sender_id, is_active } = req.body;
  if (!provider_name) {
    return res.status(400).json({ success: false, message: 'Provider name is required.' });
  }

  const finalKey = api_key || token || '';
  const finalUrl = api_url || url || '';

  try {
    const userId = getUserId(req);
    const existing = await db.getOne('SELECT id FROM sms_gateways WHERE provider_name = ? AND (user_id = ? OR user_id IS NULL)', [provider_name, userId]);

    if (existing) {
      await db.query(
        `UPDATE sms_gateways 
         SET api_url = ?, api_key = ?, sender_id = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [finalUrl, finalKey, sender_id || '', is_active ? 1 : 0, existing.id]
      );
    } else {
      await db.query(
        `INSERT INTO sms_gateways (user_id, provider_name, api_url, api_key, sender_id, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, provider_name, finalUrl, finalKey, sender_id || '', is_active ? 1 : 0]
      );
    }

    return res.status(200).json({ success: true, message: `Third-party SMS provider '${provider_name}' saved successfully.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
