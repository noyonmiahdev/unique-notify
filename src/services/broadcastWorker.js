/**
 * Broadcast Campaign Queue Worker
 * Processes bulk WhatsApp campaigns with Anti-Ban rate limiting, Spintax rendering, and progress streaming.
 */

const db = require('../config/database');
const AntiBanEngine = require('./antiBanEngine');
const MetaGateway = require('./metaGateway');
const qrGateway = require('./qrGateway');
const { renderMessage } = require('../utils/spintax');

class BroadcastWorker {
  constructor() {
    this.activeCampaigns = new Map(); // campaignId -> { isPaused, isCancelled }
    this.eventEmitters = new Set();
  }

  registerSocketEmitter(emitter) {
    this.eventEmitters.add(emitter);
  }

  broadcast(event, data) {
    for (const emitter of this.eventEmitters) {
      if (typeof emitter.emit === 'function') {
        emitter.emit(event, data);
      }
    }
  }

  /**
   * Starts or resumes a broadcast campaign
   * @param {number} campaignId 
   */
  async runCampaign(campaignId) {
    if (this.activeCampaigns.has(campaignId)) {
      const state = this.activeCampaigns.get(campaignId);
      if (state.isPaused) {
        state.isPaused = false;
        console.log(`[Campaign Worker] Resuming campaign #${campaignId}...`);
      } else {
        console.log(`[Campaign Worker] Campaign #${campaignId} is already running.`);
        return;
      }
    } else {
      this.activeCampaigns.set(campaignId, { isPaused: false, isCancelled: false });
    }

    const campaign = await db.getOne('SELECT * FROM campaigns WHERE id = ?', [campaignId]);
    if (!campaign) {
      this.activeCampaigns.delete(campaignId);
      return;
    }

    await db.query(
      "UPDATE campaigns SET status = 'RUNNING', started_at = COALESCE(started_at, CURRENT_TIMESTAMP) WHERE id = ?",
      [campaignId]
    );

    this.broadcast('campaign_status', { campaignId, status: 'RUNNING' });

    console.log(`[Campaign Worker] Starting Campaign #${campaignId} ("${campaign.name}") - Total: ${campaign.total_contacts}`);

    // Fetch pending items
    const items = await db.query(
      "SELECT * FROM campaign_items WHERE campaign_id = ? AND status = 'PENDING' ORDER BY id ASC",
      [campaignId]
    );

    const minDelay = campaign.min_delay_sec || 5;
    const maxDelay = campaign.max_delay_sec || 15;
    const gatewayType = campaign.gateway_type || 'qr';

    for (const item of items) {
      const state = this.activeCampaigns.get(campaignId);
      
      // Handle Pause
      if (state?.isPaused) {
        await db.query("UPDATE campaigns SET status = 'PAUSED' WHERE id = ?", [campaignId]);
        this.broadcast('campaign_status', { campaignId, status: 'PAUSED' });
        console.log(`[Campaign Worker] Campaign #${campaignId} paused.`);
        return;
      }

      // Handle Cancel
      if (state?.isCancelled) {
        await db.query("UPDATE campaigns SET status = 'CANCELLED' WHERE id = ?", [campaignId]);
        this.broadcast('campaign_status', { campaignId, status: 'CANCELLED' });
        this.activeCampaigns.delete(campaignId);
        console.log(`[Campaign Worker] Campaign #${campaignId} cancelled.`);
        return;
      }

      // 1. Anti-Ban Quiet Hours Check
      const quietCheck = await AntiBanEngine.checkQuietHours();
      if (!quietCheck.allowed) {
        console.warn(`[Campaign Worker] Pausing campaign #${campaignId} due to Quiet Hours: ${quietCheck.reason}`);
        await db.query("UPDATE campaigns SET status = 'PAUSED' WHERE id = ?", [campaignId]);
        this.broadcast('campaign_status', { campaignId, status: 'PAUSED', reason: quietCheck.reason });
        this.activeCampaigns.delete(campaignId);
        return;
      }

      // 2. Prepare Dynamic Safe Message (Spintax + Variables)
      let customVars = {};
      try {
        if (item.custom_variables) {
          customVars = typeof item.custom_variables === 'string' ? JSON.parse(item.custom_variables) : item.custom_variables;
        }
      } catch (e) {}

      const variables = {
        name: item.name || 'Valued Customer',
        phone: item.phone,
        ...customVars
      };

      const finalMessage = AntiBanEngine.generateSafeMessage(campaign.message_template, variables);

      // 3. Send Message
      try {
        if (gatewayType === 'meta') {
          if (campaign.media_url) {
            await MetaGateway.sendMedia(item.phone, campaign.media_type || 'image', campaign.media_url, finalMessage);
          } else {
            await MetaGateway.sendText(item.phone, finalMessage);
          }
        } else {
          // QR Gateway
          if (campaign.media_url) {
            await qrGateway.sendMedia(item.phone, campaign.media_url, campaign.media_type || 'image', finalMessage, 'media', {
              simulateTyping: true
            });
          } else {
            await qrGateway.sendText(item.phone, finalMessage, { simulateTyping: true });
          }
        }

        // Update item as SENT
        await db.query(
          "UPDATE campaign_items SET status = 'SENT', rendered_message = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?",
          [finalMessage, item.id]
        );

        // Update campaign counters
        await db.query(
          "UPDATE campaigns SET sent_count = COALESCE(sent_count, 0) + 1 WHERE id = ?",
          [campaignId]
        );

      } catch (err) {
        console.error(`[Campaign Worker] Error sending to ${item.phone}:`, err.message);
        await db.query(
          "UPDATE campaign_items SET status = 'FAILED', error_message = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?",
          [err.message, item.id]
        );
        await db.query(
          "UPDATE campaigns SET failed_count = COALESCE(failed_count, 0) + 1 WHERE id = ?",
          [campaignId]
        );
      }

      // Fetch fresh counters
      const updatedCampaign = await db.getOne('SELECT sent_count, failed_count, total_contacts FROM campaigns WHERE id = ?', [campaignId]);
      
      this.broadcast('campaign_progress', {
        campaignId,
        sent: updatedCampaign.sent_count,
        failed: updatedCampaign.failed_count,
        total: updatedCampaign.total_contacts,
        lastPhone: item.phone
      });

      // 4. Anti-Ban Jitter Delay
      await AntiBanEngine.randomDelay(minDelay, maxDelay);
    }

    // Mark Campaign COMPLETED
    await db.query(
      "UPDATE campaigns SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP WHERE id = ?",
      [campaignId]
    );

    this.broadcast('campaign_status', { campaignId, status: 'COMPLETED' });
    this.activeCampaigns.delete(campaignId);
    console.log(`[Campaign Worker] Campaign #${campaignId} COMPLETED successfully!`);
  }

  pauseCampaign(campaignId) {
    if (this.activeCampaigns.has(campaignId)) {
      this.activeCampaigns.get(campaignId).isPaused = true;
      return true;
    }
    return false;
  }

  cancelCampaign(campaignId) {
    if (this.activeCampaigns.has(campaignId)) {
      this.activeCampaigns.get(campaignId).isCancelled = true;
      return true;
    }
    return false;
  }
}

const broadcastWorkerInstance = new BroadcastWorker();
module.exports = broadcastWorkerInstance;
