/**
 * Anti-Ban Protection Engine for WhatsApp
 * Provides human-like behavior simulation, Spintax variation, random jitter, and quota monitoring.
 */

const db = require('../config/database');
const { processSpintax, renderMessage } = require('../utils/spintax');

class AntiBanEngine {
  /**
   * Helper sleep function
   * @param {number} ms 
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Randomized sleep between min and max seconds
   * @param {number} minSec 
   * @param {number} maxSec 
   */
  static async randomDelay(minSec = 4, maxSec = 12) {
    const minMs = Math.max(1, minSec) * 1000;
    const maxMs = Math.max(minSec, maxSec) * 1000;
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    console.log(`[AntiBan] Sleeping for ${(delay / 1000).toFixed(1)}s (Safe Jitter)...`);
    await this.sleep(delay);
  }

  /**
   * Calculates realistic human typing duration in milliseconds based on message length
   * @param {string} text 
   * @returns {number} ms (between 1200ms and 4500ms)
   */
  static calculateTypingDuration(text = '') {
    const length = (text || '').length;
    // Human average: ~20-40ms per character
    const duration = Math.min(Math.max(length * 35, 1200), 4500);
    // Add small random noise
    const noise = Math.floor(Math.random() * 500);
    return duration + noise;
  }

  /**
   * Checks if sending is permitted based on quiet hours setting
   * @returns {Promise<{ allowed: boolean, reason?: string }>}
   */
  static async checkQuietHours() {
    const isQuietEnabled = await db.getOne("SELECT setting_value FROM system_settings WHERE setting_key = 'anti_ban_quiet_hours'");
    if (isQuietEnabled?.setting_value !== 'true') {
      return { allowed: true };
    }

    const startSetting = await db.getOne("SELECT setting_value FROM system_settings WHERE setting_key = 'anti_ban_quiet_start'");
    const endSetting = await db.getOne("SELECT setting_value FROM system_settings WHERE setting_key = 'anti_ban_quiet_end'");

    const startTime = startSetting?.setting_value || '23:00';
    const endTime = endSetting?.setting_value || '07:00';

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentMins = currentHour * 60 + currentMinute;

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    let inQuietHours = false;
    if (startMins < endMins) {
      inQuietHours = currentMins >= startMins && currentMins < endMins;
    } else {
      // Overnight (e.g. 23:00 to 07:00)
      inQuietHours = currentMins >= startMins || currentMins < endMins;
    }

    if (inQuietHours) {
      return {
        allowed: false,
        reason: `Current time (${currentHour}:${currentMinute < 10 ? '0' : ''}${currentMinute}) is within Quiet Hours (${startTime} - ${endTime}). Broadcasts are paused to prevent bans.`
      };
    }

    return { allowed: true };
  }

  /**
   * Check gateway daily quota and auto-reset if new day
   * @param {number} gatewayId 
   * @returns {Promise<{ allowed: boolean, remaining: number, todayCount: number }>}
   */
  static async checkDailyQuota(gatewayId) {
    const gateway = await db.getOne('SELECT id, daily_limit, today_count, last_reset_date FROM gateways WHERE id = ?', [gatewayId]);
    if (!gateway) return { allowed: true, remaining: 999999, todayCount: 0 };

    const todayStr = new Date().toISOString().split('T')[0];

    // Reset quota if new day
    if (gateway.last_reset_date !== todayStr) {
      await db.query('UPDATE gateways SET today_count = 0, last_reset_date = ? WHERE id = ?', [todayStr, gatewayId]);
      gateway.today_count = 0;
    }

    const limit = gateway.daily_limit || 1000;
    const currentCount = gateway.today_count || 0;
    const remaining = Math.max(0, limit - currentCount);

    if (currentCount >= limit) {
      return {
        allowed: false,
        remaining: 0,
        todayCount: currentCount,
        reason: `Daily quota limit (${limit} messages) reached for this device. Reset occurs at midnight.`
      };
    }

    return { allowed: true, remaining, todayCount: currentCount };
  }

  /**
   * Increments today count for gateway
   * @param {number} gatewayId 
   */
  static async incrementCount(gatewayId) {
    const todayStr = new Date().toISOString().split('T')[0];
    await db.query(
      'UPDATE gateways SET today_count = COALESCE(today_count, 0) + 1, last_reset_date = ? WHERE id = ?',
      [todayStr, gatewayId]
    );
  }

  /**
   * Prepares a message text using dynamic Spintax rendering
   * @param {string} rawTemplate 
   * @param {object} variables 
   * @returns {string} Unique anti-ban message text
   */
  static generateSafeMessage(rawTemplate, variables = {}) {
    return renderMessage(rawTemplate, variables);
  }
}

module.exports = AntiBanEngine;
