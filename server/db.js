// AssistantNet — SQLite Database Layer
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'assistantnet.db');

export let db;

export function initDB() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT DEFAULT '',
      company_name TEXT DEFAULT '',
      api_key TEXT DEFAULT '',
      autonomous_mode INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS emails (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      user_id TEXT NOT NULL REFERENCES users(id),
      sender TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT DEFAULT '',
      preview TEXT DEFAULT '',
      time TEXT DEFAULT '',
      read INTEGER DEFAULT 0,
      starred INTEGER DEFAULT 0,
      priority TEXT DEFAULT 'normal',
      avatar_color TEXT DEFAULT '#6366f1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      status TEXT DEFAULT 'todo',
      priority TEXT DEFAULT 'medium',
      assignee TEXT DEFAULT '',
      due_date TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      subtasks TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT DEFAULT '',
      end_time TEXT DEFAULT '',
      location TEXT DEFAULT '',
      category TEXT DEFAULT 'team',
      attendees TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      type TEXT DEFAULT 'document',
      category TEXT DEFAULT 'general',
      size TEXT DEFAULT '',
      owner TEXT DEFAULT '',
      modified TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      user_id TEXT NOT NULL REFERENCES users(id),
      icon TEXT DEFAULT '',
      text TEXT NOT NULL,
      badge TEXT DEFAULT '',
      time TEXT DEFAULT 'Just now',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed demo user if none exists
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount === 0) {
    seedDemoData();
  }

  console.log('  💾 SQLite database initialized');
}

function seedDemoData() {
  const userId = crypto.randomBytes(8).toString('hex');
  const passwordHash = crypto.createHash('sha256').update('demo').digest('hex');

  db.prepare(`INSERT INTO users (id, username, password_hash, display_name, company_name) VALUES (?, ?, ?, ?, ?)`)
    .run(userId, 'demo', passwordHash, 'MD', 'AssistantNet Inc.');

  // Seed emails
  const emails = [
    { sender: 'Sarah Chen', subject: 'Q1 Revenue Report — Action Required', body: 'Hi,\n\nPlease review the Q1 revenue report attached. We saw a 12% increase in recurring revenue, but enterprise deals slipped by 3%.\n\nKey highlights:\n- MRR grew to $2.4M\n- 3 enterprise deals in final negotiation\n- Customer churn reduced to 2.1%\n\nNeed your sign-off by Thursday.\n\nBest,\nSarah', preview: 'Please review the Q1 revenue report...', time: '9:42 AM', priority: 'high', avatar_color: '#ec4899' },
    { sender: 'Marcus Johnson', subject: 'Engineering Sprint Planning — Tomorrow', body: 'Team,\n\nSprint planning is at 10 AM tomorrow. Please prepare your estimates.\n\nPriorities:\n1. Auth service migration\n2. API rate limiting\n3. Dashboard performance\n\nMarcus', preview: 'Sprint planning is at 10 AM tomorrow...', time: '10:15 AM', priority: 'normal', avatar_color: '#06b6d4' },
    { sender: 'Lisa Park', subject: 'New Partnership Opportunity — Urgent', body: 'Hi,\n\nAccenture wants to discuss a strategic partnership. They have 50+ enterprise clients who need our solution.\n\nCan we schedule a call this week?\n\nLisa', preview: 'Accenture wants to discuss a strategic...', time: '11:30 AM', priority: 'urgent', avatar_color: '#f59e0b' },
  ];

  const emailStmt = db.prepare(`INSERT INTO emails (user_id, sender, subject, body, preview, time, priority, avatar_color) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const e of emails) {
    emailStmt.run(userId, e.sender, e.subject, e.body, e.preview, e.time, e.priority, e.avatar_color);
  }

  // Seed tasks
  const tasks = [
    { title: 'Review Q1 financial report', status: 'in-progress', priority: 'high', assignee: 'You', due_date: 'Mar 15', tags: '["finance","review"]', subtasks: '[{"title":"Review revenue data","done":true},{"title":"Check expense report","done":false},{"title":"Sign off","done":false}]' },
    { title: 'Prepare board presentation', status: 'todo', priority: 'urgent', assignee: 'You', due_date: 'Mar 18', tags: '["executive"]', subtasks: '[{"title":"Draft slides","done":false},{"title":"Review metrics","done":false}]' },
    { title: 'Update API documentation', status: 'backlog', priority: 'medium', assignee: 'Dev Team', due_date: 'Mar 22', tags: '["engineering","docs"]', subtasks: '[]' },
    { title: 'Customer feedback analysis', status: 'done', priority: 'medium', assignee: 'Lisa P.', due_date: 'Mar 10', tags: '["product"]', subtasks: '[]' },
  ];

  const taskStmt = db.prepare(`INSERT INTO tasks (user_id, title, status, priority, assignee, due_date, tags, subtasks) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const t of tasks) {
    taskStmt.run(userId, t.title, t.status, t.priority, t.assignee, t.due_date, t.tags, t.subtasks);
  }

  // Seed meetings (dynamic dates relative to today)
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const meetings = [
    { title: 'Team Standup', date: todayStr, time: '9:00 AM', end_time: '9:30 AM', location: 'Zoom', category: 'team' },
    { title: 'Board Review', date: todayStr, time: '2:00 PM', end_time: '3:30 PM', location: 'Conference Room A', category: 'executive' },
    { title: 'Sprint Planning', date: tomorrowStr, time: '10:00 AM', end_time: '11:00 AM', location: 'Zoom', category: 'engineering' },
  ];

  const meetingStmt = db.prepare(`INSERT INTO meetings (user_id, title, date, time, end_time, location, category) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  for (const m of meetings) {
    meetingStmt.run(userId, m.title, m.date, m.time, m.end_time, m.location, m.category);
  }

  // Seed documents
  const docs = [
    { name: 'Q1 Revenue Report.xlsx', type: 'spreadsheet', category: 'finance', size: '2.4 MB', owner: 'Sarah C.' },
    { name: 'Product Roadmap 2026.pdf', type: 'pdf', category: 'product', size: '1.2 MB', owner: 'You' },
    { name: 'Brand Guidelines.pdf', type: 'pdf', category: 'marketing', size: '8.7 MB', owner: 'Design Team' },
  ];

  const docStmt = db.prepare(`INSERT INTO documents (user_id, name, type, category, size, owner) VALUES (?, ?, ?, ?, ?, ?)`);
  for (const d of docs) {
    docStmt.run(userId, d.name, d.type, d.category, d.size, d.owner);
  }

  console.log('  🌱 Demo data seeded (user: demo / pass: demo)');
}
