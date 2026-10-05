/**
 * Meta WhatsApp Cloud API Webhook Listener (/api/v1/webhook/meta)
 */

const express = require('express');
const router = express.Router();
const MetaGateway = require('../../../services/metaGateway');

/**
 * @route GET /api/v1/webhook/meta
 * @desc Meta Webhook Verification Handshake
 */
router.get('/meta', async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const creds = await MetaGateway.getCredentials();
  const expectedToken = creds.verifyToken || process.env.META_WEBHOOK_VERIFY_TOKEN || 'unique_notify_verify_token_123';

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('[Meta Webhook] Webhook verified successfully by Meta challenge!');
    return res.status(200).send(challenge);
  } else {
    console.warn(`[Meta Webhook] Verification failed. Received token: ${token}, Expected: ${expectedToken}`);
    return res.sendStatus(403);
  }
});

/**
 * @route POST /api/v1/webhook/meta
 * @desc Receive delivery status receipts and incoming replies from Meta
 */
router.post('/meta', async (req, res) => {
  try {
    const body = req.body;
    // Process async to return 200 immediately to Meta
    MetaGateway.handleWebhook(body).catch(err => {
      console.error('[Meta Webhook] Error handling payload:', err);
    });

    return res.status(200).send('EVENT_RECEIVED');
  } catch (err) {
    console.error('[Meta Webhook] Catch error:', err);
    return res.status(200).send('EVENT_RECEIVED'); // Always return 200 to prevent Meta retry loops
  }
});

module.exports = router;
