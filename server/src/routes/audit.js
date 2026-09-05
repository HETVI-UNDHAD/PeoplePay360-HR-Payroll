const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { checkRole, ROLES } = require('../middleware/rbac');

router.use(authenticate);

// GET /api/audit - List system audit logs (ADMIN only)
router.get('/', checkRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { action, entity, limit } = req.query;

    let sql = `
      SELECT al.*, u.email as user_email, u.first_name || ' ' || u.last_name as user_name
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      WHERE 1=1
    `;
    const params = [];

    if (action) {
      params.push(action);
      sql += ` AND al.action = $${params.length}`;
    }

    if (entity) {
      params.push(entity);
      sql += ` AND al.entity = $${params.length}`;
    }

    const maxRows = parseInt(limit, 10) || 100;
    sql += ` ORDER BY al.created_at DESC LIMIT ${maxRows}`;

    const logs = await query(sql, params);
    res.json({ success: true, logs: logs.rows });
  } catch (err) {
    console.error('Fetch audit logs error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
});

module.exports = router;
