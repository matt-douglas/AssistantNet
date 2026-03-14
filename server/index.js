// AssistantNet — Express Backend
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import { initDB } from './db.js';
import { authRouter, requireAuth } from './auth.js';
import { apiRouter } from './api.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'assistantnet-dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Routes
app.use('/auth', authRouter);
app.use('/api', requireAuth, apiRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '3.0.0' });
});

// Initialize
initDB();
app.listen(PORT, () => {
  console.log(`\n  🧠 AssistantNet API running on http://localhost:${PORT}`);
  console.log(`  📊 Health: http://localhost:${PORT}/health\n`);
});
