// AssistantNet — Command Palette (⌘K)
import { dataStore } from '../../services/data.js';
import { escapeHtml } from '../../services/utils.js';
import './command-palette.css';

let isOpen = false;
let activeIndex = 0;
let currentResults = [];

// Navigation commands (always visible when no query)
const NAV_COMMANDS = [
  { icon: '📊', title: 'Dashboard', subtitle: 'Go to dashboard', action: () => navigate('/dashboard'), section: 'navigation' },
  { icon: '🧠', title: 'AI Assistant', subtitle: 'Open chat assistant', action: () => navigate('/assistant'), section: 'navigation' },
  { icon: '📧', title: 'Smart Inbox', subtitle: 'View emails', action: () => navigate('/inbox'), section: 'navigation' },
  { icon: '📅', title: 'Calendar', subtitle: 'View schedule', action: () => navigate('/calendar'), section: 'navigation' },
  { icon: '✅', title: 'Task Engine', subtitle: 'Kanban board', action: () => navigate('/tasks'), section: 'navigation' },
  { icon: '📄', title: 'Documents', subtitle: 'Document hub', action: () => navigate('/documents'), section: 'navigation' },
  { icon: '📈', title: 'Analytics', subtitle: 'Insights & metrics', action: () => navigate('/analytics'), section: 'navigation' },
  { icon: '👥', title: 'Team & Contacts', subtitle: 'People directory', action: () => navigate('/contacts'), section: 'navigation' },
  { icon: '⚙️', title: 'Settings', subtitle: 'Preferences & API keys', action: () => navigate('/settings'), section: 'navigation' },
];

const ACTION_COMMANDS = [
  { icon: '📝', title: 'Create New Task', subtitle: 'Add a task to the board', action: () => { navigate('/tasks'); }, section: 'actions' },
  { icon: '📅', title: 'Schedule Meeting', subtitle: 'Add to calendar', action: () => { navigate('/calendar'); }, section: 'actions' },
  { icon: '📄', title: 'Upload Document', subtitle: 'Go to document hub', action: () => { navigate('/documents'); }, section: 'actions' },
  { icon: '🧠', title: 'Ask AI Assistant', subtitle: 'Start a conversation', action: () => { navigate('/assistant'); }, section: 'actions' },
];

function navigate(hash) {
  window.location.hash = hash;
}

function fuzzyMatch(query, text) {
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();
  if (lowerText.includes(lowerQuery)) return true;
  // Simple fuzzy: check if all chars appear in order
  let qi = 0;
  for (let i = 0; i < lowerText.length && qi < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[qi]) qi++;
  }
  return qi === lowerQuery.length;
}

function search(query) {
  if (!query) {
    return [
      ...NAV_COMMANDS.map(c => ({ ...c, badge: '' })),
      ...ACTION_COMMANDS.map(c => ({ ...c, badge: '' })),
    ];
  }

  const results = [];

  // Search commands
  [...NAV_COMMANDS, ...ACTION_COMMANDS].forEach(cmd => {
    if (fuzzyMatch(query, cmd.title) || fuzzyMatch(query, cmd.subtitle)) {
      results.push({ ...cmd, badge: '' });
    }
  });

  // Search emails
  const emails = dataStore.getEmails();
  emails.forEach(e => {
    if (fuzzyMatch(query, e.subject) || fuzzyMatch(query, e.from) || fuzzyMatch(query, e.body)) {
      results.push({
        icon: '📧', title: e.subject, subtitle: `from ${e.from}`,
        action: () => navigate('/inbox'), section: 'emails', badge: e.priority || ''
      });
    }
  });

  // Search tasks
  const tasks = dataStore.getTasks();
  tasks.forEach(t => {
    if (fuzzyMatch(query, t.title) || (t.tags || []).some(tag => fuzzyMatch(query, tag))) {
      results.push({
        icon: '✅', title: t.title, subtitle: `${t.status} · ${t.priority}`,
        action: () => navigate('/tasks'), section: 'tasks', badge: t.priority
      });
    }
  });

  // Search documents
  const docs = dataStore.getDocuments();
  docs.forEach(d => {
    if (fuzzyMatch(query, d.name) || fuzzyMatch(query, d.category)) {
      results.push({
        icon: '📄', title: d.name, subtitle: `${d.category} · ${d.size}`,
        action: () => navigate('/documents'), section: 'documents', badge: ''
      });
    }
  });

  // Search meetings
  const meetings = dataStore.getMeetings();
  meetings.forEach(m => {
    if (fuzzyMatch(query, m.title) || fuzzyMatch(query, m.location || '')) {
      results.push({
        icon: '📅', title: m.title, subtitle: `${m.startTime || m.time} · ${m.location || 'No location'}`,
        action: () => navigate('/calendar'), section: 'meetings', badge: ''
      });
    }
  });

  return results.slice(0, 20);
}

