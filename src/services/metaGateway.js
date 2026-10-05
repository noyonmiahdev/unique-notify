/**
 * Official Meta WhatsApp Cloud API Gateway Service
 * Direct integration with Meta Graph API v21.0
 */

const axios = require('axios');
const db = require('../config/database');
const { sanitizePhoneNumber } = require('../utils/phoneFormatter');

class MetaGateway {
  /**
   * Retrieves active Meta credentials from DB or environment
   */
  static async getCredentials() {
    const gateway = await db.getOne("SELECT config FROM gateways WHERE type = 'meta' LIMIT 1");
    let config = {};
    if (gateway && gateway.config) {
      try {
        config = typeof gateway.config === 'string' ? JSON.parse(gateway.config) : gateway.config;
      } catch (e) {
        config = {};
      }
    }

    return {
      apiVersion: config.api_version || process.env.META_API_VERSION || 'v21.0',
      phoneNumberId: config.phone_number_id || process.env.META_PHONE_NUMBER_ID || '',
      wabaId: config.waba_id || process.env.META_WABA_ID || '',
      accessToken: config.access_token || process.env.META_ACCESS_TOKEN || '',
      verifyToken: config.verify_token || process.env.META_WEBHOOK_VERIFY_TOKEN || 'unique_notify_verify_token_123'
    };
  }

