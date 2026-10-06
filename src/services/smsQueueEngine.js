/**
 * SMS Queue & Android Gateway Engine
 * Handles pairing, real-time WebSocket dispatch, polling queue, dual-SIM routing, and 3rd party fallback.
 */

const crypto = require('crypto');
const db = require('../config/database');
const ThirdPartySmsGateway = require('./thirdPartySmsGateway');

class SmsQueueEngine {
  constructor() {
    this.socketEmitters = new Set();
    this.connectedDevices = new Map(); // deviceToken -> socket instance
  }

  /**
   * Register global Socket.io emitter
   */
  registerSocketEmitter(emitter) {
    this.socketEmitters.add(emitter);
  }

  /**
   * Broadcast real-time state to connected dashboard clients
   */
  broadcast(event, data) {
    for (const emitter of this.socketEmitters) {
      if (typeof emitter.emit === 'function') {
        emitter.emit(event, data);
      }
    }
  }

  /**
   * Generate a random 6-character uppercase pairing code
   */
  generatePairingCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Request a new Pairing Session for Android App
   */
  async createPairingCode(userId, deviceName = 'Android Phone') {
    const pairingCode = this.generatePairingCode();
    const deviceToken = 'sms_' + crypto.randomBytes(24).toString('hex');

    await db.query(
      `INSERT INTO sms_devices (user_id, device_name, device_token, pairing_code, status, default_sim_slot, battery_level, is_charging)
       VALUES (?, ?, ?, ?, 'OFFLINE', 1, 100, 0)`,
      [userId, deviceName, deviceToken, pairingCode]
    );

    const device = await db.getOne('SELECT * FROM sms_devices WHERE device_token = ?', [deviceToken]);
    return {
      success: true,
      pairingCode,
      deviceToken,
      device
    };
  }

  /**
   * Android App calls this to pair with the server
   */
  async pairDeviceWithCode(pairingCode, deviceDetails = {}) {
    const device = await db.getOne(
      'SELECT * FROM sms_devices WHERE pairing_code = ? ORDER BY id DESC LIMIT 1',
      [pairingCode.toUpperCase().trim()]
    );

    if (!device) {
      throw new Error('Invalid or expired pairing code.');
    }

    const {
      deviceName,
      phoneNumber,
      sim1Operator,
      sim2Operator,
      batteryLevel,
      isCharging
    } = deviceDetails;

    await db.query(
      `UPDATE sms_devices 
       SET device_name = COALESCE(?, device_name),
           phone_number = ?,
           sim1_operator = ?,
           sim2_operator = ?,
           battery_level = ?,
           is_charging = ?,
           status = 'ONLINE',
           pairing_code = NULL,
           last_seen_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        deviceName || device.device_name,
        phoneNumber || null,
        sim1Operator || 'SIM 1',
        sim2Operator || 'SIM 2',
        batteryLevel || 100,
        isCharging ? 1 : 0,
        device.id
      ]
    );

    const updated = await db.getOne('SELECT * FROM sms_devices WHERE id = ?', [device.id]);
    this.broadcast('sms_device_updated', updated);

    return {
      success: true,
      message: 'Android SMS Gateway paired successfully.',
      deviceToken: device.device_token,
      device_token: device.device_token,
      deviceId: String(device.id),
      id: String(device.id),
      device: updated,
      data: {
        id: String(updated.id),
        deviceId: String(updated.id),
        device_id: String(updated.id),
        device_token: device.device_token,
        deviceToken: device.device_token,
        device_name: updated.device_name,
        phone_number: updated.phone_number,
        status: updated.status
      }
    };
  }

  /**
   * Heartbeat from Android App (every 30s)
   */
  async updateHeartbeat(deviceToken, stats = {}) {
    const device = await db.getOne('SELECT * FROM sms_devices WHERE device_token = ?', [deviceToken]);
    if (!device) throw new Error('Device not found with provided token.');

    const {
      batteryLevel,
      isCharging,
      sim1Operator,
      sim2Operator,
      phoneNumber
    } = stats;

    await db.query(
      `UPDATE sms_devices 
       SET battery_level = COALESCE(?, battery_level),
           is_charging = COALESCE(?, is_charging),
           sim1_operator = COALESCE(?, sim1_operator),
           sim2_operator = COALESCE(?, sim2_operator),
           phone_number = COALESCE(?, phone_number),
           status = 'ONLINE',
           last_seen_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        batteryLevel !== undefined ? batteryLevel : null,
        isCharging !== undefined ? (isCharging ? 1 : 0) : null,
        sim1Operator !== undefined ? sim1Operator : null,
        sim2Operator !== undefined ? sim2Operator : null,
        phoneNumber !== undefined ? phoneNumber : null,
        device.id
      ]
    );