function renderPalette(query = '') {
  currentResults = search(query);
  activeIndex = 0;

  // Group by section
  const groups = {};
  currentResults.forEach(r => {
    if (!groups[r.section]) groups[r.section] = [];
    groups[r.section].push(r);
  });

  const sectionNames = {
    navigation: '🧭 Navigation',
    actions: '⚡ Quick Actions',
    emails: '📧 Emails',
    tasks: '✅ Tasks',
    documents: '📄 Documents',
    meetings: '📅 Meetings',
  };

  let globalIdx = 0;

  const resultsHtml = Object.entries(groups).map(([section, items]) => `
    <div class="cp-section">
      <div class="cp-section-title">${sectionNames[section] || section}</div>
      ${items.map(item => {
        const idx = globalIdx++;
        return `
          <div class="cp-item ${idx === 0 ? 'active' : ''}" data-idx="${idx}">
            <div class="cp-item-icon">${item.icon}</div>
            <div class="cp-item-text">
              <div class="cp-item-title">${escapeHtml(item.title)}</div>
              <div class="cp-item-subtitle">${escapeHtml(item.subtitle)}</div>
            </div>
            ${item.badge ? `<span class="cp-item-badge">${escapeHtml(item.badge)}</span>` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `).join('');

  return resultsHtml || `
    <div class="cp-empty">
      <div class="cp-empty-icon">🔍</div>
      <div>No results for "${escapeHtml(query)}"</div>
    </div>
  `;
}

export function openCommandPalette() {
  if (isOpen) return;
  isOpen = true;

  const overlay = document.createElement('div');
  overlay.className = 'command-palette-overlay';
  overlay.id = 'command-palette-overlay';

  overlay.innerHTML = `
    <div class="command-palette">
      <div class="cp-input-wrap">
        <svg viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="2"/><path d="M14 14l4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <input type="text" class="cp-input" id="cp-input" placeholder="Search or type a command..." autofocus />
        <span class="cp-kbd">ESC</span>
      </div>
      <div class="cp-results" id="cp-results">
        ${renderPalette('')}
      </div>
      <div class="cp-footer">
        <span><span class="cp-kbd">↑↓</span> Navigate</span>
        <span><span class="cp-kbd">↵</span> Select</span>
        <span><span class="cp-kbd">ESC</span> Close</span>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const input = document.getElementById('cp-input');
  const results = document.getElementById('cp-results');

  // Focus input
  setTimeout(() => input?.focus(), 50);

  // Search handler
  input.addEventListener('input', (e) => {
    results.innerHTML = renderPalette(e.target.value);
    bindResultClicks(results);
  });

  // Keyboard navigation
  input.addEventListener('keydown', (e) => {
    const items = results.querySelectorAll('.cp-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, items.length - 1);
      updateActive(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      updateActive(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentResults[activeIndex]) {
        currentResults[activeIndex].action();
        closeCommandPalette();
      }
    } else if (e.key === 'Escape') {
      closeCommandPalette();
    }
  });

  // Click outside to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeCommandPalette();
  });

  bindResultClicks(results);
}

function bindResultClicks(container) {
  container.querySelectorAll('.cp-item').forEach(item => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.dataset.idx);
      if (currentResults[idx]) {
        currentResults[idx].action();
        closeCommandPalette();
      }
    });
  });
}

function updateActive(items) {
  items.forEach((item, i) => {
    item.classList.toggle('active', i === activeIndex);
    if (i === activeIndex) item.scrollIntoView({ block: 'nearest' });
  });
}

export function closeCommandPalette() {
  const overlay = document.getElementById('command-palette-overlay');
  if (overlay) overlay.remove();
  isOpen = false;
  activeIndex = 0;
}

export function isCommandPaletteOpen() {
  return isOpen;
}
