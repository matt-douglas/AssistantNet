// AssistantNet — Authentication Routes
import { Router } from 'express';
import crypto from 'crypto';
import { db } from './db.js';

export const authRouter = Router();

// Login
authRouter.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const hash = crypto.createHash('sha256').update(password).digest('hex');
  const user = db.prepare('SELECT id, username, display_name, company_name FROM users WHERE username = ? AND password_hash = ?').get(username, hash);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ user: { id: user.id, username: user.username, displayName: user.display_name, companyName: user.company_name } });
});

// Register
authRouter.post('/register', (req, res) => {
  const { username, password, displayName, companyName } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  const hash = crypto.createHash('sha256').update(password).digest('hex');
  const id = crypto.randomBytes(8).toString('hex');

  db.prepare('INSERT INTO users (id, username, password_hash, display_name, company_name) VALUES (?, ?, ?, ?, ?)')
    .run(id, username, hash, displayName || username, companyName || '');

  req.session.userId = id;
  req.session.username = username;
  res.json({ user: { id, username, displayName: displayName || username, companyName: companyName || '' } });
});

// Logout
authRouter.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// Session check
authRouter.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const user = db.prepare('SELECT id, username, display_name, company_name, api_key, autonomous_mode FROM users WHERE id = ?').get(req.session.userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  res.json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      companyName: user.company_name,
      apiKey: user.api_key ? '••••' + user.api_key.slice(-4) : '',
      hasApiKey: !!user.api_key,
      autonomousMode: !!user.autonomous_mode
    }
  });
});

// Auth middleware
export function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}
