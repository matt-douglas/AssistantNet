// AssistantNet — Autonomous Workflow Engine
// Processes queued actions with audit trail and human-in-the-loop for high-stakes

import { dataStore } from './data.js';

class WorkflowEngine {
  constructor() {
    this.queue = [];
    this.history = [];
    this.isRunning = false;
    this.listeners = new Set();
    this.autonomousMode = dataStore.getSettings().autonomousMode;
  }

  on(event, callback) {
    this.listeners.add({ event, callback });
    return () => this.listeners.delete({ event, callback });
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
      await this.executeAction(item);
      item.status = 'completed';
      item.completedAt = new Date().toISOString();
      this.emit('completed', item);

      dataStore.addActivity({
        action: item.description || `Completed: ${item.type}`,
        module: item.module || 'workflow',
        icon: item.icon || '⚡',
        type: 'auto'
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
    // Simulate action execution with realistic delays
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    switch (item.type) {
      case 'triage-email':
        // Auto-categorize and prioritize emails
        break;
      case 'draft-reply':
        // Generate email draft
        break;
      case 'schedule-meeting':
        if (item.payload) {
          dataStore.addMeeting(item.payload);
        }
        break;
      case 'create-task':
        if (item.payload) {
          dataStore.addTask(item.payload);
        }
        break;
      case 'move-task':
        if (item.payload) {
          dataStore.updateTaskStatus(item.payload.taskId, item.payload.status);
        }
        break;
      case 'summarize-document':
        break;
      case 'generate-report':
        break;
      default:
        break;
    }
  }

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
      // Process any pending non-approval items
      this.queue
        .filter(q => q.status === 'pending' && !q.requiresApproval)
        .forEach(q => this.processItem(q));
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
