/**
 * Universal Message Dispatch API Endpoints (/api/v1/messages)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const MetaGateway = require('../../../services/metaGateway');
const qrGateway = require('../../../services/qrGateway');
const OtpService = require('../../../services/otpService');
const db = require('../../../config/database');

// File upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../../../storage/uploads');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'));
  }
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB max

/**
 * @route POST /api/v1/messages/send or /api/v1/messages/send-text
 * @desc Unified WhatsApp message dispatch (Auto routes to connected personal WhatsApp or Meta Cloud)
 */
router.post(['/send', '/send-text', '/'], async (req, res) => {
  try {
    const {
      phone,
      recipient,
      message,
      text,
      media_url,
      mediaUrl,
      media_type,
      mediaType = 'image',
      caption = '',
      filename = '',
      gateway = 'auto',
      simulate_typing = true,
      simulateTyping = true
    } = req.body;

    const targetPhone = phone || recipient;
    const content = message || text;
    const mediaSource = media_url || mediaUrl;

    if (!targetPhone) {
      return res.status(400).json({ success: false, message: 'Recipient phone number is required.' });
    }

    if (!content && !mediaSource) {
      return res.status(400).json({ success: false, message: 'Message text or media_url is required.' });
    }

    const chosenGateway = await OtpService.resolveGateway(gateway);
    let result;

    if (mediaSource) {
      // Send Media
      if (chosenGateway === 'meta') {
        result = await MetaGateway.sendMedia(targetPhone, media_type || mediaType, mediaSource, caption || content || '', filename);
      } else {
        result = await qrGateway.sendMedia(targetPhone, mediaSource, media_type || mediaType, caption || content || '', filename);
      }
    } else {
      // Send Text
      if (chosenGateway === 'meta') {
        result = await MetaGateway.sendText(targetPhone, content);
      } else {
        result = await qrGateway.sendText(targetPhone, content, { simulateTyping: simulate_typing && simulateTyping });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'WhatsApp message sent successfully',
      gateway_used: chosenGateway,
      data: result
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/v1/messages/send-media
 * @desc Send media (Image, PDF, Document, Audio, Video)
 */
router.post('/send-media', upload.single('file'), async (req, res) => {
  try {
    const {
      phone,
      media_url,
      mediaUrl,
      media_type,
      mediaType = 'image',
      caption = '',
      filename = '',
      gateway = 'auto'
    } = req.body;

    let mediaSource = media_url || mediaUrl;
    let actualFilename = filename;

    // Handle uploaded file
    if (req.file) {
      mediaSource = req.file.path;
      actualFilename = req.file.originalname;
    }

    if (!phone || !mediaSource) {
      return res.status(400).json({ success: false, message: 'Phone and media URL or file upload are required.' });
    }

    const chosenGateway = await OtpService.resolveGateway(gateway);
    let result;

    if (chosenGateway === 'meta') {
      // If Meta, media must be a public URL
      if (req.file) {
        // Construct local URL if server is public
        const host = req.get('host');
        const protocol = req.protocol;
        const publicUrl = `${protocol}://${host}/uploads/${path.basename(req.file.path)}`;
        result = await MetaGateway.sendMedia(phone, media_type || mediaType, publicUrl, caption, actualFilename);
      } else {
        result = await MetaGateway.sendMedia(phone, media_type || mediaType, mediaSource, caption, actualFilename);
      }
    } else {
      // QR Baileys can take direct file path or buffer
      result = await qrGateway.sendMedia(phone, mediaSource, media_type || mediaType, caption, actualFilename);
    }

    return res.status(200).json({
      success: true,
      message: 'Media sent successfully',
      gateway_used: chosenGateway,
      data: result
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/v1/messages/send-template
 * @desc Send Meta Official Template Message
 */
router.post('/send-template', async (req, res) => {
  try {
    const {
      phone,
      template_name,
      templateName,
      language_code,
      languageCode = 'en_US',
      components = []
    } = req.body;

    const tplName = template_name || templateName;
    if (!phone || !tplName) {
      return res.status(400).json({ success: false, message: 'Phone and template_name are required.' });
    }

    const result = await MetaGateway.sendTemplate(phone, tplName, language_code || languageCode, components);

    return res.status(200).json({
      success: true,
      message: 'Template message sent successfully via Meta Cloud API',
      data: result
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/v1/messages/logs
 * @desc Get message delivery history with search & filters
 */
router.get('/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const offset = parseInt(req.query.offset || '0', 10);
    const status = req.query.status;
    const gateway = req.query.gateway;
    const search = req.query.search;

    let sql = 'SELECT * FROM message_logs WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status.toUpperCase());
    }

    if (gateway) {
      sql += ' AND gateway_type = ?';
      params.push(gateway.toLowerCase());
    }

    if (search) {
      sql += ' AND (recipient_phone LIKE ? OR content LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const logs = await db.query(sql, params);
    const totalCountRow = await db.getOne('SELECT COUNT(*) as total FROM message_logs');

    return res.status(200).json({
      success: true,
      total: totalCountRow ? totalCountRow.total : logs.length,
      data: logs
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
