/**
 * Security Audit Logger Service
 * Records security-sensitive operations, logins, failures, credit adjustments, and config changes.
 */
const { query } = require('../config/database');

async function logAudit({ userId = null, action, ip = null, userAgent = null, details = null }) {
  try {
    const detailsStr = typeof details === 'object' && details !== null ? JSON.stringify(details) : details;
    await query(
      'INSERT INTO audit_logs (user_id, action, ip_address, user_agent, details) VALUES (?, ?, ?, ?, ?)',
      [userId, action, ip, userAgent ? userAgent.substring(0, 255) : null, detailsStr]
    );
  } catch (err) {
    console.error('[AuditLog] Failed to record audit log:', err.message);
  }
}

async function getRecentLogs(limit = 100, actionFilter = null) {
  try {
    let sql = `
      SELECT a.*, u.email as user_email, u.name as user_name, u.role as user_role
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
    `;
    const params = [];
    if (actionFilter) {
      sql += ' WHERE a.action LIKE ?';
      params.push(`%${actionFilter}%`);
    }
    sql += ' ORDER BY a.id DESC LIMIT ?';
    params.push(parseInt(limit) || 100);

    return await query(sql, params);
  } catch (err) {
    console.error('[AuditLog] Failed to fetch audit logs:', err.message);
    return [];
  }
}

module.exports = {
  logAudit,
  getRecentLogs
};
