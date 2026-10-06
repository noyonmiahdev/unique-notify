/**
 * Baileys Multi-Device WhatsApp Socket Engine (QR Gateway)
 * Manages active multi-device WhatsApp sessions, QR code streaming, auto-reconnect, and anti-ban presence emulation.
 */

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  proto
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const AntiBanEngine = require('./antiBanEngine');
const { sanitizePhoneNumber, toWhatsAppJid } = require('../utils/phoneFormatter');

class QrGateway {
  constructor() {
    this.sessions = new Map(); // sessionId -> { socket, qrData, status, userJid, pushName }
    this.eventEmitters = new Set(); // Socket.io instances or event listeners
    this.storageBase = path.join(__dirname, '../../storage/sessions');
  }

  /**
   * Register Socket.io / WebSocket event dispatcher
   */
  registerSocketEmitter(emitter) {
    this.eventEmitters.add(emitter);
  }

  /**
   * Broadcast real-time state to connected dashboard clients
   */
  broadcastEvent(event, data) {
    for (const emitter of this.eventEmitters) {
      if (typeof emitter.emit === 'function') {
        emitter.emit(event, data);
      }
    }
  }

  /**
   * Check if an authenticated credentials file exists for this session
   */
  hasSavedCredentials(sessionId = 'primary_qr_session') {
    const sessionDir = path.join(this.storageBase, sessionId);
    const credsFile = path.join(sessionDir, 'creds.json');
    if (!fs.existsSync(credsFile)) return false;
    try {
      const raw = fs.readFileSync(credsFile, 'utf8');
      const parsed = JSON.parse(raw);
      return !!(parsed && parsed.me && parsed.me.id);
    } catch (e) {
      return false;
    }
  }

