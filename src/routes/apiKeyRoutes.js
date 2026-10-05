/**
 * API Keys Management Endpoints (/api/v1/api-keys)
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/database');

/**
 * @route GET /api/v1/api-keys
 * @desc List all API Keys
 */
router.get('/', async (req, res) => {
  try {
    const keys = await db.query('SELECT id, name, api_key, is_active, rate_limit_per_min, allowed_ips, created_at, last_used_at FROM api_keys ORDER BY id DESC');
    return res.status(200).json({ success: true, data: keys });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/v1/api-keys
 * @desc Generate a new API key for external app/WHMCS integration
 */
router.post('/', async (req, res) => {
  try {
    const { name = 'Integration Key', rate_limit_per_min = 120, allowed_ips = null } = req.body;
    const rawKey = 'un_live_' + crypto.randomBytes(18).toString('hex');

    const result = await db.query(
      'INSERT INTO api_keys (name, api_key, is_active, rate_limit_per_min, allowed_ips) VALUES (?, ?, 1, ?, ?)',
      [name, rawKey, rate_limit_per_min, allowed_ips]
    );

    return res.status(201).json({
      success: true,
      message: 'API Key generated successfully',
      data: {
        id: result.insertId,
        name,
        api_key: rawKey,
        rate_limit_per_min,
        allowed_ips
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route PATCH /api/v1/api-keys/:id/toggle
 * @desc Toggle active status
 */
router.patch('/:id/toggle', async (req, res) => {
  try {
    const keyId = parseInt(req.params.id, 10);
    const existing = await db.getOne('SELECT is_active FROM api_keys WHERE id = ?', [keyId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'API key not found.' });
    }

    const newStatus = existing.is_active ? 0 : 1;
    await db.query('UPDATE api_keys SET is_active = ? WHERE id = ?', [newStatus, keyId]);

    return res.status(200).json({
      success: true,
      message: `API Key status updated to ${newStatus ? 'Active' : 'Disabled'}.`,
      is_active: newStatus
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route DELETE /api/v1/api-keys/:id
 * @desc Delete an API Key
 */
router.delete('/:id', async (req, res) => {
  try {
    const keyId = parseInt(req.params.id, 10);
    await db.query('DELETE FROM api_keys WHERE id = ?', [keyId]);
    return res.status(200).json({ success: true, message: 'API key revoked and deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
