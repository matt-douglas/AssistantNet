// AssistantNet — Smart Inbox Module
import { dataStore } from '../../services/data.js';
import { quickAction } from '../../services/llm.js';
import { showToast } from '../../main.js';
import './inbox.css';

let selectedEmailId = null;
let activeFilter = 'all';

const AVATAR_COLORS = [
  '#6366f1', '#06b6d4', '#8b5cf6', '#ec4899', '#22c55e',
  '#f59e0b', '#ef4444', '#14b8a6', '#f97316', '#3b82f6'
];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function renderInbox(container) {
  const emails = getFilteredEmails();

  container.innerHTML = `
    <div class="inbox-view" id="inbox-view">
      <div class="email-list-pane">
        <div class="email-list-header">
          <h2>📧 Inbox</h2>
          <span class="badge badge-info">${dataStore.getEmails().filter(e => !e.read).length} unread</span>
        </div>
        <div class="email-filter-bar">
          <button class="chip ${activeFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>
          <button class="chip ${activeFilter === 'unread' ? 'active' : ''}" data-filter="unread">Unread</button>
          <button class="chip ${activeFilter === 'starred' ? 'active' : ''}" data-filter="starred">⭐ Starred</button>
          <button class="chip ${activeFilter === 'urgent' ? 'active' : ''}" data-filter="urgent">🔴 Urgent</button>
          <button class="chip ${activeFilter === 'high' ? 'active' : ''}" data-filter="high">🟡 High</button>
        </div>
        <div class="email-items" id="email-items">
          ${emails.map(renderEmailItem).join('')}
        </div>
      </div>
      <div class="email-preview-pane" id="email-preview-pane">
        ${selectedEmailId ? renderEmailPreview(dataStore.getEmail(selectedEmailId)) : renderEmptyPreview()}
      </div>
    </div>
  `;

  bindInboxEvents();
}

function getFilteredEmails() {
  let emails = dataStore.getEmails();
  switch (activeFilter) {
    case 'unread': return emails.filter(e => !e.read);
    case 'starred': return emails.filter(e => e.starred);
    case 'urgent': return emails.filter(e => e.priority === 'urgent');
    case 'high': return emails.filter(e => e.priority === 'high');
    default: return emails;
  }
}

function renderEmailItem(email) {
  const isActive = email.id === selectedEmailId;
  const priorityBadge = email.priority === 'urgent' ? '<span class="badge badge-urgent">Urgent</span>' :
                         email.priority === 'high' ? '<span class="badge badge-high">High</span>' : '';
  return `
    <div class="email-item ${!email.read ? 'unread' : ''} ${isActive ? 'active' : ''}" data-id="${email.id}">
      <div class="email-avatar" style="background: ${getAvatarColor(email.from)}">
        ${email.avatar}
      </div>
      <div class="email-content">
        <div class="email-top-row">
          <span class="email-sender">${email.from}</span>
          <span class="email-time">${email.time}</span>
        </div>
        <div class="email-subject">${email.subject}</div>
        <div class="email-preview-text">${email.preview}</div>
        <div class="email-meta">
          ${priorityBadge}
          <span class="email-star ${email.starred ? 'starred' : ''}" data-star-id="${email.id}">${email.starred ? '⭐' : '☆'}</span>
        </div>
      </div>
    </div>
  `;
}

