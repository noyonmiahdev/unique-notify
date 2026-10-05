/**
 * High-Speed OTP Service
 * Generates, dispatches, tracks, and verifies one-time passwords across Meta Cloud & QR Gateways.
 */

const db = require('../config/database');
const MetaGateway = require('./metaGateway');
const qrGateway = require('./qrGateway');
const { sanitizePhoneNumber } = require('../utils/phoneFormatter');

class OtpService {
  /**
   * Generates a secure random numeric OTP code
   * @param {number} length 
   * @returns {string}
   */
  static generateNumericOtp(length = 6) {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return String(Math.floor(min + Math.random() * (max - min + 1)));
  }

  /**
   * Determine best available gateway
   */
  static async resolveGateway(preferredGateway = 'auto') {
    if (preferredGateway === 'meta') return 'meta';
    if (preferredGateway === 'qr') return 'qr';

    // Auto resolution: Check system default
    const defaultSetting = await db.getOne("SELECT setting_value FROM system_settings WHERE setting_key = 'default_gateway'");
    const defaultType = defaultSetting?.setting_value || 'meta';

    if (defaultType === 'meta') {
      const metaCreds = await MetaGateway.getCredentials();
      if (metaCreds.accessToken && metaCreds.phoneNumberId) {
        return 'meta';
      }
      return 'qr';
    } else {
      const qrStatus = qrGateway.getSessionInfo('primary_qr_session');
      if (qrStatus.status === 'CONNECTED') {
        return 'qr';
      }
      return 'meta';
    }
  }

  /**
   * Generate and send OTP to recipient
   * @param {object} params
   */
  static async sendOtp(params = {}) {
    const {
      phone: rawPhone,
      serviceName = 'Unique-Notify',
      otpLength = 6,
      customOtp = null,
      gateway = 'auto',
      expiryMinutes = 5,
      templateName = null
    } = params;

    const phone = sanitizePhoneNumber(rawPhone);
    if (!phone) {
      throw new Error('Valid recipient phone number is required.');
    }

    const otpCode = customOtp || this.generateNumericOtp(otpLength);
    const chosenGateway = await this.resolveGateway(gateway);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + (expiryMinutes * 60 * 1000));
    const expiresAtSql = expiresAt.toISOString().slice(0, 19).replace('T', ' ');

    // 1. Insert initial pending OTP log
    const insertResult = await db.query(
      `INSERT INTO otp_logs (phone, otp_code, gateway_used, service_name, status, attempts, expires_at)
       VALUES (?, ?, ?, ?, 'PENDING', 0, ?)`,
      [phone, otpCode, chosenGateway, serviceName, expiresAtSql]
    );

    const otpId = insertResult.insertId;

    // 2. Dispatch via chosen gateway
    try {
      let dispatchResult;
      if (chosenGateway === 'meta') {
        dispatchResult = await MetaGateway.sendOtp(phone, otpCode, {
          templateName,
          serviceName,
          expiryMinutes
        });
      } else {
        dispatchResult = await qrGateway.sendOtp(phone, otpCode, {
          serviceName,
          expiryMinutes
        });
      }

      await db.query(
        "UPDATE otp_logs SET status = 'SENT', response_data = ? WHERE id = ?",
        [JSON.stringify(dispatchResult), otpId]
      );

      return {
        success: true,
        message: 'OTP sent successfully',
        data: {
          otp_id: otpId,
          phone,
          gateway_used: chosenGateway,
          expires_in_seconds: expiryMinutes * 60,
          expires_at: expiresAt.toISOString()
        }
      };
    } catch (err) {
      await db.query(
        "UPDATE otp_logs SET status = 'FAILED', response_data = ? WHERE id = ?",
        [JSON.stringify({ error: err.message }), otpId]
      );
      throw err;
    }
  }

  /**
   * Verifies an OTP code
   * @param {object} params 
   */
  static async verifyOtp(params = {}) {
    const { phone: rawPhone, otpCode, serviceName } = params;
    const phone = sanitizePhoneNumber(rawPhone);

    if (!phone || !otpCode) {
      throw new Error('Phone number and OTP code are required.');
    }

    let sql = `
      SELECT * FROM otp_logs 
      WHERE phone = ? AND status IN ('PENDING', 'SENT')
    `;
    const paramsList = [phone];

    if (serviceName) {
      sql += ' AND service_name = ?';
      paramsList.push(serviceName);
    }

    sql += ' ORDER BY id DESC LIMIT 1';

    const record = await db.getOne(sql, paramsList);

    if (!record) {
      return {
        success: false,
        message: 'No pending OTP found for this number or OTP has already been used.'
      };
    }

    // Check expiration
    const now = new Date();
    const expiresAt = new Date(record.expires_at);

    if (now > expiresAt) {
      await db.query("UPDATE otp_logs SET status = 'EXPIRED' WHERE id = ?", [record.id]);
      return {
        success: false,
        message: 'OTP code has expired. Please request a new code.'
      };
    }

    // Check attempts
    if (record.attempts >= 4) {
      await db.query("UPDATE otp_logs SET status = 'FAILED' WHERE id = ?", [record.id]);
      return {
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new OTP.'
      };
    }

    // Match code
    if (String(record.otp_code).trim() === String(otpCode).trim()) {
      await db.query(
        "UPDATE otp_logs SET status = 'VERIFIED', verified_at = CURRENT_TIMESTAMP WHERE id = ?",
        [record.id]
      );
      return {
        success: true,
        message: 'OTP verified successfully.',
        data: {
          phone,
          service_name: record.service_name,
          verified_at: new Date().toISOString()
        }
      };
    } else {
      await db.query("UPDATE otp_logs SET attempts = attempts + 1 WHERE id = ?", [record.id]);
      const remainingAttempts = 3 - record.attempts;
      return {
        success: false,
        message: `Invalid OTP code. ${remainingAttempts > 0 ? remainingAttempts + ' attempts remaining.' : 'Code locked.'}`
      };
    }
  }
}

module.exports = OtpService;
