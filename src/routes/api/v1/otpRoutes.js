/**
 * OTP REST API Endpoints (/api/v1/otp)
 */

const express = require('express');
const router = express.Router();
const OtpService = require('../../../services/otpService');
const db = require('../../../config/database');

/**
 * @route POST /api/v1/otp/send
 * @desc Dispatch an OTP verification code
 */
router.post('/send', async (req, res) => {
  try {
    const {
      phone,
      service_name,
      serviceName,
      otp_length,
      otpLength,
      custom_otp,
      customOtp,
      gateway,
      expiry_minutes,
      expiryMinutes,
      template_name,
      templateName
    } = req.body;

    const result = await OtpService.sendOtp({
      phone,
      serviceName: service_name || serviceName || 'Unique-Notify',
      otpLength: parseInt(otp_length || otpLength || '6', 10),
      customOtp: custom_otp || customOtp || null,
      gateway: gateway || 'auto',
      expiryMinutes: parseInt(expiry_minutes || expiryMinutes || '5', 10),
      templateName: template_name || templateName || null
    });

    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * @route POST /api/v1/otp/verify
 * @desc Verify a received OTP code
 */
router.post('/verify', async (req, res) => {
  try {
    const { phone, otp_code, otpCode, service_name, serviceName } = req.body;

    const result = await OtpService.verifyOtp({
      phone,
      otpCode: otp_code || otpCode,
      serviceName: service_name || serviceName
    });

    const statusCode = result.success ? 200 : 400;
    return res.status(statusCode).json(result);
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * @route GET /api/v1/otp/logs
 * @desc List recent OTP transactions
 */
router.get('/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const logs = await db.query(
      'SELECT id, phone, gateway_used, service_name, status, attempts, expires_at, verified_at, created_at FROM otp_logs ORDER BY id DESC LIMIT ?',
      [limit]
    );

    return res.status(200).json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
