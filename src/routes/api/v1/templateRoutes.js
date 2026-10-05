/**
 * Meta Message Templates Routes (/api/v1/templates)
 */

const express = require('express');
const router = express.Router();
const MetaGateway = require('../../../services/metaGateway');
const db = require('../../../config/database');

/**
 * @route GET /api/v1/templates
 * @desc List synced message templates
 */
router.get('/', async (req, res) => {
  try {
    const templates = await db.query('SELECT * FROM meta_templates ORDER BY name ASC');
    const parsed = templates.map(t => {
      let components = [];
      try { components = typeof t.components === 'string' ? JSON.parse(t.components) : t.components; } catch (e) {}
      return { ...t, components };
    });

    return res.status(200).json({
      success: true,
      count: parsed.length,
      data: parsed
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/v1/templates/sync
 * @desc Trigger manual sync from Meta WhatsApp Business Account
 */
router.post('/sync', async (req, res) => {
  try {
    const syncResult = await MetaGateway.syncTemplates();
    return res.status(200).json({
      success: true,
      message: `Successfully synced ${syncResult.count} templates from Meta WABA.`,
      data: syncResult
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
