/**
 * Billing, Subscription Plans & Payment Routes (/api/billing, /api/admin)
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const jwtAuth = require('../middlewares/jwtAuth');

/**
 * @route GET /api/billing/plans
 * @desc Get all active subscription pricing plans (Public)
 */
router.get('/billing/plans', async (req, res) => {
  try {
    const plans = await db.query('SELECT * FROM plans WHERE is_active = 1 ORDER BY price_bdt ASC');
    const parsed = plans.map(p => {
      let features = [];
      try { features = typeof p.features === 'string' ? JSON.parse(p.features) : p.features; } catch (e) {}
      return { ...p, features };
    });
    return res.status(200).json({ success: true, data: parsed });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/billing/payment-methods
 * @desc Get payment merchant details (bKash, Nagad, Bank)
 */
router.get('/billing/payment-methods', async (req, res) => {
  try {
    const settings = await db.query(
      "SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE 'payment_%'"
    );
    const map = {};
    for (const s of settings) map[s.setting_key] = s.setting_value;

    return res.status(200).json({
      success: true,
      methods: {
        bkash: map.payment_bkash_number || '01700000000',
        nagad: map.payment_nagad_number || '01800000000',
        rocket: map.payment_rocket_number || '01900000000',
        bank: map.payment_bank_details || 'Bank: City Bank | A/C: 1102938471'
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/billing/checkout
 * @desc Submit subscription payment (TrxID or instant test card)
 */
router.post('/billing/checkout', jwtAuth, async (req, res) => {
  try {
    const { plan_id, payment_method, sender_number, transaction_id, notes } = req.body;
    const userId = req.user.id;

    if (!plan_id || !payment_method) {
      return res.status(400).json({ success: false, message: 'Plan ID and payment method are required.' });
    }

    const plan = await db.getOne('SELECT * FROM plans WHERE id = ?', [plan_id]);
    if (!plan) return res.status(404).json({ success: false, message: 'Selected plan not found.' });

    // Handle instant mock card payment or free plan upgrade
    const isInstantCard = payment_method === 'card' || payment_method === 'instant_mock';
    const isFree = parseFloat(plan.price_bdt) === 0;
    const autoApprove = isInstantCard || isFree;

    const trxId = transaction_id || (autoApprove ? 'TXN_AUTO_' + Date.now() : '');
    if (!trxId && !autoApprove) {
      return res.status(400).json({ success: false, message: 'Transaction ID is required for mobile/bank payment verification.' });
    }

    const initialStatus = autoApprove ? 'APPROVED' : 'PENDING';
    const approvedAt = autoApprove ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;

    const result = await db.query(
      `INSERT INTO payments (user_id, plan_id, amount, currency, payment_method, sender_number, transaction_id, notes, status, approved_at)
       VALUES (?, ?, ?, 'BDT', ?, ?, ?, ?, ?, ?)`,
      [userId, plan_id, plan.price_bdt, payment_method, sender_number || null, trxId, notes || null, initialStatus, approvedAt]
    );

    // If auto-approved, activate user plan immediately
    if (autoApprove) {
      await db.query(
        'UPDATE users SET plan_id = ?, plan_status = "ACTIVE", credits_remaining = credits_remaining + ? WHERE id = ?',
        [plan_id, plan.message_limit, userId]
      );
    }

    return res.status(200).json({
      success: true,
      message: autoApprove ? `Subscribed to ${plan.name} successfully!` : 'Payment proof submitted. Admin will review and activate shortly.',
      payment_id: result.insertId,
      status: initialStatus
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/billing/my-subscription
 * @desc Get current user's active plan, credits, and payment history
 */
router.get('/billing/my-subscription', jwtAuth, async (req, res) => {
  try {
    const user = await db.getOne(
      'SELECT id, name, email, plan_id, plan_status, credits_remaining, credits_used, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const plan = await db.getOne('SELECT * FROM plans WHERE id = ?', [user.plan_id || 1]);
    let planFeatures = [];
    if (plan?.features) {
      try { planFeatures = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features; } catch (e) {}
    }

    const payments = await db.query(
      'SELECT p.*, pl.name as plan_name FROM payments p LEFT JOIN plans pl ON p.plan_id = pl.id WHERE p.user_id = ? ORDER BY p.id DESC LIMIT 10',
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      data: {
        user,
        plan: plan ? { ...plan, features: planFeatures } : null,
        payments
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ========================================================
 * ADMIN MANAGEMENT ROUTES (Requires role === 'SUPER_ADMIN')
 * ========================================================
 */

const adminCheck = (req, res, next) => {
  if (req.user && req.user.role === 'SUPER_ADMIN') return next();
  return res.status(403).json({ success: false, message: 'Access denied: Super Admin privilege required.' });
};

/**
 * @route GET /api/admin/payments
 * @desc List all payments for admin review
 */
router.get('/admin/payments', jwtAuth, adminCheck, async (req, res) => {
  try {
    const payments = await db.query(`
      SELECT p.*, u.name as user_name, u.email as user_email, u.phone as user_phone, pl.name as plan_name
      FROM payments p
      JOIN users u ON p.user_id = u.id
      JOIN plans pl ON p.plan_id = pl.id
      ORDER BY p.id DESC
    `);

    return res.status(200).json({ success: true, count: payments.length, data: payments });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/admin/payments/:id/approve
 * @desc Approve user payment and activate plan
 */
router.post('/admin/payments/:id/approve', jwtAuth, adminCheck, async (req, res) => {
  try {
    const paymentId = parseInt(req.params.id, 10);
    const payment = await db.getOne('SELECT * FROM payments WHERE id = ?', [paymentId]);

    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });
    if (payment.status === 'APPROVED') return res.status(400).json({ success: false, message: 'Payment is already approved.' });

    const plan = await db.getOne('SELECT * FROM plans WHERE id = ?', [payment.plan_id]);

    await db.query(
      'UPDATE payments SET status = "APPROVED", approved_at = CURRENT_TIMESTAMP WHERE id = ?',
      [paymentId]
    );

    // Upgrade user
    await db.query(
      'UPDATE users SET plan_id = ?, plan_status = "ACTIVE", credits_remaining = credits_remaining + ? WHERE id = ?',
      [payment.plan_id, plan ? plan.message_limit : 5000, payment.user_id]
    );

    return res.status(200).json({ success: true, message: `Payment #${paymentId} approved! User subscription activated.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/admin/payments/:id/reject
 * @desc Reject user payment
 */
router.post('/admin/payments/:id/reject', jwtAuth, adminCheck, async (req, res) => {
  try {
    const paymentId = parseInt(req.params.id, 10);
    await db.query('UPDATE payments SET status = "REJECTED" WHERE id = ?', [paymentId]);
    return res.status(200).json({ success: true, message: `Payment #${paymentId} rejected.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/admin/users
 * @desc List all SaaS users with subscription status
 */
router.get('/admin/users', jwtAuth, adminCheck, async (req, res) => {
  try {
    const users = await db.query(`
      SELECT u.id, u.name, u.email, u.phone, u.company, u.role, u.plan_status, u.credits_remaining, u.credits_used, u.created_at, pl.name as plan_name
      FROM users u
      LEFT JOIN plans pl ON u.plan_id = pl.id
      ORDER BY u.id DESC
    `);

    return res.status(200).json({ success: true, count: users.length, data: users });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
