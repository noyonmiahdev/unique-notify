/**
 * Phone Number Formatting & Sanitization Utility
 */

/**
 * Normalizes a phone number to standard international format (without + or symbols)
 * Automatically handles common formats like 017xxxxxxxx -> 88017xxxxxxxx
 * @param {string|number} rawPhone 
 * @param {string} defaultCountryCode '880' (Bangladesh default, customizable)
 * @returns {string} Clean numeric string (e.g. 8801712345678)
 */
function sanitizePhoneNumber(rawPhone, defaultCountryCode = '880') {
  if (!rawPhone) return '';
  
  // Convert to string and remove all non-numeric characters except leading '+'
  let phone = String(rawPhone).trim().replace(/[^\d+]/g, '');

  // Strip leading '+'
  if (phone.startsWith('+')) {
    phone = phone.substring(1);
  }

  // Handle local Bangladesh numbers starting with 01
  if (phone.startsWith('01') && phone.length === 11) {
    phone = defaultCountryCode + phone.substring(1);
  }

  // Handle local numbers starting with 0 without country code (general fallback)
  if (phone.startsWith('0') && phone.length === 10) {
    phone = defaultCountryCode + phone.substring(1);
  }

  return phone;
}

/**
 * Formats a phone number into WhatsApp JID (e.g. 8801712345678@s.whatsapp.net)
 * @param {string|number} rawPhone 
 * @returns {string} JID format
 */
function toWhatsAppJid(rawPhone) {
  const sanitized = sanitizePhoneNumber(rawPhone);
  if (!sanitized) return '';
  if (sanitized.includes('@s.whatsapp.net')) return sanitized;
  return `${sanitized}@s.whatsapp.net`;
}

/**
 * Validates if the phone number is a valid international number length
 * @param {string|number} rawPhone 
 * @returns {boolean}
 */
function isValidPhoneNumber(rawPhone) {
  const sanitized = sanitizePhoneNumber(rawPhone);
  // International E.164 numbers are between 8 and 15 digits
  return sanitized.length >= 8 && sanitized.length <= 16;
}

module.exports = {
  sanitizePhoneNumber,
  toWhatsAppJid,
  isValidPhoneNumber
};
