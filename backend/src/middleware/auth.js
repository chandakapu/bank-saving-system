const crypto = require('crypto');
const { pool } = require('../config/database');

const COOKIE_NAME = 'admin_session';

function cookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest();
}

async function requireAuth(req, res, next) {
  try {
    const token = cookie(req, COOKIE_NAME);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return res.status(401).json({ error: 'Authentication required' });
    const [rows] = await pool.query(
      `SELECT a.id, a.username FROM admin_sessions s JOIN admins a ON a.id = s.admin_id
       WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP(3)`,
      [tokenHash(token)]
    );
    if (!rows[0]) return res.status(401).json({ error: 'Authentication required' });
    req.admin = rows[0];
    req.sessionToken = token;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { COOKIE_NAME, requireAuth, tokenHash, cookie };
