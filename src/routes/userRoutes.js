/**
 * User Contacts & Settings Routes (/api/user)
 * Handles contact book, per-user anti-ban preferences, and profile updates.
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const jwtAuth = require('../middlewares/jwtAuth');

/* ────────────────────────────────────────────────
   PROFILE
──────────────────────────────────────────────── */

router.get('/profile', jwtAuth, async (req, res) => {
  try {
    const user = await db.getOne(`
      SELECT u.id, u.name, u.email, u.phone, u.company, u.plan_id, u.plan_status,
             u.credits_remaining, u.credits_used, u.created_at, pl.name as plan_name, pl.message_limit
      FROM users u LEFT JOIN plans pl ON u.plan_id = pl.id
      WHERE u.id = ?`, [req.user.id]
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.status(200).json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/profile', jwtAuth, async (req, res) => {
  try {
    const { name, phone, company } = req.body;
    await db.query('UPDATE users SET name = ?, phone = ?, company = ? WHERE id = ?',
      [name, phone || null, company || null, req.user.id]);
    return res.status(200).json({ success: true, message: 'Profile updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/profile/password', jwtAuth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password || new_password.length < 6)
      return res.status(400).json({ success: false, message: 'Invalid password data.' });

    const user = await db.getOne('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const match = await bcrypt.compare(current_password, user.password);
    if (!match) return res.status(401).json({ success: false, message: 'Current password is incorrect.' });

    const hash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id]);
    return res.status(200).json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* ────────────────────────────────────────────────
   MESSAGE LOGS
──────────────────────────────────────────────── */

router.get('/messages', jwtAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, gateway_type } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let sql = 'SELECT * FROM message_logs WHERE user_id = ?';
    const params = [req.user.id];
    if (status)       { sql += ' AND status = ?';        params.push(status); }
    if (gateway_type) { sql += ' AND gateway_type = ?';  params.push(gateway_type); }
    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const messages = await db.query(sql, params);
    const totalRow = await db.getOne('SELECT COUNT(*) as c FROM message_logs WHERE user_id = ?', [req.user.id]);
    return res.status(200).json({ success: true, messages, total: totalRow?.c || 0, page: parseInt(page) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/messages/stats', jwtAuth, async (req, res) => {
  try {
    const total    = await db.getOne('SELECT COUNT(*) as c FROM message_logs WHERE user_id = ?', [req.user.id]);
    const sent     = await db.getOne('SELECT COUNT(*) as c FROM message_logs WHERE user_id = ? AND status = "SENT"', [req.user.id]);
    const failed   = await db.getOne('SELECT COUNT(*) as c FROM message_logs WHERE user_id = ? AND status = "FAILED"', [req.user.id]);
    const pending  = await db.getOne('SELECT COUNT(*) as c FROM message_logs WHERE user_id = ? AND status = "QUEUED"', [req.user.id]);
    return res.status(200).json({ success: true, stats: {
      total: total?.c || 0,
      sent: sent?.c || 0,
      failed: failed?.c || 0,
      pending: pending?.c || 0
    }});
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* ────────────────────────────────────────────────
   CONTACT BOOK
──────────────────────────────────────────────── */

router.get('/contacts', jwtAuth, async (req, res) => {
  try {
    const { group_name, search } = req.query;
    let sql = 'SELECT * FROM contacts WHERE user_id = ? AND is_active = 1';
    const params = [req.user.id];
    if (group_name) { sql += ' AND group_name = ?'; params.push(group_name); }
    if (search)     { sql += ' AND (name LIKE ? OR phone LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    sql += ' ORDER BY group_name ASC, name ASC';

    const contacts = await db.query(sql, params);
    const groups   = await db.query(
      'SELECT DISTINCT group_name, COUNT(*) as count FROM contacts WHERE user_id = ? AND is_active = 1 GROUP BY group_name',
      [req.user.id]
    );
    return res.status(200).json({ success: true, contacts, groups });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/contacts', jwtAuth, async (req, res) => {
  try {
    const { name, phone, email, group_name, notes } = req.body;
    if (!name || !phone) return res.status(400).json({ success: false, message: 'Name and phone required.' });

    const result = await db.query(
      'INSERT INTO contacts (user_id, name, phone, email, group_name, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, name, phone, email || null, group_name || 'Default', notes || null]
    );
    return res.status(201).json({ success: true, message: 'Contact saved.', id: result.insertId });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/contacts/bulk-import', jwtAuth, async (req, res) => {
  try {
    const { contacts, group_name } = req.body;
    if (!contacts || !Array.isArray(contacts))
      return res.status(400).json({ success: false, message: 'Contacts array required.' });

    let imported = 0;
    let skipped = 0;
    for (const c of contacts) {
      if (!c.phone) { skipped++; continue; }
      try {
        await db.query(
          'INSERT INTO contacts (user_id, name, phone, email, group_name) VALUES (?, ?, ?, ?, ?)',
          [req.user.id, c.name || c.phone, c.phone, c.email || null, group_name || c.group_name || 'Imported']
        );
        imported++;
      } catch (_) { skipped++; }
    }
    return res.status(200).json({ success: true, message: `Imported ${imported} contacts, skipped ${skipped}.`, imported, skipped });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/contacts/:id', jwtAuth, async (req, res) => {
  try {
    const { name, phone, email, group_name, notes } = req.body;
    const contact = await db.getOne('SELECT id FROM contacts WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found.' });

    await db.query(
      'UPDATE contacts SET name = ?, phone = ?, email = ?, group_name = ?, notes = ?, updated_at = NOW() WHERE id = ?',
      [name, phone, email || null, group_name || 'Default', notes || null, req.params.id]
    );
    return res.status(200).json({ success: true, message: 'Contact updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/contacts/:id', jwtAuth, async (req, res) => {
  try {
    await db.query('UPDATE contacts SET is_active = 0 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    return res.status(200).json({ success: true, message: 'Contact deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/contacts/group/:groupName', jwtAuth, async (req, res) => {
  try {
    await db.query('UPDATE contacts SET is_active = 0 WHERE user_id = ? AND group_name = ?', [req.user.id, req.params.groupName]);
    return res.status(200).json({ success: true, message: 'Group deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* ────────────────────────────────────────────────
   USER ANTI-BAN SETTINGS
──────────────────────────────────────────────── */

router.get('/settings', jwtAuth, async (req, res) => {
  try {
    let settings = await db.getOne('SELECT * FROM user_settings WHERE user_id = ?', [req.user.id]);
    if (!settings) {
      // Return global defaults
      const globals = await db.query('SELECT * FROM system_settings WHERE setting_key LIKE "anti_ban%"');
      const g = {};
      globals.forEach(r => { g[r.setting_key] = r.setting_value; });
      settings = {
        user_id: req.user.id,
        anti_ban_min_delay: parseInt(g.anti_ban_min_delay || 5),
        anti_ban_max_delay: parseInt(g.anti_ban_max_delay || 15),
        anti_ban_typing_sim: g.anti_ban_typing_sim === 'true' ? 1 : 0,
        anti_ban_daily_limit: parseInt(g.anti_ban_daily_limit || 1000),
        anti_ban_quiet_hours: 0,
        anti_ban_quiet_start: '23:00',
        anti_ban_quiet_end: '07:00',
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

router.post('/settings', jwtAuth, async (req, res) => {
  try {
    const { anti_ban_min_delay, anti_ban_max_delay, anti_ban_typing_sim, anti_ban_daily_limit,
            anti_ban_quiet_hours, anti_ban_quiet_start, anti_ban_quiet_end, default_gateway, notify_on_delivery } = req.body;

    // Check global limits (admin can restrict max daily limit per plan)
    const user = await db.getOne('SELECT plan_id FROM users WHERE id = ?', [req.user.id]);
    const plan = user ? await db.getOne('SELECT message_limit FROM plans WHERE id = ?', [user.plan_id]) : null;
    const maxAllowed = plan ? plan.message_limit : 1000;

    const effectiveDailyLimit = Math.min(parseInt(anti_ban_daily_limit || 1000), maxAllowed);

    const existing = await db.getOne('SELECT id FROM user_settings WHERE user_id = ?', [req.user.id]);
    if (existing) {
      await db.query(`
        UPDATE user_settings SET
          anti_ban_min_delay=?, anti_ban_max_delay=?, anti_ban_typing_sim=?, anti_ban_daily_limit=?,
          anti_ban_quiet_hours=?, anti_ban_quiet_start=?, anti_ban_quiet_end=?,
          default_gateway=?, notify_on_delivery=?, updated_at=NOW()
        WHERE user_id=?`,
        [anti_ban_min_delay, anti_ban_max_delay, anti_ban_typing_sim ? 1 : 0, effectiveDailyLimit,
         anti_ban_quiet_hours ? 1 : 0, anti_ban_quiet_start, anti_ban_quiet_end,
         default_gateway, notify_on_delivery ? 1 : 0, req.user.id]
      );
    } else {
      await db.query(`
        INSERT INTO user_settings (user_id, anti_ban_min_delay, anti_ban_max_delay, anti_ban_typing_sim, anti_ban_daily_limit,
          anti_ban_quiet_hours, anti_ban_quiet_start, anti_ban_quiet_end, default_gateway, notify_on_delivery)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, anti_ban_min_delay, anti_ban_max_delay, anti_ban_typing_sim ? 1 : 0, effectiveDailyLimit,
         anti_ban_quiet_hours ? 1 : 0, anti_ban_quiet_start, anti_ban_quiet_end,
         default_gateway, notify_on_delivery ? 1 : 0]
      );
    }
    return res.status(200).json({ success: true, message: 'Anti-ban settings saved.', effective_daily_limit: effectiveDailyLimit });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* ────────────────────────────────────────────────
   API KEYS (User's own keys)
──────────────────────────────────────────────── */

router.get('/api-keys', jwtAuth, async (req, res) => {
  try {
    const keys = await db.query(
      'SELECT id, name, api_key, is_active, rate_limit_per_min, created_at, last_used_at FROM api_keys WHERE user_id = ? ORDER BY id DESC',
      [req.user.id]
    );
    return res.status(200).json({ success: true, keys });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* ────────────────────────────────────────────────
   BILLING SUMMARY (User-facing)
──────────────────────────────────────────────── */

router.get('/billing', jwtAuth, async (req, res) => {
  try {
    const payments = await db.query(`
      SELECT p.*, pl.name as plan_name, pl.message_limit
      FROM payments p LEFT JOIN plans pl ON p.plan_id = pl.id
      WHERE p.user_id = ? ORDER BY p.id DESC`, [req.user.id]
    );
    return res.status(200).json({ success: true, payments });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