    this.broadcast('sms_heartbeat', {
      device_id: device.id,
      battery_level: batteryLevel,
      is_charging: isCharging
    });

    return { success: true };
  }

  /**
   * Calculate SMS parts and charset
   */
  calculateSmsParts(text) {
    if (!text) return { parts: 1, isUnicode: false, charCount: 0 };
    const isUnicode = /[^\u0000-\u00ff]/.test(text);
    const length = text.length;
    let parts = 1;
    if (isUnicode) {
      if (length <= 70) parts = 1;
      else parts = Math.ceil(length / 67);
    } else {
      if (length <= 160) parts = 1;
      else parts = Math.ceil(length / 153);
    }
    return { parts: Math.max(1, parts), isUnicode, charCount: length };
  }

  /**
   * Enqueue a new SMS for delivery with automated SaaS Pay-as-you-go balance verification
   * Routing is decided centrally by Admin settings and assigned dedicated nodes.
   */
  async enqueueSms({ userId, recipient, message, gatewayType = 'auto', simSlot = null, deviceId = null }) {
    const cleanPhone = recipient.replace(/[^\d+]/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      throw new Error('Invalid recipient phone number.');
    }

    const { parts, isUnicode, charCount } = this.calculateSmsParts(message);

    // 1. Fetch User SMS Wallet & Package Rates
    let user = await db.getOne('SELECT id, name, sms_balance, sms_credits, custom_sms_rate FROM users WHERE id = ?', [userId]);
    if (!user) {
      user = await db.getOne('SELECT id, name, sms_balance, sms_credits, custom_sms_rate FROM users ORDER BY id ASC LIMIT 1');
    }
    if (!user) {
      user = { id: 1, name: 'Master Account', sms_balance: 1000.0, sms_credits: 5000, custom_sms_rate: null };
    }

    const defaultRateSetting = await db.getOne('SELECT setting_value FROM system_settings WHERE setting_key = "default_sms_rate"');
    const baseRate = parseFloat(defaultRateSetting?.setting_value || '0.35');
    const userRate = user.custom_sms_rate !== null ? parseFloat(user.custom_sms_rate) : baseRate;
    const totalCost = parts * userRate;

    let paymentSource = 'BALANCE';
    const currentCredits = parseInt(user.sms_credits || 0, 10);
    const currentBalance = parseFloat(user.sms_balance || 0);

    // 2. Resolve Dispatch Gateway & Node (Decided by Admin / System)
    let assignedDevice = null;
    let thirdPartyProvider = null;
    let sharedDevice = null;

    // Check A: Admin assigned dedicated device/SIM for this user
    assignedDevice = await db.getOne(
      'SELECT * FROM sms_devices WHERE assigned_user_id = ? AND status = "ONLINE" ORDER BY last_seen_at DESC LIMIT 1',
      [userId]
    ) || await db.getOne('SELECT * FROM sms_devices WHERE user_id = ? AND status = "ONLINE" ORDER BY last_seen_at DESC LIMIT 1', [userId]);

    if (!assignedDevice) {
      assignedDevice = await db.getOne('SELECT * FROM sms_devices WHERE assigned_user_id = ? OR user_id = ? ORDER BY id DESC LIMIT 1', [userId, userId]);
    }

    // Check B: Admin Default 3rd Party Gateway (e.g. Greenweb, BulkSMSBD)
    thirdPartyProvider = await db.getOne('SELECT * FROM sms_gateways WHERE is_default = 1 AND is_active = 1 LIMIT 1')
      || await db.getOne('SELECT * FROM sms_gateways WHERE is_active = 1 LIMIT 1');

    // Check C: Admin Shared Android Gateway Node
    sharedDevice = await db.getOne(
      'SELECT * FROM sms_devices WHERE is_shared = 1 AND status = "ONLINE" ORDER BY last_seen_at DESC LIMIT 1'
    ) || await db.getOne('SELECT * FROM sms_devices WHERE is_shared = 1 ORDER BY id DESC LIMIT 1');

    if (!assignedDevice && !thirdPartyProvider && !sharedDevice) {
      throw new Error('No active SMS gateway configured on the platform. Please contact support.');
    }

    // 3. Balance / Credit Validation
    const isFreePersonalDevice = assignedDevice && assignedDevice.user_id === userId && !assignedDevice.assigned_user_id;
    if (!isFreePersonalDevice) {
      if (currentCredits >= parts) {
        paymentSource = 'CREDITS';
      } else if (currentBalance >= totalCost) {
        paymentSource = 'BALANCE';
      } else {
        throw new Error(`Insufficient SMS Balance. Cost for ${parts} SMS part(s) is ৳${totalCost.toFixed(2)} (Rate: ৳${userRate.toFixed(2)}/SMS). Your Balance: ৳${currentBalance.toFixed(2)} (Credits: ${currentCredits}). Please recharge your SMS wallet.`);
      }

      // Pre-deduct
      if (paymentSource === 'CREDITS') {
        const newCredits = currentCredits - parts;
        await db.query('UPDATE users SET sms_credits = ? WHERE id = ?', [newCredits, userId]);
        await db.query(
          `INSERT INTO sms_transactions (user_id, type, amount_bdt, sms_count, rate_per_sms, balance_after, description, status, created_at)
           VALUES (?, 'SMS_DEBIT', 0.0000, ?, ?, ?, ?, 'COMPLETED', CURRENT_TIMESTAMP)`,
          [userId, parts, userRate, currentBalance, `SMS to ${cleanPhone} (${parts} part(s), ${charCount} chars)`]
        );
      } else {
        const newBalance = currentBalance - totalCost;
        await db.query('UPDATE users SET sms_balance = ? WHERE id = ?', [newBalance, userId]);
        await db.query(
          `INSERT INTO sms_transactions (user_id, type, amount_bdt, sms_count, rate_per_sms, balance_after, description, status, created_at)
           VALUES (?, 'SMS_DEBIT', ?, ?, ?, ?, ?, 'COMPLETED', CURRENT_TIMESTAMP)`,
          [userId, totalCost, parts, userRate, newBalance, `SMS to ${cleanPhone} (${parts} part(s) @ ৳${userRate.toFixed(2)}/SMS)`]
        );
      }
    }

    // 4. Execution Option 1: Dedicated / Paired Android Node
    const targetNode = assignedDevice || sharedDevice;
    if (targetNode && (!thirdPartyProvider || assignedDevice)) {
      const slot = simSlot ? parseInt(simSlot) : (targetNode.default_sim_slot || 1);
      const qRes = await db.query(
        `INSERT INTO sms_queue (user_id, device_id, gateway_type, sim_slot, recipient, message, status, cost_bdt, sms_parts, charged, created_at, updated_at)
         VALUES (?, ?, 'android_sim', ?, ?, ?, 'PENDING', ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [userId, targetNode.id, slot, cleanPhone, message, isFreePersonalDevice ? 0.0000 : totalCost, parts]
      );

      const jobId = qRes.insertId || qRes.lastID;
      this.broadcast('sms_dispatch_job', {
        jobId,
        recipient: cleanPhone,
        message,
        simSlot: slot,
        deviceId: targetNode.id,
        deviceToken: targetNode.device_token
      });

      return {
        success: true,
        message: 'SMS queued for delivery',
        jobId,
        job_id: jobId,
        recipient: cleanPhone,
        smsParts: parts,
        sms_parts: parts,
        cost: isFreePersonalDevice ? 0 : totalCost,
        remainingBalance: isFreePersonalDevice ? currentBalance : (paymentSource === 'BALANCE' ? currentBalance - totalCost : currentBalance),
        remainingCredits: isFreePersonalDevice ? currentCredits : (paymentSource === 'CREDITS' ? currentCredits - parts : currentCredits)
      };
    }

    // Execution Option 2: 3rd Party Cloud Gateway
    if (thirdPartyProvider) {
      try {
        const result = await ThirdPartySmsGateway.dispatch(thirdPartyProvider, cleanPhone, message);
        await db.query(
          `INSERT INTO sms_queue (user_id, gateway_type, recipient, message, status, cost_bdt, sms_parts, charged, sent_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'SENT', ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [userId, thirdPartyProvider.provider_name, cleanPhone, message, totalCost, parts]
        );
        return {
          success: true,
          message: `SMS dispatched successfully (${thirdPartyProvider.provider_name})`,
          recipient: cleanPhone,
          smsParts: parts,
          sms_parts: parts,
          cost: totalCost,
          remainingBalance: paymentSource === 'BALANCE' ? currentBalance - totalCost : currentBalance,
          remainingCredits: paymentSource === 'CREDITS' ? currentCredits - parts : currentCredits,
          result
        };
      } catch (err) {
        // Automatic Refund on immediate gateway failure
        if (paymentSource === 'CREDITS') {
          await db.query('UPDATE users SET sms_credits = sms_credits + ? WHERE id = ?', [parts, userId]);
        } else {
          await db.query('UPDATE users SET sms_balance = sms_balance + ? WHERE id = ?', [totalCost, userId]);
        }
        await db.query(
          `INSERT INTO sms_queue (user_id, gateway_type, recipient, message, status, cost_bdt, sms_parts, charged, error_reason, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'FAILED', 0.0000, ?, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [userId, thirdPartyProvider.provider_name, cleanPhone, message, parts, err.message]
        );
        throw err;
      }
    }

    throw new Error('No active SMS gateway route could be resolved. Please contact admin.');
  }

  /**
   * Android App fetches pending batch of SMS
   */
  async getPendingQueue(deviceToken, limit = 10) {
    const device = await db.getOne('SELECT * FROM sms_devices WHERE device_token = ?', [deviceToken]);
    if (!device) throw new Error('Unauthorized device token.');

    // Fetch jobs that are PENDING or previously marked PROCESSING without completion (>45s)
    const jobs = await db.query(
      `SELECT id, id as jobId, id as job_id, recipient, message, sim_slot, sim_slot as simSlot, created_at, created_at as createdAt
       FROM sms_queue 
       WHERE (device_id = ? OR device_id IS NULL) 
         AND (
           status = 'PENDING' 
           OR status = 'QUEUED' 
           OR (status = 'PROCESSING' AND updated_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 45 SECOND))
         )
       ORDER BY id ASC LIMIT ?`,
      [device.id, parseInt(limit)]
    );

    if (jobs.length > 0) {
      const jobIds = jobs.map(j => j.id || j.jobId);
      await db.query(
        `UPDATE sms_queue SET device_id = ?, status = 'PROCESSING', attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP WHERE id IN (${jobIds.join(',')})`,
        [device.id]
      );
    }

    return jobs;
  }

  /**
   * Android App reports delivery status back
   */
  async acknowledgeJob(deviceToken, jobIdOrObj, statusParam = 'SENT', errorParam = null) {
    const device = await db.getOne('SELECT * FROM sms_devices WHERE device_token = ?', [deviceToken]);
    if (!device) throw new Error('Unauthorized device token.');

    let jobId = null;
    let status = 'SENT';
    let errorReason = null;

    if (typeof jobIdOrObj === 'object' && jobIdOrObj !== null) {
      jobId = jobIdOrObj.jobId || jobIdOrObj.job_id || jobIdOrObj.id;
      status = jobIdOrObj.status || statusParam;
      errorReason = jobIdOrObj.errorReason || jobIdOrObj.error_reason || errorParam;
    } else {
      jobId = jobIdOrObj;
      status = statusParam;
      errorReason = errorParam;
    }

    if (!jobId) {
      throw new Error('Valid jobId is required for acknowledgement.');
    }

    const cleanStatus = ['SENT', 'DELIVERED', 'FAILED', 'sent', 'delivered', 'failed'].includes(status) 
      ? status.toUpperCase() 
      : 'SENT';

    let sql = 'UPDATE sms_queue SET status = ?, error_reason = ?, updated_at = CURRENT_TIMESTAMP';
    const params = [cleanStatus, errorReason || null];

    if (cleanStatus === 'SENT') {
      sql += ', sent_at = CURRENT_TIMESTAMP';
    } else if (cleanStatus === 'DELIVERED') {
      sql += ', delivered_at = CURRENT_TIMESTAMP';
    }

    sql += ' WHERE id = ?';
    params.push(jobId);

    await db.query(sql, params);
    this.broadcast('sms_job_updated', { jobId, status: cleanStatus, deviceId: device.id });

    return { success: true, message: `Job #${jobId} status updated to ${cleanStatus}` };
  }
}

const smsQueueEngineInstance = new SmsQueueEngine();
module.exports = smsQueueEngineInstance;
