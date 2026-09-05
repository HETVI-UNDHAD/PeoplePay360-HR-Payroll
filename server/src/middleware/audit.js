const { query } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Record an audit log in the PostgreSQL database
 */
async function logAudit(userId, action, entity, entityId, details, req = null) {
  try {
    const logId = uuidv4();
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') : '127.0.0.1';
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : String(details || '');

    await query(
      `INSERT INTO audit_logs (id, user_id, action, entity, entity_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
      [logId, userId || null, action, entity, entityId ? String(entityId) : null, detailsStr, ip]
    );
  } catch (err) {
    console.error('Audit Log recording error:', err.message);
  }
}

module.exports = {
  logAudit
};
