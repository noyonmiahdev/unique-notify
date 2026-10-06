/**
 * Dedicated Super Admin Routes (/api/admin)
 * Uses DEDICATED admins table — completely isolated from users table.
 * Protected by adminAuth middleware which reads from admins table only.
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const adminAuth = require('../middlewares/adminAuth');
const { adminLoginLimiter } = require('../middlewares/rateLimiter');
const { logAudit, getRecentLogs } = require('../services/auditService');
const ThirdPartySmsGateway = require('../services/thirdPartySmsGateway');
const smsQueueEngine = require('../services/smsQueueEngine');

/* ────────────────────────────────────────────────
   AUTH
──────────────────────────────────────────────── */

/**
 * POST /api/admin/auth/login
 * Authenticates ONLY against the dedicated admins table — never users table.
 */
router.post('/auth/login', adminLoginLimiter, async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password are required.' });

    const cleanEmail = String(email).trim().toLowerCase();
    // Strictly query admins table — not users
    const admin = await db.getOne('SELECT * FROM admins WHERE email = ? AND is_active = 1', [cleanEmail]);

    if (!admin) {
      await logAudit({ userId: null, action: 'ADMIN_LOGIN_FAILED_NOT_FOUND', ip: String(ip), userAgent, details: { email: cleanEmail } });
      return res.status(401).json({ success: false, message: 'Invalid administrator credentials.' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      await logAudit({ userId: admin.id, action: 'ADMIN_LOGIN_FAILED_BAD_PASSWORD', ip: String(ip), userAgent, details: { email: cleanEmail } });
      return res.status(401).json({ success: false, message: 'Invalid administrator credentials.' });
    }

    const secret = process.env.JWT_SECRET || 'unique_notify_jwt_secret_change_me_998877';
    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name, role: 'SUPER_ADMIN', _src: 'admins' },
      secret,
      { expiresIn: '24h' }
    );

    // Update last login
    await db.query('UPDATE admins SET last_login_at = NOW(), last_login_ip = ? WHERE id = ?', [String(ip), admin.id]);

    await logAudit({ userId: admin.id, action: 'ADMIN_LOGIN_SUCCESS', ip: String(ip), userAgent, details: { email: admin.email } });

    return res.status(200).json({
      success: true,
      message: 'Administrator authenticated successfully.',
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email, role: 'SUPER_ADMIN' }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/admin/auth/me
 * Returns current admin profile from admins table
 */
router.get('/auth/me', adminAuth, async (req, res) => {
  try {
    const admin = await db.getOne(
      'SELECT id, name, email, phone, is_active, last_login_at, last_login_ip, created_at FROM admins WHERE id = ?',
      [req.admin.id]
    );
    return res.status(200).json({ success: true, admin });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* ────────────────────────────────────────────────
   OVERVIEW / DASHBOARD
──────────────────────────────────────────────── */

router.get('/overview', adminAuth, async (req, res) => {
  try {
    const totalUsers       = await db.getOne('SELECT COUNT(*) as c FROM users');
    const activeUsers      = await db.getOne('SELECT COUNT(*) as c FROM users WHERE plan_status = "ACTIVE"');
    const totalMessages    = await db.getOne('SELECT COUNT(*) as c FROM message_logs');
    const sentMessages     = await db.getOne('SELECT COUNT(*) as c FROM message_logs WHERE status = "SENT"');
    const pendingPayments  = await db.getOne('SELECT COUNT(*) as c FROM payments WHERE status = "PENDING"');
    const activeGateways   = await db.getOne('SELECT COUNT(*) as c FROM gateways WHERE status = "CONNECTED"');
    const totalRevenueBDT  = await db.getOne('SELECT SUM(amount) as total FROM payments WHERE status = "APPROVED" AND currency = "BDT"');
    const totalContacts    = await db.getOne('SELECT COUNT(*) as c FROM contacts');
    const recentLogs       = await getRecentLogs(10);

    return res.status(200).json({
      success: true,
      metrics: {
        totalUsers:       totalUsers?.c || 0,
        activeUsers:      activeUsers?.c || 0,
        totalMessages:    totalMessages?.c || 0,
        sentMessages:     sentMessages?.c || 0,
        pendingPayments:  pendingPayments?.c || 0,
        activeGateways:   activeGateways?.c || 0,
        totalRevenueBDT:  totalRevenueBDT?.total || 0,
        totalContacts:    totalContacts?.c || 0,
      },
      recentLogs
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* ────────────────────────────────────────────────
   USER MANAGEMENT
──────────────────────────────────────────────── */

router.get('/users', adminAuth, async (req, res) => {
  try {
    const { search, status, plan_id } = req.query;
    let sql = `
      SELECT u.id, u.name, u.email, u.phone, u.company, u.plan_id, u.plan_status,
             u.credits_remaining, u.credits_used, u.created_at,
             pl.name as plan_name, pl.price_bdt,
             (SELECT COUNT(*) FROM message_logs ml WHERE ml.user_id = u.id) as total_messages,
             (SELECT COUNT(*) FROM contacts c WHERE c.user_id = u.id) as total_contacts
      FROM users u
      LEFT JOIN plans pl ON u.plan_id = pl.id
      WHERE 1=1
    `;
    const params = [];
    if (search) { sql += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.company LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (status) { sql += ' AND u.plan_status = ?'; params.push(status); }
    if (plan_id) { sql += ' AND u.plan_id = ?'; params.push(plan_id); }
    sql += ' ORDER BY u.id DESC';

    const users = await db.query(sql, params);
    return res.status(200).json({ success: true, users });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await db.getOne(`
      SELECT u.*, pl.name as plan_name, pl.price_bdt, pl.message_limit
      FROM users u LEFT JOIN plans pl ON u.plan_id = pl.id
      WHERE u.id = ?`, [req.params.id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const recentMessages = await db.query(
      'SELECT * FROM message_logs WHERE user_id = ? ORDER BY id DESC LIMIT 20', [req.params.id]
    );
    const payments = await db.query(
      'SELECT p.*, pl.name as plan_name FROM payments p LEFT JOIN plans pl ON p.plan_id = pl.id WHERE p.user_id = ? ORDER BY p.id DESC', [req.params.id]
    );
    const settings = await db.getOne('SELECT * FROM user_settings WHERE user_id = ?', [req.params.id]);

    return res.status(200).json({ success: true, user, recentMessages, payments, settings });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/admin/users/:id/impersonate
 * Enables Super Admin to log into the client dashboard as that user
 */
router.post('/users/:id/impersonate', adminAuth, async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  try {
    const user = await db.getOne('SELECT id, email, name, role, plan_id, plan_status FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const secret = process.env.JWT_SECRET || 'unique_notify_jwt_secret_change_me_998877';
    const userToken = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: 'USER' },
      secret,
      { expiresIn: '30d' }
    );

    await logAudit({
      userId: req.admin.id,
      action: 'ADMIN_IMPERSONATED_USER',
      ip: String(ip),
      userAgent: req.headers['user-agent'],
      details: { targetUserId: user.id, targetEmail: user.email, adminEmail: req.admin.email }
    });

    return res.status(200).json({
      success: true,
      message: `Impersonating ${user.name} (${user.email})`,
      token: userToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'USER',
        plan_id: user.plan_id,
        plan_status: user.plan_status
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/users/:id/credits', adminAuth, async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  try {
    const { credits_remaining, reason } = req.body;
    if (credits_remaining === undefined || isNaN(credits_remaining))
      return res.status(400).json({ success: false, message: 'Valid credit value required.' });

    const user = await db.getOne('SELECT id, email, credits_remaining FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const prev = user.credits_remaining;
    await db.query('UPDATE users SET credits_remaining = ? WHERE id = ?', [parseInt(credits_remaining), req.params.id]);
    await logAudit({
      userId: req.admin.id, action: 'ADMIN_CREDIT_ADJUSTMENT', ip: String(ip), userAgent: req.headers['user-agent'],
      details: { targetUserId: req.params.id, targetEmail: user.email, prevCredits: prev, newCredits: credits_remaining, reason }
    });
    return res.status(200).json({ success: true, message: `Credits updated: ${prev} → ${credits_remaining}.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/users/:id/plan', adminAuth, async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  try {
    const { plan_id, plan_status } = req.body;
    const user = await db.getOne('SELECT id, email, plan_id, plan_status FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const updates = [];
    const vals = [];
    if (plan_id)     { updates.push('plan_id = ?');     vals.push(parseInt(plan_id)); }
    if (plan_status) { updates.push('plan_status = ?'); vals.push(plan_status); }
    if (!updates.length) return res.status(400).json({ success: false, message: 'Nothing to update.' });

    vals.push(req.params.id);
    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, vals);
    await logAudit({
      userId: req.admin.id, action: 'ADMIN_PLAN_CHANGE', ip: String(ip), userAgent: req.headers['user-agent'],
      details: { targetUserId: req.params.id, targetEmail: user.email, plan_id, plan_status }
    });
    return res.status(200).json({ success: true, message: 'Plan updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/users/:id/status', adminAuth, async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'SUSPENDED', 'PENDING'].includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status value.' });

    const user = await db.getOne('SELECT id, email, plan_status FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    await db.query('UPDATE users SET plan_status = ? WHERE id = ?', [status, req.params.id]);
    await logAudit({
      userId: req.admin.id, action: 'ADMIN_USER_STATUS_CHANGE', ip: String(ip), userAgent: req.headers['user-agent'],
      details: { targetUserId: req.params.id, targetEmail: user.email, prevStatus: user.plan_status, newStatus: status }
    });
    return res.status(200).json({ success: true, message: `Status updated to ${status}.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/users/:id/password', adminAuth, async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  try {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });

    const user = await db.getOne('SELECT id, email FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const hash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hash, req.params.id]);
    await logAudit({
      userId: req.admin.id, action: 'ADMIN_USER_PASSWORD_RESET', ip: String(ip), userAgent: req.headers['user-agent'],
      details: { targetUserId: req.params.id, targetEmail: user.email }
    });
    return res.status(200).json({ success: true, message: 'User password reset successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/users/:id/messages', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const messages = await db.query(
      'SELECT * FROM message_logs WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?',
      [req.params.id, parseInt(limit), offset]
    );
    const total = await db.getOne('SELECT COUNT(*) as c FROM message_logs WHERE user_id = ?', [req.params.id]);
    return res.status(200).json({ success: true, messages, total: total?.c || 0, page: parseInt(page) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* ────────────────────────────────────────────────
   PAYMENTS
──────────────────────────────────────────────── */

router.get('/payments', adminAuth, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT p.*, u.name as user_name, u.email as user_email, pl.name as plan_name, pl.message_limit
      FROM payments p
      JOIN users u ON p.user_id = u.id
      JOIN plans pl ON p.plan_id = pl.id
    `;
    const params = [];
    if (status) { sql += ' WHERE p.status = ?'; params.push(status); }
    sql += ' ORDER BY p.id DESC';
    const payments = await db.query(sql, params);
    return res.status(200).json({ success: true, payments });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/payments/:id/approve', adminAuth, async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  try {
    const payment = await db.getOne(
      'SELECT p.*, pl.message_limit FROM payments p JOIN plans pl ON p.plan_id = pl.id WHERE p.id = ?',
      [req.params.id]
    );
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });
    if (payment.status === 'APPROVED') return res.status(400).json({ success: false, message: 'Already approved.' });

    await db.query('UPDATE payments SET status = "APPROVED", approved_at = NOW() WHERE id = ?', [req.params.id]);
    await db.query(
      'UPDATE users SET plan_id = ?, plan_status = "ACTIVE", credits_remaining = credits_remaining + ? WHERE id = ?',
      [payment.plan_id, payment.message_limit, payment.user_id]
    );
    await logAudit({
      userId: req.admin.id, action: 'ADMIN_PAYMENT_APPROVED', ip: String(ip), userAgent: req.headers['user-agent'],
      details: { paymentId: req.params.id, userId: payment.user_id, planId: payment.plan_id, creditsAdded: payment.message_limit }
    });
    return res.status(200).json({ success: true, message: `Approved! Added ${payment.message_limit} credits to account.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/payments/:id/reject', adminAuth, async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  try {
    const { reason } = req.body;
    const payment = await db.getOne('SELECT * FROM payments WHERE id = ?', [req.params.id]);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });

    await db.query('UPDATE payments SET status = "REJECTED", notes = ? WHERE id = ?', [reason || 'Rejected by admin', req.params.id]);
    await logAudit({
      userId: req.admin.id, action: 'ADMIN_PAYMENT_REJECTED', ip: String(ip), userAgent: req.headers['user-agent'],
      details: { paymentId: req.params.id, userId: payment.user_id, reason }
    });
    return res.status(200).json({ success: true, message: 'Payment rejected.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* ────────────────────────────────────────────────
   GATEWAYS
──────────────────────────────────────────────── */

router.get('/gateways', adminAuth, async (req, res) => {
  try {
    const gateways = await db.query('SELECT * FROM gateways ORDER BY user_id ASC, id ASC');
    return res.status(200).json({ success: true, gateways });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* ────────────────────────────────────────────────
   AUDIT LOGS
──────────────────────────────────────────────── */

router.get('/audit-logs', adminAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const filter = req.query.filter || null;
    const logs = await getRecentLogs(limit, filter);
    return res.status(200).json({ success: true, logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* ────────────────────────────────────────────────
   GLOBAL + PER-USER ANTI-BAN SETTINGS
──────────────────────────────────────────────── */

router.get('/settings', adminAuth, async (req, res) => {
  try {
    const rows = await db.query('SELECT * FROM system_settings ORDER BY setting_key ASC');
    const settings = {};
    rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
    return res.status(200).json({ success: true, settings });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/settings', adminAuth, async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await db.query(
        'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [key, String(value), String(value)]
      );
    }
    await logAudit({
      userId: req.admin.id, action: 'ADMIN_SETTINGS_UPDATED', ip: String(ip), userAgent: req.headers['user-agent'],
      details: updates
    });
    return res.status(200).json({ success: true, message: 'System settings updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Get per-user anti-ban settings (admin view)
router.get('/users/:id/settings', adminAuth, async (req, res) => {
  try {
    let settings = await db.getOne('SELECT * FROM user_settings WHERE user_id = ?', [req.params.id]);
    if (!settings) {
      // Return defaults from global settings
      const globals = await db.query('SELECT * FROM system_settings WHERE setting_key LIKE "anti_ban%"');
      const g = {};
      globals.forEach(r => { g[r.setting_key] = r.setting_value; });
      settings = {
        user_id: req.params.id,
        anti_ban_min_delay: parseInt(g.anti_ban_min_delay || 5),
        anti_ban_max_delay: parseInt(g.anti_ban_max_delay || 15),
        anti_ban_typing_sim: g.anti_ban_typing_sim === 'true' ? 1 : 0,
        anti_ban_daily_limit: parseInt(g.anti_ban_daily_limit || 1000),
        anti_ban_quiet_hours: 0,
        anti_ban_quiet_start: '23:00',
        anti_ban_quiet_end:   '07:00',
        default_gateway: g.default_gateway || 'meta',
        notify_on_delivery: 1,
        _is_default: true
      };
    }
    return res.status(200).json({ success: true, settings });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Update per-user anti-ban settings (admin override)
router.post('/users/:id/settings', adminAuth, async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  try {
    const { anti_ban_min_delay, anti_ban_max_delay, anti_ban_typing_sim, anti_ban_daily_limit,
            anti_ban_quiet_hours, anti_ban_quiet_start, anti_ban_quiet_end, default_gateway, notify_on_delivery } = req.body;

    const existing = await db.getOne('SELECT id FROM user_settings WHERE user_id = ?', [req.params.id]);
    if (existing) {
      await db.query(`
        UPDATE user_settings SET
          anti_ban_min_delay=?, anti_ban_max_delay=?, anti_ban_typing_sim=?, anti_ban_daily_limit=?,
          anti_ban_quiet_hours=?, anti_ban_quiet_start=?, anti_ban_quiet_end=?,
          default_gateway=?, notify_on_delivery=?, updated_at=NOW()
        WHERE user_id=?`,
        [anti_ban_min_delay, anti_ban_max_delay, anti_ban_typing_sim ? 1 : 0, anti_ban_daily_limit,
         anti_ban_quiet_hours ? 1 : 0, anti_ban_quiet_start, anti_ban_quiet_end,
         default_gateway, notify_on_delivery ? 1 : 0, req.params.id]
      );
    } else {
      await db.query(`
        INSERT INTO user_settings (user_id, anti_ban_min_delay, anti_ban_max_delay, anti_ban_typing_sim, anti_ban_daily_limit,
          anti_ban_quiet_hours, anti_ban_quiet_start, anti_ban_quiet_end, default_gateway, notify_on_delivery)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.params.id, anti_ban_min_delay, anti_ban_max_delay, anti_ban_typing_sim ? 1 : 0, anti_ban_daily_limit,
         anti_ban_quiet_hours ? 1 : 0, anti_ban_quiet_start, anti_ban_quiet_end,
         default_gateway, notify_on_delivery ? 1 : 0]
      );
    }
    await logAudit({
      userId: req.admin.id, action: 'ADMIN_USER_SETTINGS_UPDATED', ip: String(ip), userAgent: req.headers['user-agent'],
      details: { targetUserId: req.params.id, ...req.body }
    });
    return res.status(200).json({ success: true, message: 'User anti-ban settings saved.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* ────────────────────────────────────────────────
   PLANS
──────────────────────────────────────────────── */

router.get('/plans', adminAuth, async (req, res) => {
  try {
    const plans = await db.query('SELECT * FROM plans ORDER BY price_bdt ASC');
    return res.status(200).json({ success: true, plans });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* ────────────────────────────────────────────────
   SMS ENGINE & BILLING CONTROL (SUPER ADMIN ONLY)
──────────────────────────────────────────────── */

// 1. SMS Overview Metrics
router.get('/sms/overview', adminAuth, async (req, res) => {
  try {
    const totalQueued = await db.getOne('SELECT COUNT(*) as c FROM sms_queue');
    const sentSms = await db.getOne('SELECT COUNT(*) as c FROM sms_queue WHERE status = "SENT" OR status = "DELIVERED"');
    const failedSms = await db.getOne('SELECT COUNT(*) as c FROM sms_queue WHERE status = "FAILED"');
    const totalCostCharged = await db.getOne('SELECT SUM(cost_bdt) as total FROM sms_queue WHERE charged = 1');
    const totalRevenueTopup = await db.getOne('SELECT SUM(amount_bdt) as total FROM sms_transactions WHERE type IN ("TOPUP_RECHARGE", "PACKAGE_PURCHASE") AND status = "COMPLETED"');
    const pendingTopups = await db.getOne('SELECT COUNT(*) as c FROM sms_transactions WHERE status = "PENDING"');
    const activeGateways = await db.getOne('SELECT COUNT(*) as c FROM sms_gateways WHERE is_active = 1');

    return res.status(200).json({
      success: true,
      metrics: {
        totalQueued: totalQueued?.c || 0,
        sentSms: sentSms?.c || 0,
        failedSms: failedSms?.c || 0,
        totalCostCharged: parseFloat(totalCostCharged?.total || 0),
        totalRevenueTopup: parseFloat(totalRevenueTopup?.total || 0),
        pendingTopups: pendingTopups?.c || 0,
        activeGateways: activeGateways?.c || 0
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Third-Party SMS Gateways Management
router.get('/sms/gateways', adminAuth, async (req, res) => {
  try {
    const gateways = await db.query('SELECT * FROM sms_gateways ORDER BY id ASC');
    return res.status(200).json({ success: true, gateways });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/sms/gateways', adminAuth, async (req, res) => {
  const { id, provider_name, api_url, api_key, sender_id, is_default, is_active, notes } = req.body;
  if (!provider_name) {
    return res.status(400).json({ success: false, message: 'Provider name is required.' });
  }

  try {
    if (is_default) {
      await db.query('UPDATE sms_gateways SET is_default = 0');
    }

    if (id) {
      await db.query(
        `UPDATE sms_gateways 
         SET provider_name = ?, api_url = ?, api_key = ?, sender_id = ?, is_default = ?, is_active = ?, notes = ?, updated_at = NOW()
         WHERE id = ?`,
        [provider_name, api_url || '', api_key || '', sender_id || '', is_default ? 1 : 0, is_active ? 1 : 0, notes || null, id]
      );
    } else {
      await db.query(
        `INSERT INTO sms_gateways (provider_name, api_url, api_key, sender_id, is_default, is_active, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [provider_name, api_url || '', api_key || '', sender_id || '', is_default ? 1 : 0, is_active ? 1 : 0, notes || null]
      );
    }

    return res.status(200).json({ success: true, message: `SMS Gateway '${provider_name}' saved successfully.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/sms/gateways/:id/toggle', adminAuth, async (req, res) => {
  try {
    const gw = await db.getOne('SELECT id, is_active, provider_name FROM sms_gateways WHERE id = ?', [req.params.id]);
    if (!gw) return res.status(404).json({ success: false, message: 'Gateway not found.' });

    const newStatus = gw.is_active ? 0 : 1;
    await db.query('UPDATE sms_gateways SET is_active = ? WHERE id = ?', [newStatus, req.params.id]);
    return res.status(200).json({ success: true, message: `Gateway '${gw.provider_name}' is now ${newStatus ? 'Active' : 'Disabled'}.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/sms/gateways/:id/default', adminAuth, async (req, res) => {
  try {
    await db.query('UPDATE sms_gateways SET is_default = 0');
    await db.query('UPDATE sms_gateways SET is_default = 1, is_active = 1 WHERE id = ?', [req.params.id]);
    return res.status(200).json({ success: true, message: 'Default SMS Gateway updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/sms/gateways/:id', adminAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM sms_gateways WHERE id = ?', [req.params.id]);
    return res.status(200).json({ success: true, message: 'SMS Gateway removed.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/sms/gateways/test-send', adminAuth, async (req, res) => {
  const { gateway_id, phone, message } = req.body;
  if (!phone || !message) {
    return res.status(400).json({ success: false, message: 'Recipient phone and test message are required.' });
  }

  try {
    const gw = gateway_id ? await db.getOne('SELECT * FROM sms_gateways WHERE id = ?', [gateway_id]) : await db.getOne('SELECT * FROM sms_gateways WHERE is_active = 1 LIMIT 1');
    if (!gw) return res.status(404).json({ success: false, message: 'No configured SMS Gateway found.' });

    const result = await ThirdPartySmsGateway.dispatch(gw, phone, message);
    return res.status(200).json({ success: true, message: `Test SMS dispatched successfully via ${gw.provider_name}`, result });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Test dispatch error: ${err.message}` });
  }
});

// 3. SMS Pricing & Package Settings
router.get('/sms/settings', adminAuth, async (req, res) => {
  try {
    const defaultRate = await db.getOne('SELECT setting_value FROM system_settings WHERE setting_key = "default_sms_rate"');
    const minRecharge = await db.getOne('SELECT setting_value FROM system_settings WHERE setting_key = "min_sms_recharge"');
    return res.status(200).json({
      success: true,
      settings: {
        default_sms_rate: parseFloat(defaultRate?.setting_value || '0.35'),
        min_sms_recharge: parseFloat(minRecharge?.setting_value || '50.00')
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/sms/settings', adminAuth, async (req, res) => {
  const { default_sms_rate, min_sms_recharge } = req.body;
  try {
    if (default_sms_rate !== undefined) {
      await db.query('UPDATE system_settings SET setting_value = ? WHERE setting_key = "default_sms_rate"', [String(default_sms_rate)]);
    }
    if (min_sms_recharge !== undefined) {
      await db.query('UPDATE system_settings SET setting_value = ? WHERE setting_key = "min_sms_recharge"', [String(min_sms_recharge)]);
    }
    return res.status(200).json({ success: true, message: 'SMS Pricing settings saved successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 4. SMS Packages CRUD
router.get('/sms/packages', adminAuth, async (req, res) => {
  try {
    const packages = await db.query('SELECT * FROM sms_packages ORDER BY price_bdt ASC');
    return res.status(200).json({ success: true, packages });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/sms/packages', adminAuth, async (req, res) => {
  const { id, name, sms_count, price_bdt, price_per_sms, validity_days, features, is_popular, is_active } = req.body;
  if (!name || !sms_count || !price_bdt) {
    return res.status(400).json({ success: false, message: 'Name, SMS count, and price are required.' });
  }

  const cleanFeatures = Array.isArray(features) ? JSON.stringify(features) : (typeof features === 'string' ? features : JSON.stringify([]));
  const calcRate = price_per_sms || (parseFloat(price_bdt) / parseInt(sms_count));

  try {
    if (id) {
      await db.query(
        `UPDATE sms_packages 
         SET name = ?, sms_count = ?, price_bdt = ?, price_per_sms = ?, validity_days = ?, features = ?, is_popular = ?, is_active = ?
         WHERE id = ?`,
        [name, parseInt(sms_count), parseFloat(price_bdt), calcRate, parseInt(validity_days || 365), cleanFeatures, is_popular ? 1 : 0, is_active ? 1 : 0, id]
      );
    } else {
      await db.query(
        `INSERT INTO sms_packages (name, sms_count, price_bdt, price_per_sms, validity_days, features, is_popular, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, parseInt(sms_count), parseFloat(price_bdt), calcRate, parseInt(validity_days || 365), cleanFeatures, is_popular ? 1 : 0, is_active ? 1 : 0]
      );
    }

    return res.status(200).json({ success: true, message: `SMS Package '${name}' saved successfully.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/sms/packages/:id', adminAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM sms_packages WHERE id = ?', [req.params.id]);
    return res.status(200).json({ success: true, message: 'SMS Package deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 5. User SMS Balances Management & Manual Adjustments
router.get('/sms/users', adminAuth, async (req, res) => {
  try {
    const users = await db.query(
      `SELECT id, name, email, phone, company, sms_balance, sms_credits, custom_sms_rate, created_at
       FROM users 
       ORDER BY id ASC`
    );
    return res.status(200).json({ success: true, users });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/sms/users/:id/adjust-balance', adminAuth, async (req, res) => {
  const { action, amount_bdt, sms_credits, custom_sms_rate, note } = req.body;
  try {
    const user = await db.getOne('SELECT id, name, sms_balance, sms_credits FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    let currentBalance = parseFloat(user.sms_balance || 0);
    let currentCredits = parseInt(user.sms_credits || 0, 10);
    const adjustBdt = parseFloat(amount_bdt || 0);
    const adjustCredits = parseInt(sms_credits || 0, 10);

    if (action === 'ADD_BALANCE') {
      currentBalance += adjustBdt;
    } else if (action === 'DEDUCT_BALANCE') {
      currentBalance = Math.max(0, currentBalance - adjustBdt);
    }

    if (action === 'ADD_CREDITS') {
      currentCredits += adjustCredits;
    } else if (action === 'DEDUCT_CREDITS') {
      currentCredits = Math.max(0, currentCredits - adjustCredits);
    }

    let customRateVal = user.custom_sms_rate;
    if (custom_sms_rate !== undefined) {
      customRateVal = custom_sms_rate === '' || custom_sms_rate === null ? null : parseFloat(custom_sms_rate);
    }

    await db.query(
      'UPDATE users SET sms_balance = ?, sms_credits = ?, custom_sms_rate = ? WHERE id = ?',
      [currentBalance, currentCredits, customRateVal, user.id]
    );

    // Record adjustment in transactions
    await db.query(
      `INSERT INTO sms_transactions (user_id, type, amount_bdt, sms_count, balance_after, description, payment_method, status, created_at)
       VALUES (?, 'ADMIN_ADJUST', ?, ?, ?, ?, 'admin', 'COMPLETED', NOW())`,
      [user.id, adjustBdt, adjustCredits, currentBalance, note || `Admin Adjustment: ${action || 'UPDATE'}`]
    );

    return res.status(200).json({
      success: true,
      message: `User ${user.name} SMS account updated successfully.`,
      user: {
        id: user.id,
        sms_balance: currentBalance,
        sms_credits: currentCredits,
        custom_sms_rate: customRateVal
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 6. SMS Transactions (Top-ups & Package Purchases Approval)
router.get('/sms/transactions', adminAuth, async (req, res) => {
  try {
    const { status, limit = 100 } = req.query;
    let sql = `
      SELECT t.*, u.name as user_name, u.email as user_email 
      FROM sms_transactions t
      JOIN users u ON t.user_id = u.id
    `;
    const params = [];
    if (status && status !== 'all') {
      sql += ' WHERE t.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY t.id DESC LIMIT ?';
    params.push(parseInt(limit));

    const transactions = await db.query(sql, params);
    return res.status(200).json({ success: true, transactions });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/sms/transactions/:id/approve', adminAuth, async (req, res) => {
  try {
    const tx = await db.getOne('SELECT * FROM sms_transactions WHERE id = ?', [req.params.id]);
    if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found.' });
    if (tx.status === 'COMPLETED') return res.status(400).json({ success: false, message: 'Transaction is already completed.' });

    const user = await db.getOne('SELECT id, sms_balance, sms_credits FROM users WHERE id = ?', [tx.user_id]);
    let newBalance = parseFloat(user.sms_balance || 0);
    let newCredits = parseInt(user.sms_credits || 0, 10);

    if (tx.type === 'TOPUP_RECHARGE') {
      newBalance += parseFloat(tx.amount_bdt);
    } else if (tx.type === 'PACKAGE_PURCHASE') {
      newCredits += parseInt(tx.sms_count, 10);
    }

    await db.query('UPDATE users SET sms_balance = ?, sms_credits = ? WHERE id = ?', [newBalance, newCredits, user.id]);
    await db.query('UPDATE sms_transactions SET status = "COMPLETED", balance_after = ? WHERE id = ?', [newBalance, tx.id]);

    return res.status(200).json({
      success: true,
      message: `Transaction #${tx.id} approved. User credited successfully.`,
      updatedBalance: newBalance,
      updatedCredits: newCredits
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/sms/transactions/:id/reject', adminAuth, async (req, res) => {
  try {
    await db.query('UPDATE sms_transactions SET status = "FAILED" WHERE id = ?', [req.params.id]);
    return res.status(200).json({ success: true, message: `Transaction #${req.params.id} marked as rejected/failed.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 8. Android SMS Devices & Dedicated Routing
router.get('/sms/devices', adminAuth, async (req, res) => {
  try {
    const devices = await db.query(`
      SELECT d.*, 
             u.name as owner_name, u.email as owner_email,
             au.name as assigned_name, au.email as assigned_email
      FROM sms_devices d
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN users au ON d.assigned_user_id = au.id
      ORDER BY d.id DESC
    `);
    const users = await db.query('SELECT id, name, email FROM users ORDER BY name ASC');
    return res.status(200).json({ success: true, devices, users });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/sms/devices/:id/assign', adminAuth, async (req, res) => {
  const { sim1_sender_id, sim2_sender_id, is_shared, assigned_user_id } = req.body;
  try {
    await db.query(`
      UPDATE sms_devices 
      SET sim1_sender_id = ?, sim2_sender_id = ?, is_shared = ?, assigned_user_id = ?, updated_at = NOW()
      WHERE id = ?
    `, [sim1_sender_id || null, sim2_sender_id || null, is_shared ? 1 : 0, assigned_user_id || null, req.params.id]);
    return res.status(200).json({ success: true, message: 'Device Sender ID and routing assignment updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/sms/device/pair-request', adminAuth, async (req, res) => {
  try {
    const deviceName = req.body.deviceName || req.body.device_name || 'Platform Gateway Node';
    const pairing = await smsQueueEngine.createPairingCode(1, deviceName);
    // Automatically set as shared pool
    await db.query('UPDATE sms_devices SET is_shared = 1 WHERE id = ?', [pairing.device.id]);

    return res.status(200).json({
      success: true,
      message: 'Admin pairing code generated',
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

router.delete('/sms/devices/:id', adminAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM sms_devices WHERE id = ?', [req.params.id]);
    return res.status(200).json({ success: true, message: 'Device removed successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
