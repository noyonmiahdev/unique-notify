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
   * Enqueue a new SMS for delivery with automated Pay-as-you-go balance verification
   */
  async enqueueSms({ userId, recipient, message, gatewayType = 'android_sim', simSlot = 1, deviceId = null }) {
    const cleanPhone = recipient.replace(/[^\d+]/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      throw new Error('Invalid recipient phone number.');
    }

    const { parts, isUnicode, charCount } = this.calculateSmsParts(message);

    // 1. If Cloud Gateway / Platform Route is selected, handle Pay-as-you-go billing
    if (gatewayType !== 'android_sim' && gatewayType !== 'dedicated_sim') {
      // Find active 3rd party gateway configured by Admin
      let provider = null;
      if (gatewayType && gatewayType !== 'auto' && gatewayType !== 'cloud_gateway') {
        provider = await db.getOne('SELECT * FROM sms_gateways WHERE provider_name = ? AND is_active = 1', [gatewayType]);
      } else {
        provider = await db.getOne('SELECT * FROM sms_gateways WHERE is_default = 1 AND is_active = 1 LIMIT 1');
        if (!provider) {
          provider = await db.getOne('SELECT * FROM sms_gateways WHERE is_active = 1 LIMIT 1');
        }
      }

      // If no 3rd party gateway, check if Admin has a Shared Android Node (is_shared = 1)
      let sharedDevice = null;
      if (!provider) {
        sharedDevice = await db.getOne(
          'SELECT * FROM sms_devices WHERE is_shared = 1 AND status = "ONLINE" ORDER BY last_seen_at DESC LIMIT 1'
        ) || await db.getOne('SELECT * FROM sms_devices WHERE is_shared = 1 ORDER BY id DESC LIMIT 1');
      }

      if (!provider && !sharedDevice) {
        throw new Error('No active Platform SMS Gateway or Android Node configured by Admin. Please contact support.');
      }

      // Check User SMS Wallet Balance & Rate
      const user = await db.getOne('SELECT id, name, sms_balance, sms_credits, custom_sms_rate FROM users WHERE id = ?', [userId]);
      if (!user) throw new Error('User account not found.');

      const defaultRateSetting = await db.getOne('SELECT setting_value FROM system_settings WHERE setting_key = "default_sms_rate"');
      const baseRate = parseFloat(defaultRateSetting?.setting_value || '0.35');
      const userRate = user.custom_sms_rate !== null ? parseFloat(user.custom_sms_rate) : baseRate;
      const totalCost = parts * userRate;

      let paymentSource = 'BALANCE';
      const currentCredits = parseInt(user.sms_credits || 0, 10);
      const currentBalance = parseFloat(user.sms_balance || 0);

      // Verify balance
      if (currentCredits >= parts) {
        paymentSource = 'CREDITS';
      } else if (currentBalance >= totalCost) {
        paymentSource = 'BALANCE';
      } else {
        throw new Error(`Insufficient SMS Balance. Cost for ${parts} part(s) is ৳${totalCost.toFixed(2)} (Rate: ৳${userRate.toFixed(2)}/SMS). Your Balance: ৳${currentBalance.toFixed(2)} (Credits: ${currentCredits}). Please recharge your SMS wallet.`);
      }

      // Pre-deduct balance / credits
      let newBalance = currentBalance;
      let newCredits = currentCredits;
      if (paymentSource === 'CREDITS') {
        newCredits = currentCredits - parts;
        await db.query('UPDATE users SET sms_credits = ? WHERE id = ?', [newCredits, userId]);
        await db.query(
          `INSERT INTO sms_transactions (user_id, type, amount_bdt, sms_count, rate_per_sms, balance_after, description, status, created_at)
           VALUES (?, 'SMS_DEBIT', 0.0000, ?, ?, ?, ?, 'COMPLETED', CURRENT_TIMESTAMP)`,
          [userId, parts, userRate, newBalance, `SMS to ${cleanPhone} (${parts} part(s), ${charCount} chars)`]
        );
      } else {
        newBalance = currentBalance - totalCost;
        await db.query('UPDATE users SET sms_balance = ? WHERE id = ?', [newBalance, userId]);
        await db.query(
          `INSERT INTO sms_transactions (user_id, type, amount_bdt, sms_count, rate_per_sms, balance_after, description, status, created_at)
           VALUES (?, 'SMS_DEBIT', ?, ?, ?, ?, ?, 'COMPLETED', CURRENT_TIMESTAMP)`,
          [userId, totalCost, parts, userRate, newBalance, `SMS to ${cleanPhone} (${parts} part(s) @ ৳${userRate.toFixed(2)}/SMS)`]
        );
      }

      // Dispatch Option A: Third Party SMS Gateway (Greenweb, BulkSMSBD, HTTP)
      if (provider) {
        try {
          const result = await ThirdPartySmsGateway.dispatch(provider, cleanPhone, message);
          await db.query(
            `INSERT INTO sms_queue (user_id, gateway_type, recipient, message, status, cost_bdt, sms_parts, charged, sent_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'SENT', ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [userId, provider.provider_name, cleanPhone, message, totalCost, parts]
          );
          return {
            success: true,
            message: `SMS dispatched via Cloud Gateway (${provider.provider_name})`,
            charged: totalCost,
            smsParts: parts,
            remainingBalance: newBalance,
            remainingCredits: newCredits,
            result
          };
        } catch (err) {
          // Automatic Refund on failure
          if (paymentSource === 'CREDITS') {
            await db.query('UPDATE users SET sms_credits = sms_credits + ? WHERE id = ?', [parts, userId]);
            await db.query(
              `INSERT INTO sms_transactions (user_id, type, amount_bdt, sms_count, rate_per_sms, balance_after, description, status, created_at)
               VALUES (?, 'REFUND', 0.0000, ?, ?, ?, ?, 'COMPLETED', CURRENT_TIMESTAMP)`,
              [userId, parts, userRate, newBalance, `Refund: SMS Delivery Failed (${err.message})`]
            );
          } else {
            await db.query('UPDATE users SET sms_balance = sms_balance + ? WHERE id = ?', [totalCost, userId]);
            await db.query(
              `INSERT INTO sms_transactions (user_id, type, amount_bdt, sms_count, rate_per_sms, balance_after, description, status, created_at)
               VALUES (?, 'REFUND', ?, ?, ?, ?, ?, 'COMPLETED', CURRENT_TIMESTAMP)`,
              [userId, totalCost, parts, userRate, currentBalance, `Refund: SMS Delivery Failed (${err.message})`]
            );
          }

          await db.query(
            `INSERT INTO sms_queue (user_id, gateway_type, recipient, message, status, cost_bdt, sms_parts, charged, error_reason, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'FAILED', 0.0000, ?, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [userId, provider.provider_name, cleanPhone, message, parts, err.message]
          );
          throw err;
        }
      }

      // Dispatch Option B: Platform Shared Android Gateway Node
      if (sharedDevice) {
        const slot = parseInt(simSlot) || sharedDevice.default_sim_slot || 1;
        const senderLabel = slot === 1 ? (sharedDevice.sim1_sender_id || sharedDevice.sim1_operator || 'SIM 1') : (sharedDevice.sim2_sender_id || sharedDevice.sim2_operator || 'SIM 2');

        const qRes = await db.query(
          `INSERT INTO sms_queue (user_id, device_id, gateway_type, sim_slot, recipient, message, status, cost_bdt, sms_parts, charged, created_at, updated_at)
           VALUES (?, ?, 'cloud_gateway', ?, ?, ?, 'PENDING', ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [userId, sharedDevice.id, slot, cleanPhone, message, totalCost, parts]
        );

        const jobId = qRes.insertId || qRes.lastID;
        const jobData = {
          jobId,
          recipient: cleanPhone,
          message,
          simSlot: slot,
          deviceId: sharedDevice.id,
          deviceToken: sharedDevice.device_token
        };

        this.broadcast('sms_dispatch_job', jobData);

        return {
          success: true,
          message: `SMS queued via Platform Gateway (${senderLabel})`,
          jobId,
          cost: totalCost,
          smsParts: parts,
          remainingBalance: newBalance,
          remainingCredits: newCredits
        };
      }
    }

    // 2. Resolve target Android Device (User Phone SIM or Admin Assigned Dedicated Node)
    let targetDevice = null;
    if (deviceId) {
      targetDevice = await db.getOne('SELECT * FROM sms_devices WHERE id = ? AND (user_id = ? OR assigned_user_id = ? OR is_shared = 1)', [deviceId, userId, userId]);
    } else {
      // Pick active online device (Paired by user OR dedicated assigned by Admin)
      targetDevice = await db.getOne(
        'SELECT * FROM sms_devices WHERE (user_id = ? OR assigned_user_id = ?) AND status = "ONLINE" ORDER BY last_seen_at DESC LIMIT 1',
        [userId, userId]
      );
      if (!targetDevice) {
        targetDevice = await db.getOne(
          'SELECT * FROM sms_devices WHERE (user_id = ? OR assigned_user_id = ?) ORDER BY id DESC LIMIT 1',
          [userId, userId]
        );
      }
      // If still no personal/assigned device, fallback to Admin shared node if exists
      if (!targetDevice) {
        targetDevice = await db.getOne(
          'SELECT * FROM sms_devices WHERE is_shared = 1 AND status = "ONLINE" ORDER BY last_seen_at DESC LIMIT 1'
        ) || await db.getOne('SELECT * FROM sms_devices WHERE is_shared = 1 ORDER BY id DESC LIMIT 1');
      }
    }

    if (!targetDevice) {
      throw new Error('No Android SMS Gateway device found. Please pair your Android phone in SMS Center or contact admin.');
    }

    const slot = parseInt(simSlot) || targetDevice.default_sim_slot || 1;

    // 3. Insert into queue (Free routing via personal SIM)
    const res = await db.query(
      `INSERT INTO sms_queue (user_id, device_id, gateway_type, sim_slot, recipient, message, status, cost_bdt, sms_parts, charged, created_at, updated_at)
       VALUES (?, ?, 'android_sim', ?, ?, ?, 'PENDING', 0.0000, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [userId, targetDevice.id, slot, cleanPhone, message, parts]
    );

    const jobId = res.insertId || res.lastID;
    const jobData = {
      jobId,
      recipient: cleanPhone,
      message,
      simSlot: slot,
      deviceId: targetDevice.id,
      deviceToken: targetDevice.device_token
    };

    // 4. Notify Android App via Socket.io if connected
    this.broadcast('sms_dispatch_job', jobData);

    return {
      success: true,
      message: `SMS queued for delivery via Android SIM ${slot} (${slot === 1 ? targetDevice.sim1_operator : targetDevice.sim2_operator})`,
      jobId,
      cost: 0,
      smsParts: parts,
      device: {
        id: targetDevice.id,
        name: targetDevice.device_name,
        simSlot: slot
      }
    };
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
