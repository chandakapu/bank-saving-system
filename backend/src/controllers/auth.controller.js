const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { COOKIE_NAME, tokenHash, cookie } = require('../middleware/auth');

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const SESSION_MS = 12 * 60 * 60 * 1000;
const DUMMY_HASH = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYB6KMi7u4l1LhM2gKfH6q3S4X9D1d7e';

function cookieOptions(withExpiry = true) {
  const options = {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE !== 'false',
    sameSite: 'strict',
    path: '/api/v1',
  };
  if (withExpiry) options.maxAge = SESSION_MS;
  return options;
}

exports.login = async (req, res, next) => {
  try {
    const now = Date.now();
    const { username, password } = req.body;
    const validInput = typeof username === 'string' && username.length <= 100 && typeof password === 'string' && password.length <= 1024;
    const normalizedUsername = validInput ? username.trim() : '';
    const attemptHash = crypto.createHash('sha256').update(req.ip).digest();
    const reset = new Date(now + WINDOW_MS);
    await pool.query(
      `INSERT INTO login_attempts (attempt_hash, failures, reset_at) VALUES (?, 1, ?)
       ON DUPLICATE KEY UPDATE
         failures = IF(reset_at <= UTC_TIMESTAMP(3), 1, failures + 1),
         reset_at = IF(reset_at <= UTC_TIMESTAMP(3), VALUES(reset_at), reset_at)`,
      [attemptHash, reset]
    );
    const [attempts] = await pool.query('SELECT failures, reset_at FROM login_attempts WHERE attempt_hash = ?', [attemptHash]);
    const resetAt = new Date(`${attempts[0].reset_at}Z`).getTime();
    if (attempts[0].failures > MAX_ATTEMPTS) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((resetAt - now) / 1000))));
      return res.status(429).json({ error: 'Too many login attempts' });
    }
    const [rows] = validInput ? await pool.query('SELECT id, username, password_hash FROM admins WHERE username = ?', [normalizedUsername]) : [[]];
    const validPassword = await bcrypt.compare(validInput ? password : '', rows[0]?.password_hash || DUMMY_HASH);
    const valid = Boolean(rows[0] && validPassword);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    await pool.query('DELETE FROM login_attempts WHERE attempt_hash = ? OR reset_at <= UTC_TIMESTAMP(3)', [attemptHash]);
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(now + SESSION_MS);
    await pool.query('DELETE FROM admin_sessions WHERE expires_at <= UTC_TIMESTAMP(3)');
    await pool.query('INSERT INTO admin_sessions (admin_id, token_hash, expires_at) VALUES (?, ?, ?)', [rows[0].id, tokenHash(token), expires]);
    res.cookie(COOKIE_NAME, token, cookieOptions()).json({ admin: { id: rows[0].id, username: rows[0].username }, expires_at: expires.toISOString() });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const token = cookie(req, COOKIE_NAME);
    if (token && /^[a-f0-9]{64}$/.test(token)) await pool.query('DELETE FROM admin_sessions WHERE token_hash = ?', [tokenHash(token)]);
    res.clearCookie(COOKIE_NAME, cookieOptions(false)).status(204).end();
  } catch (error) {
    next(error);
  }
};

exports.session = (req, res) => res.json({ admin: req.admin });

exports.bootstrapAdmin = async () => {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD are required');
  if (password === 'replace-with-a-long-random-password') throw new Error('ADMIN_PASSWORD must not use the example placeholder');
  if (username.length > 100 || password.length < 12) throw new Error('Admin username must be <= 100 characters and password >= 12 characters');
  const hash = await bcrypt.hash(password, 12);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query('INSERT IGNORE INTO admins (username, password_hash) VALUES (?, ?)', [username, hash]);
    if (!result.affectedRows && process.env.ADMIN_ROTATE_PASSWORD === 'true') {
      const [admins] = await connection.query('SELECT id FROM admins WHERE username = ? FOR UPDATE', [username]);
      await connection.query('UPDATE admins SET password_hash = ? WHERE id = ?', [hash, admins[0].id]);
      await connection.query('DELETE FROM admin_sessions WHERE admin_id = ?', [admins[0].id]);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
