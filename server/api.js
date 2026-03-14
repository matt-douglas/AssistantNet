// AssistantNet — REST API Routes
import { Router } from 'express';
import { db } from './db.js';

export const apiRouter = Router();

// ---- Emails ----
apiRouter.get('/emails', (req, res) => {
  const emails = db.prepare('SELECT * FROM emails WHERE user_id = ? ORDER BY created_at DESC').all(req.session.userId);
  res.json(emails.map(e => ({ ...e, read: !!e.read, starred: !!e.starred })));
});

apiRouter.patch('/emails/:id/read', (req, res) => {
  db.prepare('UPDATE emails SET read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId);
  res.json({ success: true });
});

apiRouter.patch('/emails/:id/star', (req, res) => {
  db.prepare('UPDATE emails SET starred = CASE WHEN starred = 1 THEN 0 ELSE 1 END WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId);
  res.json({ success: true });
});

// ---- Tasks ----
apiRouter.get('/tasks', (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC').all(req.session.userId);
  res.json(tasks.map(t => ({ ...t, tags: JSON.parse(t.tags || '[]'), subtasks: JSON.parse(t.subtasks || '[]') })));
});

apiRouter.post('/tasks', (req, res) => {
  const { title, status, priority, assignee, dueDate, tags, subtasks } = req.body;
  const result = db.prepare('INSERT INTO tasks (user_id, title, status, priority, assignee, due_date, tags, subtasks) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(req.session.userId, title, status || 'todo', priority || 'medium', assignee || '', dueDate || '', JSON.stringify(tags || []), JSON.stringify(subtasks || []));
  const task = db.prepare('SELECT * FROM tasks WHERE rowid = ?').get(result.lastInsertRowid);
  res.json({ ...task, tags: JSON.parse(task.tags), subtasks: JSON.parse(task.subtasks) });
});

apiRouter.put('/tasks/:id', (req, res) => {
  const { title, status, priority, assignee, dueDate, tags, subtasks } = req.body;
  db.prepare('UPDATE tasks SET title=?, status=?, priority=?, assignee=?, due_date=?, tags=?, subtasks=? WHERE id=? AND user_id=?')
    .run(title, status, priority, assignee, dueDate, JSON.stringify(tags || []), JSON.stringify(subtasks || []), req.params.id, req.session.userId);
  res.json({ success: true });
});

apiRouter.delete('/tasks/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId);
  res.json({ success: true });
});

// ---- Meetings ----
apiRouter.get('/meetings', (req, res) => {
  const meetings = db.prepare('SELECT * FROM meetings WHERE user_id = ? ORDER BY date, time').all(req.session.userId);
  res.json(meetings.map(m => ({ ...m, attendees: JSON.parse(m.attendees || '[]') })));
});

apiRouter.post('/meetings', (req, res) => {
  const { title, date, time, endTime, location, category } = req.body;
  const result = db.prepare('INSERT INTO meetings (user_id, title, date, time, end_time, location, category) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(req.session.userId, title, date, time || '', endTime || '', location || '', category || 'team');
  const meeting = db.prepare('SELECT * FROM meetings WHERE rowid = ?').get(result.lastInsertRowid);
  res.json(meeting);
});

apiRouter.delete('/meetings/:id', (req, res) => {
  db.prepare('DELETE FROM meetings WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId);
  res.json({ success: true });
});

// ---- Documents ----
apiRouter.get('/documents', (req, res) => {
  const docs = db.prepare('SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC').all(req.session.userId);
  res.json(docs);
});

apiRouter.post('/documents', (req, res) => {
  const { name, type, category, size, owner } = req.body;
  const result = db.prepare('INSERT INTO documents (user_id, name, type, category, size, owner) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.session.userId, name, type || 'document', category || 'general', size || '', owner || '');
  const doc = db.prepare('SELECT * FROM documents WHERE rowid = ?').get(result.lastInsertRowid);
  res.json(doc);
});

// ---- Activity Log ----
apiRouter.get('/activity', (req, res) => {
  const activities = db.prepare('SELECT * FROM activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.session.userId);
  res.json(activities);
});

apiRouter.post('/activity', (req, res) => {
  const { icon, text, badge } = req.body;
  db.prepare('INSERT INTO activity_log (user_id, icon, text, badge) VALUES (?, ?, ?, ?)').run(req.session.userId, icon || '', text, badge || '');
  res.json({ success: true });
});

// ---- Settings ----
apiRouter.get('/settings', (req, res) => {
  const user = db.prepare('SELECT display_name, company_name, api_key, autonomous_mode FROM users WHERE id = ?').get(req.session.userId);
  res.json({
    userName: user.display_name,
    companyName: user.company_name,
    hasApiKey: !!user.api_key,
    autonomousMode: !!user.autonomous_mode
  });
});

apiRouter.put('/settings', (req, res) => {
  const { userName, companyName, apiKey, autonomousMode } = req.body;
  const updates = [];
  const params = [];

  if (userName !== undefined) { updates.push('display_name = ?'); params.push(userName); }
  if (companyName !== undefined) { updates.push('company_name = ?'); params.push(companyName); }
  if (apiKey !== undefined) { updates.push('api_key = ?'); params.push(apiKey); }
  if (autonomousMode !== undefined) { updates.push('autonomous_mode = ?'); params.push(autonomousMode ? 1 : 0); }

  if (updates.length > 0) {
    params.push(req.session.userId);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }
  res.json({ success: true });
});

// ---- Search (cross-module) ----
apiRouter.get('/search', (req, res) => {
  const q = `%${req.query.q || ''}%`;
  const uid = req.session.userId;
  const emails = db.prepare('SELECT id, sender, subject, time FROM emails WHERE user_id = ? AND (subject LIKE ? OR sender LIKE ? OR body LIKE ?) LIMIT 5').all(uid, q, q, q);
  const tasks = db.prepare('SELECT id, title, priority, status FROM tasks WHERE user_id = ? AND (title LIKE ? OR tags LIKE ?) LIMIT 5').all(uid, q, q);
  const docs = db.prepare('SELECT id, name, category FROM documents WHERE user_id = ? AND (name LIKE ? OR category LIKE ?) LIMIT 5').all(uid, q, q);
  const meetings = db.prepare('SELECT id, title, time, location FROM meetings WHERE user_id = ? AND (title LIKE ? OR location LIKE ?) LIMIT 5').all(uid, q, q);
  res.json({ emails, tasks, documents: docs, meetings });
});