  /**
   * Base Axios client configured for Meta Graph API
   */
  static async getClient() {
    const creds = await this.getCredentials();
    if (!creds.accessToken || !creds.phoneNumberId) {
      throw new Error('Meta WhatsApp Cloud API is not configured. Please enter Phone Number ID and Access Token in settings.');
    }

    return {
      creds,
      http: axios.create({
        baseURL: `https://graph.facebook.com/${creds.apiVersion}/${creds.phoneNumberId}`,
        headers: {
          'Authorization': `Bearer ${creds.accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      })
    };
  }

  /**
   * Test connection and token validity
   */
  static async testConnection() {
    try {
      const { creds, http } = await this.getClient();
      const response = await http.get('');
      return {
        success: true,
        data: response.data,
        message: `Connected successfully. Phone: ${response.data.display_phone_number || response.data.id}`
      };
    } catch (err) {
      const errorDetail = err.response?.data?.error?.message || err.message;
      return {
        success: false,
        message: `Meta API connection failed: ${errorDetail}`
      };
    }
  }

  /**
   * Sends a plain text message via Meta Cloud API
   * @param {string} rawPhone 
   * @param {string} text 
   * @param {boolean} previewUrl 
   */
  static async sendText(rawPhone, text, previewUrl = false) {
    const phone = sanitizePhoneNumber(rawPhone);
    const { http } = await this.getClient();

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'text',
      text: {
        preview_url: previewUrl,
        body: text
      }
    };

    try {
      const response = await http.post('/messages', payload);
      const messageId = response.data?.messages?.[0]?.id;

      // Log outbound message in DB
      await db.query(
        `INSERT INTO message_logs (gateway_type, direction, recipient_phone, message_type, content, meta_message_id, status)
         VALUES ('meta', 'OUTBOUND', ?, 'TEXT', ?, ?, 'SENT')`,
        [phone, text, messageId]
      );

      return {
        success: true,
        messageId,
        data: response.data
      };
    } catch (err) {
      const errorMsg = err.response?.data?.error?.message || err.message;
      
      await db.query(
        `INSERT INTO message_logs (gateway_type, direction, recipient_phone, message_type, content, status, error_reason)
         VALUES ('meta', 'OUTBOUND', ?, 'TEXT', 'FAILED', ?)`,
        [phone, text, errorMsg]
      );

      throw new Error(`Meta API Error: ${errorMsg}`);
    }
  }

  /**
   * Sends an Official Template Message (e.g. Authentication OTP or Marketing Broadcast)
   * @param {string} rawPhone 
   * @param {string} templateName 
   * @param {string} languageCode (e.g. 'en_US', 'en', 'bn')
   * @param {Array} components Meta template components array
   */
  static async sendTemplate(rawPhone, templateName, languageCode = 'en_US', components = []) {
    const phone = sanitizePhoneNumber(rawPhone);
    const { http } = await this.getClient();

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode
        },
        components: components
      }
    };

    try {
      const response = await http.post('/messages', payload);
      const messageId = response.data?.messages?.[0]?.id;

      await db.query(
        `INSERT INTO message_logs (gateway_type, direction, recipient_phone, message_type, template_name, template_params, meta_message_id, status)
         VALUES ('meta', 'OUTBOUND', ?, 'TEMPLATE', ?, ?, ?, 'SENT')`,
        [phone, templateName, JSON.stringify(components), messageId]
      );

      return {
        success: true,
        messageId,
        data: response.data
      };
    } catch (err) {
      const errorMsg = err.response?.data?.error?.message || err.message;
      await db.query(
        `INSERT INTO message_logs (gateway_type, direction, recipient_phone, message_type, template_name, template_params, status, error_reason)
         VALUES ('meta', 'OUTBOUND', ?, 'TEMPLATE', ?, ?, 'FAILED', ?)`,
        [phone, templateName, JSON.stringify(components), errorMsg]
      );
      throw new Error(`Meta Template Error: ${errorMsg}`);
    }
  }

  /**
   * Sends OTP via Meta Cloud API (Auto-handles Template with OTP button or Direct text fallback)
   */
  static async sendOtp(rawPhone, otpCode, options = {}) {
    const {
      templateName = null,
      languageCode = 'en_US',
      serviceName = 'Unique-Notify',
      expiryMinutes = 5
    } = options;

    const phone = sanitizePhoneNumber(rawPhone);

    // If template specified, format as official Meta authentication template
    if (templateName) {
      const components = [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: String(otpCode) }
          ]
        },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [
            { type: 'text', text: String(otpCode) }
          ]
        }
      ];
      return await this.sendTemplate(phone, templateName, languageCode, components);
    }

    // Default fast OTP text format
    const defaultText = `*${serviceName} Verification Code*\n\nYour OTP code is: *${otpCode}*\n\nThis code will expire in ${expiryMinutes} minutes. For security, please do not share this code with anyone.`;
    return await this.sendText(phone, defaultText);
  }

  /**
   * Sends media message (Image, Document, Video, Audio)
   */
  static async sendMedia(rawPhone, mediaType = 'image', mediaUrl, caption = '', filename = '') {
    const phone = sanitizePhoneNumber(rawPhone);
    const { http } = await this.getClient();

    const validTypes = ['image', 'document', 'video', 'audio'];
    const type = validTypes.includes(mediaType.toLowerCase()) ? mediaType.toLowerCase() : 'document';

    const mediaObject = { link: mediaUrl };
    if (caption && type !== 'audio') mediaObject.caption = caption;
    if (filename && type === 'document') mediaObject.filename = filename;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: type,
      [type]: mediaObject
    };

    try {
      const response = await http.post('/messages', payload);
      const messageId = response.data?.messages?.[0]?.id;

      await db.query(
        `INSERT INTO message_logs (gateway_type, direction, recipient_phone, message_type, content, media_url, meta_message_id, status)
         VALUES ('meta', 'OUTBOUND', ?, 'MEDIA', ?, ?, ?, 'SENT')`,
        [phone, caption || filename, mediaUrl, messageId]
      );

      return {
        success: true,
        messageId,
        data: response.data
      };
    } catch (err) {
      const errorMsg = err.response?.data?.error?.message || err.message;
      await db.query(
        `INSERT INTO message_logs (gateway_type, direction, recipient_phone, message_type, content, media_url, status, error_reason)
         VALUES ('meta', 'OUTBOUND', ?, 'MEDIA', ?, ?, 'FAILED', ?)`,
        [phone, caption || filename, mediaUrl, errorMsg]
      );
      throw new Error(`Meta Media Error: ${errorMsg}`);
    }
  }

  /**
   * Fetch official approved templates from WABA account and sync to database
   */
  static async syncTemplates() {
    const creds = await this.getCredentials();
    if (!creds.wabaId || !creds.accessToken) {
      throw new Error('Meta WABA ID and Access Token are required to sync templates.');
    }

    const url = `https://graph.facebook.com/${creds.apiVersion}/${creds.wabaId}/message_templates?limit=100`;
    const response = await axios.get(url, {
      headers: { 'Authorization': `Bearer ${creds.accessToken}` }
    });

    const templates = response.data?.data || [];
    let syncedCount = 0;

    for (const tpl of templates) {
      const existing = await db.getOne('SELECT id FROM meta_templates WHERE name = ? AND language = ?', [tpl.name, tpl.language]);
      const componentsJson = JSON.stringify(tpl.components || []);

      if (existing) {
        await db.query(
          'UPDATE meta_templates SET template_id = ?, category = ?, status = ?, components = ?, last_synced_at = CURRENT_TIMESTAMP WHERE id = ?',
          [tpl.id, tpl.category, tpl.status, componentsJson, existing.id]
        );
      } else {
        await db.query(
          'INSERT INTO meta_templates (template_id, name, language, category, status, components) VALUES (?, ?, ?, ?, ?, ?)',
          [tpl.id, tpl.name, tpl.language, tpl.category, tpl.status, componentsJson]
        );
      }
      syncedCount++;
    }

    return { success: true, count: syncedCount, templates };
  }

  /**
   * Handles incoming Webhook events from Meta Cloud API
   */
  static async handleWebhook(body) {
    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value) continue;

        // 1. Process Status Updates (sent, delivered, read, failed)
        if (value.statuses && Array.isArray(value.statuses)) {
          for (const statusObj of value.statuses) {
            const messageId = statusObj.id;
            const statusUpper = (statusObj.status || '').toUpperCase();
            let mappedStatus = 'SENT';
            if (statusUpper === 'DELIVERED') mappedStatus = 'DELIVERED';
            else if (statusUpper === 'READ') mappedStatus = 'READ';
            else if (statusUpper === 'FAILED') mappedStatus = 'FAILED';

            const errorReason = statusObj.errors ? JSON.stringify(statusObj.errors) : null;

            await db.query(
              'UPDATE message_logs SET status = ?, error_reason = COALESCE(?, error_reason), updated_at = CURRENT_TIMESTAMP WHERE meta_message_id = ?',
              [mappedStatus, errorReason, messageId]
            );
          }
        }

        // 2. Process Inbound Messages (Replies from customers)
        if (value.messages && Array.isArray(value.messages)) {
          for (const msg of value.messages) {
            const fromPhone = msg.from;
            let msgContent = '';
            let msgType = (msg.type || 'TEXT').toUpperCase();

            if (msg.type === 'text') {
              msgContent = msg.text?.body || '';
            } else if (msg.type === 'button') {
              msgContent = msg.button?.text || '';
            } else if (msg.type === 'interactive') {
              msgContent = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '';
            }

            await db.query(
              `INSERT INTO message_logs (gateway_type, direction, recipient_phone, message_type, content, meta_message_id, status)
               VALUES ('meta', 'INBOUND', ?, ?, ?, ?, 'DELIVERED')`,
              [fromPhone, msgType, msgContent, msg.id]
            );
          }
        }
      }
    }
  }
}

module.exports = MetaGateway;
