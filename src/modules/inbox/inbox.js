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
      <div class="email-body-text" style="white-space: pre-wrap">${email.body}</div>
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
        draftBtn.disabled = false;
        draftBtn.textContent = '✍️ Draft Reply';
        // Show draft in modal
        const overlay = document.getElementById('modal-overlay');
        overlay.classList.remove('hidden');
        overlay.innerHTML = `
          <div class="modal" style="animation: scaleIn 0.2s var(--ease-spring); max-width: 560px; max-height: 80vh; overflow-y: auto">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4)">
              <h2>✍️ Draft Reply</h2>
              <button class="btn btn-ghost btn-sm" id="close-draft">✕</button>
            </div>
            <div style="font-size: var(--text-sm); color: var(--text-secondary); margin-bottom: var(--space-3)">Re: ${email.subject}</div>
            <div style="white-space: pre-wrap; font-size: var(--text-sm); padding: var(--space-4); background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-subtle)">${draft}</div>
            <div style="display: flex; gap: var(--space-3); justify-content: flex-end; margin-top: var(--space-4)">
              <button class="btn btn-ghost" id="close-draft-btn">Close</button>
            </div>
          </div>
        `;
        const close = () => { overlay.classList.add('hidden'); overlay.innerHTML = ''; };
        document.getElementById('close-draft')?.addEventListener('click', close);
        document.getElementById('close-draft-btn')?.addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
      }
    });
  }

  const summarizeBtn = document.getElementById('ai-summarize-email');
  if (summarizeBtn) {
    summarizeBtn.addEventListener('click', async () => {
      const email = dataStore.getEmail(summarizeBtn.dataset.emailId);
      if (email) {
        showToast('Summarizing email...', 'info');
        summarizeBtn.disabled = true;
        summarizeBtn.textContent = '⏳ Summarizing...';
        const summary = await quickAction('summarize', `From: ${email.from}\nSubject: ${email.subject}\n\n${email.body}`);
        summarizeBtn.disabled = false;
        summarizeBtn.textContent = '📋 Summarize';
        // Show summary inline below email body
        const previewBody = document.querySelector('.email-preview-body');
        if (previewBody) {
          const existing = previewBody.querySelector('.ai-summary-block');
          if (existing) existing.remove();
          previewBody.insertAdjacentHTML('beforeend', `
            <div class="ai-summary-block" style="margin-top: var(--space-4); padding: var(--space-4); background: rgba(99, 102, 241, 0.08); border-radius: var(--radius-md); border-left: 3px solid var(--accent-primary)">
              <div style="font-size: var(--text-xs); font-weight: var(--weight-semibold); color: var(--accent-primary); margin-bottom: var(--space-2)">🧠 AI Summary</div>
              <div style="font-size: var(--text-sm); white-space: pre-wrap; color: var(--text-secondary)">${summary}</div>
            </div>
          `);
        }
      }
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

  // Schedule Meeting from email
  const meetingBtn = document.getElementById('ai-schedule-meeting');
  if (meetingBtn) {
    meetingBtn.addEventListener('click', () => {
      const email = dataStore.getEmail(meetingBtn.dataset.emailId);
      if (email) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dataStore.addMeeting({
          title: `Meeting: ${email.subject}`,
          date: tomorrow.toISOString().split('T')[0],
          startTime: '14:00',
          endTime: '15:00',
          location: 'Zoom',
          category: email.category || 'external',
          attendees: [email.from]
        });
        showToast(`Meeting scheduled with ${email.from} for tomorrow`, 'success');
      }
    });
  }
}

export function destroyInbox() {
  selectedEmailId = null;
}
