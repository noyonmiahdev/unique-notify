/**
 * Third-Party SMS Provider Drivers
 * Supports Greenweb BD, BulkSMSBD, Onnorokom, and Generic HTTP GET/POST Webhook Gateways.
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const db = require('../config/database');

class ThirdPartySmsGateway {
  /**
   * Universal HTTP Request Dispatcher
   */
  static request(targetUrl, method = 'GET', data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      try {
        const parsed = new URL(targetUrl);
        const transport = parsed.protocol === 'https:' ? https : http;
        const options = {
          hostname: parsed.hostname,
          port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
          path: parsed.pathname + parsed.search,
          method: method.toUpperCase(),
          headers: {
            'User-Agent': 'Unique-Notify-SmsEngine/2.0',
            ...headers
          },
          timeout: 15000
        };

        if (data && method.toUpperCase() === 'POST' && !options.headers['Content-Type']) {
          options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }

        const req = transport.request(options, (res) => {
          let responseBody = '';
          res.on('data', (chunk) => { responseBody += chunk; });
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode,
              body: responseBody.trim()
            });
          });
        });

        req.on('error', (err) => {
          reject(new Error(`SMS Gateway Network Error: ${err.message}`));
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new Error('SMS Gateway Request Timeout (15s exceeded)'));
        });

        if (data) {
          req.write(typeof data === 'string' ? data : JSON.stringify(data));
        }

        req.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Greenweb Bangladesh SMS Driver
   */
  static async sendViaGreenweb(token, to, message) {
    const cleanPhone = to.replace(/[^\d+]/g, '');
    const cleanToken = encodeURIComponent(token.trim());
    const encodedMsg = encodeURIComponent(message);
    const url = `http://api.greenweb.com.bd/api.php?token=${cleanToken}&to=${cleanPhone}&message=${encodedMsg}`;

    const res = await this.request(url, 'GET');
    if (res.body.includes('Ok') || res.body.includes('OK') || res.body.includes('Success')) {
      return { success: true, provider: 'greenweb', rawResponse: res.body };
    }
    throw new Error(`Greenweb error: ${res.body}`);
  }

  /**
   * BulkSMSBD Driver
   */
  static async sendViaBulkSmsBd(apiKey, senderId, to, message) {
    const cleanPhone = to.replace(/[^\d+]/g, '');
    const cleanKey = encodeURIComponent(apiKey.trim());
    const cleanSender = encodeURIComponent(senderId || '');
    const encodedMsg = encodeURIComponent(message);
    const url = `http://bulksmsbd.net/api/smsapi?api_key=${cleanKey}&type=text&number=${cleanPhone}&senderid=${cleanSender}&message=${encodedMsg}`;

    const res = await this.request(url, 'GET');
    try {
      const parsed = JSON.parse(res.body);
      if (parsed.response_code === 202 || parsed.success === true) {
        return { success: true, provider: 'bulksmsbd', rawResponse: res.body };
      }
    } catch {
      if (res.body.includes('202') || res.body.includes('success')) {
        return { success: true, provider: 'bulksmsbd', rawResponse: res.body };
      }
    }
    throw new Error(`BulkSMSBD error: ${res.body}`);
  }

  /**
   * Generic Custom HTTP Webhook Driver (Supports placeholder replacement)
   */
  static async sendViaCustomHttp(apiUrl, apiKey, senderId, to, message) {
    const cleanPhone = to.replace(/[^\d+]/g, '');
    let finalUrl = apiUrl
      .replace('{to}', encodeURIComponent(cleanPhone))
      .replace('{recipient}', encodeURIComponent(cleanPhone))
      .replace('{phone}', encodeURIComponent(cleanPhone))
      .replace('{message}', encodeURIComponent(message))
      .replace('{text}', encodeURIComponent(message))
      .replace('{msg}', encodeURIComponent(message))
      .replace('{api_key}', encodeURIComponent(apiKey || ''))
      .replace('{token}', encodeURIComponent(apiKey || ''))
      .replace('{sender_id}', encodeURIComponent(senderId || ''));

    const res = await this.request(finalUrl, 'GET');
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return { success: true, provider: 'custom_http', rawResponse: res.body };
    }
    throw new Error(`Custom HTTP Gateway returned HTTP ${res.statusCode}: ${res.body}`);
  }

  /**
   * Dispatch SMS to any configured 3rd party provider
   */
  static async dispatch(providerConfig, to, message) {
    const { provider_name, api_key, api_url, sender_id } = providerConfig;
    switch (provider_name.toLowerCase()) {
      case 'greenweb':
        return await this.sendViaGreenweb(api_key, to, message);
      case 'bulksmsbd':
        return await this.sendViaBulkSmsBd(api_key, sender_id, to, message);
      case 'custom_http':
      default:
        return await this.sendViaCustomHttp(api_url, api_key, sender_id, to, message);
    }
  }
}

module.exports = ThirdPartySmsGateway;
