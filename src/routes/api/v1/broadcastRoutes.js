/**
 * Broadcast Campaigns API Routes (/api/v1/broadcasts)
 */

const express = require('express');
const router = express.Router();
const db = require('../../../config/database');
const broadcastWorker = require('../../../services/broadcastWorker');
const { sanitizePhoneNumber } = require('../../../utils/phoneFormatter');

/**
 * @route POST /api/v1/broadcasts/create
 * @desc Create a new bulk marketing campaign
 */
router.post('/create', async (req, res) => {
  try {
    const {
      name,
      message_template,
      messageTemplate,
      gateway_type = 'qr',
      min_delay_sec = 5,
      max_delay_sec = 15,
      media_url = null,
      media_type = 'image',
      contacts = [], // array of { phone, name, ...custom_vars } or string of numbers separated by newline/comma
      auto_start = true
    } = req.body;

    const template = message_template || messageTemplate;
    if (!name || !template) {
      return res.status(400).json({ success: false, message: 'Campaign name and message template are required.' });
    }

    // Parse contacts list
    let parsedContacts = [];
    if (typeof contacts === 'string') {
      const lines = contacts.split(/[\r\n,]+/);
      for (const line of lines) {
        const clean = sanitizePhoneNumber(line);
        if (clean) parsedContacts.push({ phone: clean, name: 'Valued Customer' });
      }
    } else if (Array.isArray(contacts)) {
      for (const c of contacts) {
        const phone = sanitizePhoneNumber(typeof c === 'string' ? c : c.phone);
        if (phone) {
          const { phone: p, name: n, ...customVars } = typeof c === 'object' ? c : {};
          parsedContacts.push({
            phone,
            name: n || 'Valued Customer',
            custom_variables: customVars
          });
        }
      }
    }

    if (parsedContacts.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid phone numbers found in contacts.' });
    }

    // Create Campaign in DB
    const campaignResult = await db.query(
      `INSERT INTO campaigns (name, gateway_type, message_template, media_url, media_type, total_contacts, min_delay_sec, max_delay_sec, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT')`,
      [name, gateway_type, template, media_url, media_type, parsedContacts.length, min_delay_sec, max_delay_sec]
    );

    const campaignId = campaignResult.insertId;

    // Insert Campaign Items
    for (const contact of parsedContacts) {
      const varsJson = contact.custom_variables ? JSON.stringify(contact.custom_variables) : null;
      await db.query(
        'INSERT INTO campaign_items (campaign_id, phone, name, custom_variables, status) VALUES (?, ?, ?, ?, ?)',
        [campaignId, contact.phone, contact.name, varsJson, 'PENDING']
      );
    }

    // Auto-start if requested
    if (auto_start) {
      broadcastWorker.runCampaign(campaignId).catch(err => {
        console.error(`[Campaign Worker] Async error on #${campaignId}:`, err);
      });
    }

    return res.status(201).json({
      success: true,
      message: `Campaign '${name}' created with ${parsedContacts.length} contacts.`,
      data: {
        campaign_id: campaignId,
        name,
        total_contacts: parsedContacts.length,
        status: auto_start ? 'RUNNING' : 'DRAFT'
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/v1/broadcasts
 * @desc List all campaigns
 */
router.get('/', async (req, res) => {
  try {
    const campaigns = await db.query('SELECT * FROM campaigns ORDER BY id DESC');
    return res.status(200).json({
      success: true,
      count: campaigns.length,
      data: campaigns
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/v1/broadcasts/:id
 * @desc Get campaign details and its contact status
 */
router.get('/:id', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id, 10);
    const campaign = await db.getOne('SELECT * FROM campaigns WHERE id = ?', [campaignId]);

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found.' });
    }

    const items = await db.query('SELECT * FROM campaign_items WHERE campaign_id = ? ORDER BY id ASC', [campaignId]);

    return res.status(200).json({
      success: true,
      data: {
        campaign,
        contacts: items
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/v1/broadcasts/:id/start
 * @desc Start or Resume campaign
 */
router.post('/:id/start', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id, 10);
    broadcastWorker.runCampaign(campaignId).catch(err => {
      console.error(`[Campaign Worker] Error running #${campaignId}:`, err);
    });

    return res.status(200).json({ success: true, message: `Campaign #${campaignId} started.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/v1/broadcasts/:id/pause
 * @desc Pause running campaign
 */
router.post('/:id/pause', (req, res) => {
  const campaignId = parseInt(req.params.id, 10);
  const paused = broadcastWorker.pauseCampaign(campaignId);
  return res.status(200).json({
    success: true,
    message: paused ? `Campaign #${campaignId} requested pause.` : `Campaign #${campaignId} is not actively running.`
  });
});

/**
 * @route POST /api/v1/broadcasts/:id/cancel
 * @desc Cancel running campaign
 */
router.post('/:id/cancel', (req, res) => {
  const campaignId = parseInt(req.params.id, 10);
  const cancelled = broadcastWorker.cancelCampaign(campaignId);
  return res.status(200).json({
    success: true,
    message: cancelled ? `Campaign #${campaignId} requested cancellation.` : `Campaign #${campaignId} marked cancelled.`
  });
});

module.exports = router;
