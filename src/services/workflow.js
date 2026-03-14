// AssistantNet — Autonomous Workflow Engine (v4.0)
// Real LLM-powered actions: triage, briefings, auto-prioritization

import { dataStore } from './data.js';
import { quickAction, isLLMReady } from './llm.js';

class WorkflowEngine {
  constructor() {
    this.queue = [];
    this.history = [];
    this.isRunning = false;
    this.listeners = new Set();
    this.autonomousMode = dataStore.getSettings().autonomousMode;
  }

  on(event, callback) {
    const listener = { event, callback };
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event, data) {
    this.listeners.forEach(l => {
      if (l.event === event) l.callback(data);
    });
  }

  enqueue(action) {
    const item = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      ...action,
      status: 'pending',
      queuedAt: new Date().toISOString(),
      requiresApproval: action.risk === 'high',
    };
    this.queue.push(item);
    this.emit('queued', item);

    if (this.autonomousMode && !item.requiresApproval) {
      this.processItem(item);
    }
    return item;
  }

  async processItem(item) {
    item.status = 'processing';
    this.emit('processing', item);

    try {
      const result = await this.executeAction(item);
      item.status = 'completed';
      item.completedAt = new Date().toISOString();
      item.result = result;
      this.emit('completed', item);

      dataStore.addActivity({
        text: item.description || `Completed: ${item.type}`,
        icon: item.icon || '⚡',
        badge: 'auto'
      });
    } catch (err) {
      item.status = 'failed';
      item.error = err.message;
      this.emit('failed', item);
    }

    this.history.unshift(item);
    this.queue = this.queue.filter(q => q.id !== item.id);
  }

  async executeAction(item) {
    switch (item.type) {
      case 'triage-email':
        return await this.triageEmail(item.payload);
      case 'draft-reply':
        return await this.draftReply(item.payload);
      case 'daily-briefing':
        return await this.generateDailyBriefing();
      case 'auto-prioritize':
        return await this.autoPrioritizeTasks();
      case 'schedule-meeting':
        if (item.payload) dataStore.addMeeting(item.payload);
        return { action: 'meeting_created' };
      case 'create-task':
        if (item.payload) dataStore.addTask(item.payload);
        return { action: 'task_created' };
      case 'move-task':
        if (item.payload) dataStore.updateTaskStatus(item.payload.taskId, item.payload.status);
        return { action: 'task_moved' };
      case 'summarize-document':
        return await this.summarizeDocument(item.payload);
      default:
        return { action: 'completed' };
    }
  }

  // ---- LLM-Powered Actions ----

  async triageEmail(email) {
    if (!isLLMReady() || !email) return { priority: 'normal', category: 'general' };

    const result = await quickAction('analyze', 
      `Triage this email. Respond with JSON only: {"priority":"urgent|high|normal|low","category":"action_required|fyi|scheduling|spam","suggestedAction":"brief suggestion"}\n\nFrom: ${email.from}\nSubject: ${email.subject}\n\n${email.body}`
    );

    try {
      const json = JSON.parse(result.match(/\{[\s\S]*\}/)?.[0] || '{}');
      return json;
    } catch {
      return { priority: 'normal', category: 'general' };
    }
  }

  async draftReply(email) {
    if (!isLLMReady() || !email) return { draft: '' };
    const settings = dataStore.getSettings();

    const draft = await quickAction('draft',
      `Draft a professional reply to this email on behalf of ${settings.userName} at ${settings.companyName}.\n\nFrom: ${email.from}\nSubject: ${email.subject}\n\n${email.body}`
    );

    return { draft };
  }

  async generateDailyBriefing() {
    const emails = dataStore.getEmails();
    const tasks = dataStore.getTasks();
    const meetings = dataStore.getMeetings();
    const settings = dataStore.getSettings();

    const unread = emails.filter(e => !e.read).length;
    const urgent = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done');
    const inProgress = tasks.filter(t => t.status === 'in-progress');
    const todayMeetings = meetings.slice(0, 5); // simplified

    if (!isLLMReady()) {
      // Generate a structured briefing without LLM
      return {
        briefing: `Good morning, ${settings.userName}!\n\n` +
          `📧 You have ${unread} unread emails.\n` +
          `🔴 ${urgent.length} urgent tasks need attention: ${urgent.map(t => t.title).join(', ') || 'None'}.\n` +
          `⚡ ${inProgress.length} tasks in progress.\n` +
          `📅 ${todayMeetings.length} meetings today: ${todayMeetings.map(m => `${m.title} at ${m.time}`).join(', ') || 'None'}.\n\n` +
          `Recommended focus: ${urgent.length > 0 ? urgent[0].title : inProgress.length > 0 ? inProgress[0].title : 'Process inbox'}.`
      };
    }

    const context = `Generate a concise morning briefing for ${settings.userName}, a leader at ${settings.companyName}. Here's today's data:\n\n` +
      `UNREAD EMAILS: ${unread}\n` +
      `URGENT TASKS: ${urgent.map(t => `- ${t.title} (due: ${t.dueDate})`).join('\n') || 'None'}\n` +
      `IN PROGRESS: ${inProgress.map(t => `- ${t.title}`).join('\n') || 'None'}\n` +
      `MEETINGS TODAY: ${todayMeetings.map(m => `- ${m.title} at ${m.time} (${m.location})`).join('\n') || 'None'}\n\n` +
      `Format as a friendly, executive-style morning briefing with recommended priorities.`;

    const briefing = await quickAction('briefing', context);
    return { briefing };
  }

  async autoPrioritizeTasks() {
    const tasks = dataStore.getTasks().filter(t => t.status !== 'done');
    if (tasks.length === 0) return { changes: [] };

    if (!isLLMReady()) {
      // Heuristic prioritization without LLM
      const changes = [];
      for (const task of tasks) {
        const due = task.dueDate?.toLowerCase() || '';
        if (due.includes('today') || due.includes('tomorrow')) {
          if (task.priority !== 'urgent' && task.priority !== 'high') {
            task.priority = 'high';
            changes.push({ taskId: task.id, title: task.title, newPriority: 'high', reason: 'Due soon' });
          }
        }
      }
      if (changes.length > 0) dataStore.save();
      return { changes };
    }

    const context = `You are a task prioritization AI. Analyze these tasks and suggest priority changes. Respond with JSON array only: [{"taskId":"...","newPriority":"urgent|high|medium|low","reason":"brief reason"}]\n\nTasks:\n` +
      tasks.map(t => `- ID: ${t.id} | "${t.title}" | current: ${t.priority} | status: ${t.status} | due: ${t.dueDate || 'none'} | tags: ${(t.tags || []).join(',')}`).join('\n');

    const result = await quickAction('prioritize', context);
    try {
      const changes = JSON.parse(result.match(/\[[\s\S]*\]/)?.[0] || '[]');
      for (const change of changes) {
        const task = tasks.find(t => t.id === change.taskId);
        if (task && ['urgent', 'high', 'medium', 'low'].includes(change.newPriority)) {
          task.priority = change.newPriority;
        }
      }
      dataStore.save();
      return { changes };
    } catch {
      return { changes: [] };
    }
  }

  async summarizeDocument(doc) {
    if (!isLLMReady() || !doc) return { summary: 'Document summarization requires an active LLM connection.' };

    const summary = await quickAction('summarize',
      `Summarize this document:\nName: ${doc.name}\nType: ${doc.type}\nCategory: ${doc.category}`
    );
    return { summary };
  }

  // ---- Queue Management ----

  approve(itemId) {
    const item = this.queue.find(q => q.id === itemId);
    if (item) {
      item.requiresApproval = false;
      this.processItem(item);
    }
  }

  reject(itemId) {
    this.queue = this.queue.filter(q => q.id !== itemId);
    this.emit('rejected', { id: itemId });
  }

  setAutonomousMode(enabled) {
    this.autonomousMode = enabled;
    dataStore.updateSettings({ autonomousMode: enabled });
    this.emit('mode-change', { autonomous: enabled });

    if (enabled) {
      this.queue
        .filter(q => q.status === 'pending' && !q.requiresApproval)
        .forEach(q => this.processItem(q));

      // Auto-enqueue daily briefing when mode is turned on
      this.enqueue({
        type: 'daily-briefing',
        description: 'Generate morning briefing',
        icon: '📋',
        risk: 'low'
      });
    }
  }

  getQueueStatus() {
    return {
      pending: this.queue.filter(q => q.status === 'pending').length,
      processing: this.queue.filter(q => q.status === 'processing').length,
      awaitingApproval: this.queue.filter(q => q.requiresApproval).length,
      completedToday: this.history.filter(h => {
        const today = new Date().toDateString();
        return h.completedAt && new Date(h.completedAt).toDateString() === today;
      }).length,
    };
  }

  getHistory() {
    return this.history;
  }
}

export const workflowEngine = new WorkflowEngine();
export default workflowEngine;