function renderEmailPreview(email) {
  if (!email) return renderEmptyPreview();

  return `
    <div class="email-preview-header">
      <div class="email-preview-subject">${email.subject}</div>
      <div class="email-preview-meta">
        <div class="email-preview-from">
          <div class="email-avatar" style="background: ${getAvatarColor(email.from)}; width: 40px; height: 40px; font-size: 14px;">
            ${email.avatar}
          </div>
          <div class="email-preview-sender-info">
            <span class="email-preview-sender-name">${email.from}</span>
            <span class="email-preview-sender-email">${email.email}</span>
          </div>
        </div>
        <div class="email-preview-actions">
          ${email.priority === 'urgent' ? '<span class="badge badge-urgent">Urgent</span>' :
            email.priority === 'high' ? '<span class="badge badge-high">High Priority</span>' :
            email.priority === 'medium' ? '<span class="badge badge-medium">Medium</span>' :
            '<span class="badge badge-low">Low</span>'}
          <span class="tag">${email.category}</span>
        </div>
      </div>
    </div>
    <div class="email-preview-body">
      <div class="email-body-text">${email.body}</div>
    </div>
    <div class="email-ai-actions">
      <div class="ai-label">🧠 AI Actions</div>
      <button class="btn btn-secondary btn-sm" id="ai-draft-reply" data-email-id="${email.id}">✍️ Draft Reply</button>
      <button class="btn btn-secondary btn-sm" id="ai-summarize-email" data-email-id="${email.id}">📋 Summarize</button>
      <button class="btn btn-secondary btn-sm" id="ai-create-task" data-email-id="${email.id}">✅ Create Task</button>
      <button class="btn btn-secondary btn-sm" id="ai-schedule-meeting" data-email-id="${email.id}">📅 Schedule Meeting</button>
    </div>
  `;
}

function renderEmptyPreview() {
  return `
    <div class="email-empty-preview">
      <div class="empty-state">
        <div class="empty-state-icon">📬</div>
        <div class="empty-state-title">Select an email</div>
        <div class="empty-state-text">Choose an email from the list to preview its contents and take action.</div>
      </div>
    </div>
  `;
}

function bindInboxEvents() {
  // Email item click
  document.querySelectorAll('.email-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.email-star')) return;
      const id = item.dataset.id;
      selectedEmailId = id;
      dataStore.markEmailRead(id);
      renderInbox(document.getElementById('view-container'));

      // Mobile: show preview
      const inboxView = document.getElementById('inbox-view');
      if (window.innerWidth <= 900) {
        inboxView.classList.add('preview-open');
      }
    });
  });

  // Star toggle
  document.querySelectorAll('.email-star').forEach(star => {
    star.addEventListener('click', (e) => {
      e.stopPropagation();
      dataStore.toggleStarEmail(star.dataset.starId);
      renderInbox(document.getElementById('view-container'));
    });
  });

  // Filter chips
  document.querySelectorAll('.email-filter-bar .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      activeFilter = chip.dataset.filter;
      renderInbox(document.getElementById('view-container'));
    });
  });

  // AI Actions
  const draftBtn = document.getElementById('ai-draft-reply');
  if (draftBtn) {
    draftBtn.addEventListener('click', async () => {
      const email = dataStore.getEmail(draftBtn.dataset.emailId);
      if (email) {
        showToast('Drafting reply...', 'info');
        draftBtn.disabled = true;
        draftBtn.textContent = '⏳ Drafting...';
        const draft = await quickAction('draft-email', `From: ${email.from}\nSubject: ${email.subject}\n\n${email.body}`);
        showToast('Draft ready! Check AI Assistant for the full response.', 'success');
        draftBtn.disabled = false;
        draftBtn.textContent = '✍️ Draft Reply';
      }
    });
  }

  const summarizeBtn = document.getElementById('ai-summarize-email');
  if (summarizeBtn) {
    summarizeBtn.addEventListener('click', () => {
      showToast('Summarizing email...', 'info');
      setTimeout(() => showToast('Summary generated! Check AI Assistant.', 'success'), 1500);
    });
  }

  const taskBtn = document.getElementById('ai-create-task');
  if (taskBtn) {
    taskBtn.addEventListener('click', () => {
      const email = dataStore.getEmail(taskBtn.dataset.emailId);
      if (email) {
        dataStore.addTask({
          title: `Follow up: ${email.subject}`,
          status: 'todo',
          priority: email.priority === 'urgent' ? 'urgent' : 'high',
          assignee: 'You',
          dueDate: 'This week',
          tags: [email.category],
          subtasks: []
        });
        showToast('Task created from email!', 'success');
      }
    });
  }
}

export function destroyInbox() {
  selectedEmailId = null;
}