  /**
   * Initialize a Baileys WhatsApp Session
   * @param {string} sessionId 
   */
  async initSession(sessionId = 'primary_qr_session') {
    if (this.sessions.has(sessionId) && this.sessions.get(sessionId).status === 'CONNECTED') {
      console.log(`[QR Gateway] Session '${sessionId}' is already connected.`);
      return this.sessions.get(sessionId);
    }

    const sessionDir = path.join(this.storageBase, sessionId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    console.log(`[QR Gateway] Initializing session '${sessionId}' at ${sessionDir}...`);
    
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`[QR Gateway] Using Baileys version v${version.join('.')}, isLatest: ${isLatest}`);

    const logger = pino({ level: 'silent' });

    const sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      browser: ['Unique-Notify Hub', 'Chrome', '124.0.0.0'],
      syncFullHistory: false,
      generateHighQualityLinkPreview: true,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      emitOwnEvents: false,
    });

    const sessionData = {
      sessionId,
      socket: sock,
      qrData: null,
      status: 'CONNECTING',
      phoneNumber: state.creds?.me?.id ? state.creds.me.id.split(':')[0] : null,
      pushName: state.creds?.me?.name || 'WhatsApp Device',
      lastSeen: new Date()
    };

    this.sessions.set(sessionId, sessionData);

    // Credential updates
    sock.ev.on('creds.update', saveCreds);

    // Connection updates (QR code, connect, disconnect)
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 7 });
          sessionData.qrData = qrDataUrl;
          sessionData.status = 'SCAN_QR';
          
          await db.query(
            "UPDATE gateways SET status = 'SCAN_QR', updated_at = CURRENT_TIMESTAMP WHERE type = 'qr'"
          );

          this.broadcastEvent('session_qr', {
            sessionId,
            qr: qrDataUrl,
            status: 'SCAN_QR'
          });
          console.log(`[QR Gateway] New QR code generated for '${sessionId}'.`);
        } catch (err) {
          console.error('[QR Gateway] QR generate error:', err);
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.warn(`[QR Gateway] Session '${sessionId}' closed (status: ${statusCode}, reconnect: ${shouldReconnect})`);

        sessionData.status = 'DISCONNECTED';
        sessionData.qrData = null;

        await db.query(
          "UPDATE gateways SET status = 'DISCONNECTED', updated_at = CURRENT_TIMESTAMP WHERE type = 'qr'"
        );

        this.broadcastEvent('session_status', {
          sessionId,
          status: 'DISCONNECTED',
          reason: lastDisconnect?.error?.message || 'Disconnected'
        });

        if (shouldReconnect) {
          console.log(`[QR Gateway] Auto-reconnecting session '${sessionId}' in 5 seconds...`);
          setTimeout(() => this.initSession(sessionId), 5000);
        } else {
          // Logged out: clean session folder so new QR can be requested
          console.log(`[QR Gateway] Session '${sessionId}' was logged out by phone. Cleaning credentials.`);
          try {
            fs.rmSync(sessionDir, { recursive: true, force: true });
          } catch (e) {}
          this.sessions.delete(sessionId);
        }
      } else if (connection === 'open') {
        const phone = sock.user?.id ? sock.user.id.split(':')[0].split('@')[0] : '';
        const name = sock.user?.name || 'WhatsApp Device';
        sessionData.status = 'CONNECTED';
        sessionData.qrData = null;
        sessionData.phoneNumber = phone;
        sessionData.pushName = name;

        console.log(`[QR Gateway] Session '${sessionId}' CONNECTED as ${phone} (${name})`);

        await db.query(
          "UPDATE gateways SET status = 'CONNECTED', phone_number = ?, updated_at = CURRENT_TIMESTAMP WHERE type = 'qr'",
          [phone]
        );

        this.broadcastEvent('session_status', {
          sessionId,
          status: 'CONNECTED',
          phoneNumber: phone,
          pushName: name
        });
      }
    });

    // Inbound Messages Listener
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;
        
        const remoteJid = msg.key.remoteJid;
        if (!remoteJid || remoteJid.includes('@g.us')) continue; // skip group messages for now
        
        const senderPhone = remoteJid.split('@')[0];
        const text = msg.message?.conversation || 
                     msg.message?.extendedTextMessage?.text || 
                     msg.message?.imageMessage?.caption || 
                     '[Media Message]';

        await db.query(
          `INSERT INTO message_logs (gateway_type, direction, recipient_phone, message_type, content, meta_message_id, status)
           VALUES ('qr', 'INBOUND', ?, 'TEXT', ?, ?, 'DELIVERED')`,
          [senderPhone, text, msg.key.id]
        );

        this.broadcastEvent('inbound_message', {
          sessionId,
          from: senderPhone,
          content: text,
          timestamp: new Date()
        });
      }
    });

    return sessionData;
  }

  /**
   * Retrieves active socket instance
   * @param {string} sessionId 
   */
  getSocket(sessionId = 'primary_qr_session') {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'CONNECTED' || !session.socket) {
      throw new Error(`WhatsApp QR session '${sessionId}' is not connected. Please scan QR code in the dashboard.`);
    }
    return session.socket;
  }

  /**
   * Get session status information
   * @param {string} sessionId 
   */
  getSessionInfo(sessionId = 'primary_qr_session') {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        sessionId,
        status: 'DISCONNECTED',
        phoneNumber: null,
        pushName: null,
        qr: null
      };
    }

    return {
      sessionId,
      status: session.status,
      phoneNumber: session.phoneNumber,
      pushName: session.pushName,
      qr: session.qrData
    };
  }

  /**
   * Real-time WhatsApp number verification
   * Checks whether the phone number is registered on WhatsApp network
   * @param {string} rawPhone 
   * @param {string} sessionId 
   */
  async checkNumberOnWhatsApp(rawPhone, sessionId = 'primary_qr_session') {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'CONNECTED' || !session.socket) {
      return { 
        connected: false, 
        registered: false,
        message: 'WhatsApp QR Gateway is offline or not connected. Scan QR in dashboard.' 
      };
    }

    const sock = session.socket;
    const jid = toWhatsAppJid(rawPhone);
    const cleanPhone = sanitizePhoneNumber(rawPhone);

    try {
      const results = await sock.onWhatsApp(jid);
      const isRegistered = results && results.length > 0 && results[0].exists;
      return {
        connected: true,
        registered: !!isRegistered,
        exists: !!isRegistered,
        phone: cleanPhone,
        jid: isRegistered ? results[0].jid : null
      };
    } catch (err) {
      return {
        connected: true,
        registered: false,
        exists: false,
        phone: cleanPhone,
        error: err.message
      };
    }
  }

  /**
   * Send text message with human typing presence emulation
   * @param {string} rawPhone 
   * @param {string} text 
   * @param {object} options 
   */
  async sendText(rawPhone, text, options = {}) {
    const sessionId = options.sessionId || 'primary_qr_session';
    const sock = this.getSocket(sessionId);
    const jid = toWhatsAppJid(rawPhone);
    const cleanPhone = sanitizePhoneNumber(rawPhone);

    // Verify if number exists on WhatsApp
    try {
      const results = await sock.onWhatsApp(jid);
      if (results && results.length > 0 && !results[0].exists) {
        throw new Error(`Recipient number ${cleanPhone} is not registered on WhatsApp.`);
      }
    } catch (waErr) {
      if (waErr.message.includes('not registered')) throw waErr;
    }

    // Emulate human presence if enabled
    const simulateTyping = options.simulateTyping !== false;
    if (simulateTyping) {
      try {
        await sock.sendPresenceUpdate('composing', jid);
        const typingDuration = AntiBanEngine.calculateTypingDuration(text);
        await AntiBanEngine.sleep(typingDuration);
        await sock.sendPresenceUpdate('paused', jid);
      } catch (e) {}
    }

    try {
      const result = await sock.sendMessage(jid, { text: text });
      const msgId = result?.key?.id;

      await db.query(
        `INSERT INTO message_logs (gateway_type, direction, recipient_phone, message_type, content, meta_message_id, status)
         VALUES ('qr', 'OUTBOUND', ?, 'TEXT', ?, ?, 'SENT')`,
        [cleanPhone, text, msgId]
      );

      // Increment gateway count for anti-ban rate limiting
      const gateway = await db.getOne("SELECT id FROM gateways WHERE type = 'qr' LIMIT 1");
      if (gateway) {
        await AntiBanEngine.incrementCount(gateway.id);
      }

      return {
        success: true,
        messageId: msgId,
        recipient: cleanPhone
      };
    } catch (err) {
      await db.query(
        `INSERT INTO message_logs (gateway_type, direction, recipient_phone, message_type, content, status, error_reason)
         VALUES ('qr', 'OUTBOUND', ?, 'TEXT', ?, 'FAILED', ?)`,
        [cleanPhone, text, err.message]
      );
      throw new Error(`WhatsApp QR Send Failed: ${err.message}`);
    }
  }

  /**
   * Send OTP via QR Device
   */
  async sendOtp(rawPhone, otpCode, options = {}) {
    const {
      serviceName = 'Unique-Notify',
      expiryMinutes = 5,
      sessionId = 'primary_qr_session'
    } = options;

    const otpMessage = `*${serviceName} Verification Code*\n\nYour OTP code is: *${otpCode}*\n\nValid for ${expiryMinutes} minutes. Never share this code with anyone.`;
    return await this.sendText(rawPhone, otpMessage, { sessionId, simulateTyping: true });
  }

  /**
   * Send media (image, document/pdf, video, audio)
   * @param {string} rawPhone 
   * @param {string|Buffer} mediaSource (URL or local path or Buffer)
   * @param {string} mediaType ('image'|'document'|'video'|'audio')
   * @param {string} caption 
   * @param {string} filename 
   * @param {object} options 
   */
  async sendMedia(rawPhone, mediaSource, mediaType = 'image', caption = '', filename = '', options = {}) {
    const sessionId = options.sessionId || 'primary_qr_session';
    const sock = this.getSocket(sessionId);
    const jid = toWhatsAppJid(rawPhone);
    const cleanPhone = sanitizePhoneNumber(rawPhone);

    let mediaPayload = {};
    const mediaSourceObj = typeof mediaSource === 'string' && (mediaSource.startsWith('http://') || mediaSource.startsWith('https://'))
      ? { url: mediaSource }
      : (typeof mediaSource === 'string' ? fs.readFileSync(mediaSource) : mediaSource);

    if (mediaType === 'image') {
      mediaPayload = { image: mediaSourceObj, caption: caption };
    } else if (mediaType === 'document' || mediaType === 'pdf') {
      mediaPayload = {
        document: mediaSourceObj,
        mimetype: filename.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
        fileName: filename || 'document.pdf',
        caption: caption
      };
    } else if (mediaType === 'video') {
      mediaPayload = { video: mediaSourceObj, caption: caption };
    } else if (mediaType === 'audio') {
      mediaPayload = { audio: mediaSourceObj, mimetype: 'audio/mp4', ptt: options.ptt || false };
    }

    try {
      const result = await sock.sendMessage(jid, mediaPayload);
      const msgId = result?.key?.id;

      await db.query(
        `INSERT INTO message_logs (gateway_type, direction, recipient_phone, message_type, content, media_url, meta_message_id, status)
         VALUES ('qr', 'OUTBOUND', ?, 'MEDIA', ?, ?, ?, 'SENT')`,
        [cleanPhone, caption || filename, typeof mediaSource === 'string' ? mediaSource : 'Buffer', msgId]
      );

      return {
        success: true,
        messageId: msgId,
        recipient: cleanPhone
      };
    } catch (err) {
      await db.query(
        `INSERT INTO message_logs (gateway_type, direction, recipient_phone, message_type, content, status, error_reason)
         VALUES ('qr', 'OUTBOUND', ?, 'MEDIA', 'FAILED', ?)`,
        [cleanPhone, caption || filename, err.message]
      );
      throw new Error(`WhatsApp QR Media Send Failed: ${err.message}`);
    }
  }

  /**
   * Log out and delete session
   */
  async logoutSession(sessionId = 'primary_qr_session') {
    const session = this.sessions.get(sessionId);
    if (session && session.socket) {
      try {
        await session.socket.logout();
      } catch (e) {}
    }

    const sessionDir = path.join(this.storageBase, sessionId);
    try {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    } catch (e) {}

    this.sessions.delete(sessionId);
    await db.query("UPDATE gateways SET status = 'DISCONNECTED', phone_number = NULL WHERE type = 'qr'");

    this.broadcastEvent('session_status', {
      sessionId,
      status: 'DISCONNECTED',
      phoneNumber: null
    });

    return { success: true, message: `Session '${sessionId}' logged out successfully.` };
  }
}

const qrGatewayInstance = new QrGateway();
module.exports = qrGatewayInstance;
