/**
 * SaaS Authentication Routes (/api/auth)
 * Supports User Self-Registration, User Login & Super Admin Login
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/database');
const jwtAuth = require('../middlewares/jwtAuth');
const { userAuthLimiter } = require('../middlewares/rateLimiter');
const { logAudit } = require('../services/auditService');

/**
 * @route POST /api/auth/register
 * @desc SaaS Client Self-Registration with Free Starter Trial
 */
router.post('/register', userAuthLimiter, async (req, res) => {
  try {
    const { name, email, password, phone, company } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const existingUser = await db.getOne('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Default to Plan 1 (Free Starter Trial, 200 message credits)
    const result = await db.query(
      `INSERT INTO users (name, email, password, phone, company, role, plan_id, plan_status, credits_remaining, credits_used)
       VALUES (?, ?, ?, ?, ?, 'USER', 1, 'ACTIVE', 200, 0)`,
      [name, cleanEmail, passwordHash, phone || null, company || null]
    );

    const userId = result.insertId;

    // Auto-generate an initial API key for the new user
    const defaultKey = 'un_user_' + crypto.randomBytes(16).toString('hex');
    await db.query(
      'INSERT INTO api_keys (user_id, name, api_key, is_active, rate_limit_per_min) VALUES (?, "Default API Key", ?, 1, 120)',
      [userId, defaultKey]
    );

    const secret = process.env.JWT_SECRET || 'unique_notify_jwt_secret_change_me_998877';
    const token = jwt.sign(
      { id: userId, email: cleanEmail, role: 'USER', name },
      secret,
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully! You have received 200 free trial credits.',
      token,
      user: {
        id: userId,
        name,
        email: cleanEmail,
        role: 'USER',
        plan_id: 1,
        plan_name: 'Free Starter',
        credits_remaining: 200
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/auth/login
 * @desc User & Admin Login
 */
router.post('/login', userAuthLimiter, async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = await db.getOne(
      `SELECT u.*, pl.name as plan_name 
       FROM users u 
       LEFT JOIN plans pl ON u.plan_id = pl.id 
       WHERE LOWER(u.email) = ?`,
      [cleanEmail]
    );

    if (!user) {
      await logAudit({
        userId: null,
        action: 'USER_LOGIN_FAILED_UNKNOWN_EMAIL',
        ip: String(ip),
        userAgent,
        details: { attemptedEmail: cleanEmail }
      });
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await logAudit({
        userId: user.id,
        action: 'USER_LOGIN_FAILED_BAD_PASSWORD',
        ip: String(ip),
        userAgent,
        details: { attemptedEmail: cleanEmail }
      });
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (user.plan_status === 'SUSPENDED') {
      await logAudit({
        userId: user.id,
        action: 'USER_LOGIN_REJECTED_SUSPENDED_ACCOUNT',
        ip: String(ip),
        userAgent
      });
      return res.status(403).json({
        success: false,
        message: 'Account is currently suspended. Please contact customer support.'
      });
    }

    const secret = process.env.JWT_SECRET || 'unique_notify_jwt_secret_change_me_998877';
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      secret,
      { expiresIn: '30d' }
    );

    await logAudit({
      userId: user.id,
      action: 'USER_LOGIN_SUCCESS',
      ip: String(ip),
      userAgent,
      details: { email: user.email, role: user.role }
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        company: user.company,
        plan_id: user.plan_id,
        plan_name: user.plan_name || 'Free Starter',
        plan_status: user.plan_status,
        credits_remaining: user.credits_remaining,
        credits_used: user.credits_used
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/auth/me
 * @desc Get current authenticated user profile
 */
router.get('/me', jwtAuth, async (req, res) => {
  try {
    const user = await db.getOne(
      `SELECT u.id, u.name, u.email, u.phone, u.company, u.role, u.plan_id, u.plan_status, u.credits_remaining, u.credits_used, u.created_at, pl.name as plan_name 
       FROM users u 
       LEFT JOIN plans pl ON u.plan_id = pl.id 
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    return res.status(200).json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
