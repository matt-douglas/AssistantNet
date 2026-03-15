// AssistantNet — Main Entry Point
import './styles/variables.css';
import './styles/layout.css';
import './styles/components.css';

import { router } from './router.js';
import { dataStore } from './services/data.js';
import { initLLM, initOllama, setProvider, setOllamaConfig, getProvider, getProviderDisplayName, isLLMReady } from './services/llm.js';
import { workflowEngine } from './services/workflow.js';
import { escapeHtml } from './services/utils.js';
import { renderDashboard, destroyDashboard } from './modules/dashboard/dashboard.js';
import { renderAssistant, destroyAssistant } from './modules/assistant/assistant.js';
import { renderInbox, destroyInbox } from './modules/inbox/inbox.js';
import { renderCalendar, destroyCalendar } from './modules/calendar/calendar.js';
import { renderTasks, destroyTasks } from './modules/tasks/tasks.js';
import { renderDocuments, destroyDocuments } from './modules/documents/documents.js';
import { renderSettings, destroySettings } from './modules/settings/settings.js';
import { renderAnalytics, destroyAnalytics } from './modules/analytics/analytics.js';
import { renderContacts, destroyContacts } from './modules/contacts/contacts.js';
import { renderScheduling, destroyScheduling } from './modules/scheduling/scheduling.js';
import { openCommandPalette, closeCommandPalette, isCommandPaletteOpen } from './modules/command-palette/command-palette.js';
import { checkBackend, hasBackend } from './services/api.js';

// Navigation config
const NAV_ITEMS = [
  { section: 'WORKSPACE' },
  { path: '/dashboard', label: 'Dashboard', icon: dashboardIcon(), badge: null },
  { path: '/assistant', label: 'AI Assistant', icon: assistantIcon(), badge: null },
  { path: '/inbox', label: 'Smart Inbox', icon: inboxIcon(), badge: () => dataStore.getEmails().filter(e => !e.read).length || null },
  { section: 'MANAGE' },
  { path: '/calendar', label: 'Calendar', icon: calendarIcon(), badge: null },
  { path: '/scheduling', label: 'Scheduling', icon: schedulingIcon(), badge: () => (dataStore.data.bookings || []).filter(b => b.status === 'pending').length || null },
  { path: '/tasks', label: 'Task Engine', icon: tasksIcon(), badge: () => dataStore.getTasks().filter(t => t.priority === 'urgent' && t.status !== 'done').length || null },
  { path: '/documents', label: 'Documents', icon: documentsIcon(), badge: null },
  { section: 'INSIGHTS' },
  { path: '/analytics', label: 'Analytics', icon: analyticsIcon(), badge: null },
  { path: '/contacts', label: 'Team & Contacts', icon: contactsIcon(), badge: null },
  { section: 'SYSTEM' },
  { path: '/settings', label: 'Settings', icon: settingsIcon(), badge: null },
];

// View registry
const VIEWS = {
  '/dashboard': { render: renderDashboard, destroy: destroyDashboard },
  '/assistant': { render: renderAssistant, destroy: destroyAssistant },
  '/inbox': { render: renderInbox, destroy: destroyInbox },
  '/calendar': { render: renderCalendar, destroy: destroyCalendar },
  '/tasks': { render: renderTasks, destroy: destroyTasks },
  '/documents': { render: renderDocuments, destroy: destroyDocuments },
  '/settings': { render: renderSettings, destroy: destroySettings },
  '/analytics': { render: renderAnalytics, destroy: destroyAnalytics },
  '/contacts': { render: renderContacts, destroy: destroyContacts },
  '/scheduling': { render: renderScheduling, destroy: destroyScheduling },
};

let currentView = null;

// ---- Initialize App ----
async function init() {
  // Detect backend
  await checkBackend();
  console.log(`⚡ J.A.R.V.I.S. booting — Backend: ${hasBackend() ? '✅ Connected' : '⚠️ Offline (localStorage mode)'}`);

  buildSidebar();
  setupRouter();
  setupTopBar();
  setupKeyboardShortcuts();

  // Restore saved AI provider
  const settings = dataStore.getSettings();
  const savedProvider = settings.llmProvider || 'fallback';
  if (savedProvider === 'gemini' && settings.llmApiKey) {
    initLLM(settings.llmApiKey).then(() => updateSidebarLLMStatus(isLLMReady()));
  } else if (savedProvider === 'ollama') {
    const baseUrl = settings.ollamaBaseUrl || '/ollama';
    const model = settings.ollamaModel || '';
    initOllama(baseUrl, model).then((result) => {
      updateSidebarLLMStatus(!!result);
    });
  }

  // Set autonomous mode UI
  updateAutonomousUI(settings.autonomousMode);

  // Expose globally for settings module
  window.updateSidebarLLMStatus = updateSidebarLLMStatus;
  window.updateUserAvatar = updateUserAvatar;

  // Start router
  router.start();

  // Show onboarding if first visit (no API key set)
  if (!settings.llmApiKey && !localStorage.getItem('jarvis_onboarded')) {
    setTimeout(() => showOnboardingModal(), 800);
  }
}

// ---- Sidebar ----
function buildSidebar() {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = NAV_ITEMS.map(item => {
    if (item.section) {
      return `<div class="nav-section-label">${item.section}</div>`;
    }
    const badgeValue = typeof item.badge === 'function' ? item.badge() : item.badge;
    return `
      <div class="nav-item" data-path="${item.path}" id="nav-${item.path.replace('/', '')}">
        ${item.icon}
        <span class="nav-item-label">${item.label}</span>
        ${badgeValue ? `<span class="nav-item-badge">${badgeValue}</span>` : ''}
      </div>
    `;
  }).join('');

  // Bind nav clicks
  nav.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => {
      router.navigate(el.dataset.path);
      // Close mobile sidebar
      document.getElementById('sidebar').classList.remove('open');
    });
  });
}

// ---- Router Setup ----
function setupRouter() {
  Object.entries(VIEWS).forEach(([path, view]) => {
    router.register(path, () => {
      switchView(path, view);
    });
  });

  router.onRouteChange = (path) => {
    updateActiveNav(path);
  };
}

function switchView(path, view) {
  const container = document.getElementById('view-container');

  // Destroy previous view
  if (currentView && VIEWS[currentView]?.destroy) {
    VIEWS[currentView].destroy();
  }

  // Page exit
  container.style.opacity = '0';
  container.style.transform = 'translateY(12px) scale(0.99)';
  container.style.transition = 'opacity 0.15s ease, transform 0.15s ease';

  setTimeout(() => {
    view.render(container);
    currentView = path;

    // Page enter
    requestAnimationFrame(() => {
      container.style.transition = 'none';
      container.style.opacity = '0';
      container.style.transform = 'translateY(12px) scale(0.99)';

      requestAnimationFrame(() => {
        container.style.transition = 'opacity 0.35s cubic-bezier(0.22, 1, 0.36, 1), transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)';
        container.style.opacity = '1';
        container.style.transform = 'translateY(0) scale(1)';
      });
    });
  }, 150);
}

function updateActiveNav(path) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.path === path);
  });
  // Update badge values in-place
  NAV_ITEMS.forEach(item => {
    if (item.section || !item.badge) return;
    const navEl = document.getElementById(`nav-${item.path.replace('/', '')}`);
    if (!navEl) return;
    const badgeValue = typeof item.badge === 'function' ? item.badge() : item.badge;
    const existing = navEl.querySelector('.nav-item-badge');
    if (badgeValue) {
      if (existing) { existing.textContent = badgeValue; }
      else { navEl.insertAdjacentHTML('beforeend', `<span class="nav-item-badge">${badgeValue}</span>`); }
    } else if (existing) {
      existing.remove();
    }
  });
}

// ---- Top Bar ----
function setupTopBar() {
  // Sidebar toggle (mobile)
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Global cross-module search
  const searchInput = document.getElementById('global-search');
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const query = searchInput.value.trim().toLowerCase();
      if (!query) return;
      showSearchResults(query);
    }
  });

  // Autonomous mode toggle
  const autoToggle = document.getElementById('autonomous-toggle');
  autoToggle?.addEventListener('click', () => {
    const newMode = !workflowEngine.autonomousMode;
    workflowEngine.setAutonomousMode(newMode);
    updateAutonomousUI(newMode);
    showToast(
      newMode ? 'Autonomous mode enabled — AI is actively managing workflows' : 'Autonomous mode disabled — manual control',
      newMode ? 'success' : 'info'
    );
  });

  // Notifications panel
  document.getElementById('notifications-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleNotificationPanel();
  });

  // Theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('jarvis_theme') || 'dark';
  if (savedTheme === 'light') document.documentElement.setAttribute('data-theme', 'light');
  updateThemeIcon(savedTheme);

  themeToggle?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('jarvis_theme', next);
    updateThemeIcon(next);
    showToast(next === 'light' ? '☀️ Light mode activated' : '🌙 Dark mode activated', 'info');
  });

  // Update user avatar initials from settings
  updateUserAvatar();
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('theme-icon');
  if (!icon) return;
  if (theme === 'light') {
    icon.innerHTML = '<circle cx="9" cy="9" r="4" stroke="currentColor" stroke-width="1.5"/><path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.4 3.4l1.4 1.4M13.2 13.2l1.4 1.4M3.4 14.6l1.4-1.4M13.2 4.8l1.4-1.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>';
  } else {
    icon.innerHTML = '<path d="M9 1.5a7.5 7.5 0 100 15 5.5 5.5 0 010-15z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
  }
}

function updateUserAvatar() {
  const settings = dataStore.getSettings();
  const name = settings.userName || 'MD';
  const parts = name.trim().split(/\s+/);
  const initials = parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  const el = document.getElementById('user-initials');
  if (el) el.textContent = initials;
}

function showSearchResults(query) {
  const emails = dataStore.getEmails().filter(e =>
    e.subject.toLowerCase().includes(query) || e.from.toLowerCase().includes(query) || e.body.toLowerCase().includes(query)
  );
  const tasks = dataStore.getTasks().filter(t =>
    t.title.toLowerCase().includes(query) || (t.tags || []).some(tag => tag.toLowerCase().includes(query))
  );
  const docs = dataStore.getDocuments().filter(d =>
    d.name.toLowerCase().includes(query) || d.category.toLowerCase().includes(query)
  );
  const meetings = dataStore.getMeetings().filter(m =>
    m.title.toLowerCase().includes(query) || (m.location || '').toLowerCase().includes(query)
  );

  const total = emails.length + tasks.length + docs.length + meetings.length;
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <div class="modal" style="animation: scaleIn 0.2s var(--ease-spring); max-width: 600px; max-height: 80vh; overflow-y: auto">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4)">
        <h2>🔍 Search Results for "${escapeHtml(query)}"</h2>
        <button class="btn btn-ghost btn-sm" id="close-search">✕</button>
      </div>
      <div style="font-size: var(--text-sm); color: var(--text-tertiary); margin-bottom: var(--space-4)">${total} results found</div>
      ${emails.length ? `
        <div style="margin-bottom: var(--space-4)">
          <div style="font-size: var(--text-xs); font-weight: var(--weight-semibold); color: var(--text-muted); text-transform: uppercase; margin-bottom: var(--space-2)">📧 Emails (${emails.length})</div>
          ${emails.slice(0, 5).map(e => `
            <div class="search-result-item" data-goto="inbox">
              <strong>${escapeHtml(e.subject)}</strong>
              <span style="color: var(--text-muted); font-size: var(--text-xs)">from ${escapeHtml(e.from)}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${tasks.length ? `
        <div style="margin-bottom: var(--space-4)">
          <div style="font-size: var(--text-xs); font-weight: var(--weight-semibold); color: var(--text-muted); text-transform: uppercase; margin-bottom: var(--space-2)">✅ Tasks (${tasks.length})</div>
          ${tasks.slice(0, 5).map(t => `
            <div class="search-result-item" data-goto="tasks">
              <strong>${escapeHtml(t.title)}</strong>
              <span class="badge badge-${t.priority}" style="font-size: 10px">${t.priority}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${docs.length ? `
        <div style="margin-bottom: var(--space-4)">
          <div style="font-size: var(--text-xs); font-weight: var(--weight-semibold); color: var(--text-muted); text-transform: uppercase; margin-bottom: var(--space-2)">📄 Documents (${docs.length})</div>
          ${docs.slice(0, 5).map(d => `
            <div class="search-result-item" data-goto="documents">
              <strong>${escapeHtml(d.name)}</strong>
              <span style="color: var(--text-muted); font-size: var(--text-xs)">${d.category}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${meetings.length ? `
        <div style="margin-bottom: var(--space-4)">
          <div style="font-size: var(--text-xs); font-weight: var(--weight-semibold); color: var(--text-muted); text-transform: uppercase; margin-bottom: var(--space-2)">📅 Meetings (${meetings.length})</div>
          ${meetings.slice(0, 5).map(m => `
            <div class="search-result-item" data-goto="calendar">
              <strong>${escapeHtml(m.title)}</strong>
              <span style="color: var(--text-muted); font-size: var(--text-xs)">${m.time} · ${m.location || 'No location'}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${total === 0 ? '<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-title">No results found</div></div>' : ''}
    </div>
  `;

  const close = () => { overlay.classList.add('hidden'); overlay.innerHTML = ''; };
  document.getElementById('close-search')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  // Click result to navigate
  overlay.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      close();
      router.navigate('/' + item.dataset.goto);
    });
  });
}

function toggleNotificationPanel() {
  const existing = document.getElementById('notification-panel');
  if (existing) { existing.remove(); return; }

  const unreadEmails = dataStore.getEmails().filter(e => !e.read);
  const urgentTasks = dataStore.getTasks().filter(t => t.priority === 'urgent' && t.status !== 'done');
  const upcomingMeetings = dataStore.getMeetings().slice(0, 3);
  const activities = dataStore.getActivityLog().slice(0, 5);

  const notifications = [
    ...unreadEmails.slice(0, 3).map(e => ({ icon: '📧', text: `New email from ${e.from}`, sub: e.subject, type: 'email', goto: '/inbox' })),
    ...urgentTasks.map(t => ({ icon: '🔴', text: `Urgent: ${t.title}`, sub: t.dueDate || 'No due date', type: 'task', goto: '/tasks' })),
    ...upcomingMeetings.map(m => ({ icon: '📅', text: m.title, sub: `${m.time} · ${m.location || ''}`, type: 'meeting', goto: '/calendar' })),
  ];

  const panel = document.createElement('div');
  panel.id = 'notification-panel';
  panel.className = 'notification-panel animate-fade-in-down';
  panel.innerHTML = `
    <div class="notif-header">
      <span>Notifications (${notifications.length})</span>
      <button class="btn btn-ghost btn-sm" id="close-notifs">✕</button>
    </div>
    <div class="notif-list">
      ${notifications.length ? notifications.map(n => `
        <div class="notif-item" data-goto="${n.goto}">
          <div class="notif-icon">${n.icon}</div>
          <div class="notif-content">
            <div class="notif-text">${escapeHtml(n.text)}</div>
            <div class="notif-sub">${escapeHtml(n.sub)}</div>
          </div>
        </div>
      `).join('') : '<div class="empty-state" style="padding: var(--space-6)"><div class="empty-state-title">All caught up! 🎉</div></div>'}
    </div>
  `;

  document.body.appendChild(panel);

  // Update badge
  const badge = document.getElementById('notification-badge');
  if (badge) badge.textContent = notifications.length;

  document.getElementById('close-notifs')?.addEventListener('click', () => panel.remove());
  panel.querySelectorAll('.notif-item').forEach(item => {
    item.addEventListener('click', () => {
      panel.remove();
      router.navigate(item.dataset.goto);
    });
  });

  // Click outside to close
  const closeOnClick = (e) => {
    if (!panel.contains(e.target) && !e.target.closest('#notifications-btn')) {
      panel.remove();
      document.removeEventListener('click', closeOnClick);
    }
  };
  setTimeout(() => document.addEventListener('click', closeOnClick), 100);
}

// escapeHtml imported from services/utils.js

function updateAutonomousUI(enabled) {
  const toggle = document.getElementById('autonomous-toggle');
  const status = document.getElementById('ai-status');
  if (toggle) {
    toggle.classList.toggle('active', enabled);
    toggle.title = enabled ? 'Autonomous Mode: ON' : 'Autonomous Mode: OFF';
  }
  if (status) {
    const modeSpan = status.querySelector('.ai-mode-text');
    const dot = status.querySelector('.ai-pulse');
    if (modeSpan) modeSpan.textContent = enabled ? 'J.A.R.V.I.S. Online' : 'J.A.R.V.I.S. Standby';
    if (dot) dot.style.background = enabled ? 'var(--color-success)' : 'var(--color-warning)';
  }
}

function updateSidebarLLMStatus(connected) {
  const llmEl = document.getElementById('llm-status-text');
  const llmDot = document.getElementById('llm-status-dot');
  if (llmEl) llmEl.textContent = getProviderDisplayName();
  if (llmDot) {
    llmDot.className = connected ? 'status-dot online' : 'status-dot offline';
  }
}

function showOnboardingModal() {
  let step = 1;
  const overlay = document.getElementById('modal-overlay');
  let selectedMode = 'demo'; // default to demo

  function renderStep() {
    overlay.classList.remove('hidden');

    if (step === 1) {
      overlay.innerHTML = `
        <div class="modal" style="animation: scaleIn 0.25s var(--ease-spring); max-width: 520px;">
          <div style="text-align: center; margin-bottom: var(--space-5);">
            <div style="font-size: 3rem; margin-bottom: var(--space-3); filter: drop-shadow(0 0 20px rgba(99, 102, 241, 0.5));">⚡</div>
            <h2 style="background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-size: var(--text-2xl); margin-bottom: var(--space-2);">Initializing J.A.R.V.I.S.</h2>
            <p style="color: var(--text-secondary); font-size: var(--text-sm);">Just A Rather Very Intelligent System — your personal AI command center.</p>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); margin-bottom: var(--space-5);">
            <div style="padding: var(--space-4); background: var(--bg-secondary); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div style="font-size: 1.2rem; margin-bottom: var(--space-1);">📧</div>
              <div style="font-size: var(--text-sm); font-weight: var(--weight-semibold);">Communications</div>
              <div style="font-size: var(--text-xs); color: var(--text-muted);">Inbox triage & smart drafts</div>
            </div>
            <div style="padding: var(--space-4); background: var(--bg-secondary); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div style="font-size: 1.2rem; margin-bottom: var(--space-1);">📅</div>
              <div style="font-size: var(--text-sm); font-weight: var(--weight-semibold);">Schedule</div>
              <div style="font-size: var(--text-xs); color: var(--text-muted);">Calendar & focus time</div>
            </div>
            <div style="padding: var(--space-4); background: var(--bg-secondary); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div style="font-size: 1.2rem; margin-bottom: var(--space-1);">✅</div>
              <div style="font-size: var(--text-sm); font-weight: var(--weight-semibold);">Task Engine</div>
              <div style="font-size: var(--text-xs); color: var(--text-muted);">Priority-ranked Kanban</div>
            </div>
            <div style="padding: var(--space-4); background: var(--bg-secondary); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div style="font-size: 1.2rem; margin-bottom: var(--space-1);">📊</div>
              <div style="font-size: var(--text-sm); font-weight: var(--weight-semibold);">Analytics</div>
              <div style="font-size: var(--text-xs); color: var(--text-muted);">Productivity insights</div>
            </div>
          </div>
          <div style="display: flex; gap: var(--space-3); justify-content: flex-end; align-items: center;">
            <div style="flex: 1; font-size: var(--text-xs); color: var(--text-muted);">Step 1 of 3</div>
            <button class="btn btn-primary" id="onboard-next-1">Initialize →</button>
          </div>
        </div>
      `;
      document.getElementById('onboard-next-1').addEventListener('click', () => { step = 2; renderStep(); });
    } else if (step === 2) {
      const settings = dataStore.getSettings();
      overlay.innerHTML = `
        <div class="modal" style="animation: scaleIn 0.25s var(--ease-spring); max-width: 540px;">
          <div style="text-align: center; margin-bottom: var(--space-5);">
            <div style="font-size: 2rem; margin-bottom: var(--space-2);">👤</div>
            <h2 style="font-size: var(--text-xl); font-weight: var(--weight-bold);">Identification Protocol</h2>
            <p style="color: var(--text-secondary); font-size: var(--text-sm);">What shall I call you, sir?</p>
          </div>
          <div style="display: flex; flex-direction: column; gap: var(--space-4); margin-bottom: var(--space-5);">
            <div class="input-group">
              <label class="input-label">Your Name</label>
              <input type="text" id="onboard-name" class="input" placeholder="e.g. Tony Stark" value="${settings.userName || ''}" autofocus />
            </div>
            <div class="input-group">
              <label class="input-label">Workspace Name <span style="color: var(--text-muted); font-weight: normal;">(optional)</span></label>
              <input type="text" id="onboard-company" class="input" placeholder="e.g. Stark Industries" value="${settings.companyName || ''}" />
            </div>
          </div>
          <div style="margin-bottom: var(--space-5);">
            <label class="input-label" style="margin-bottom: var(--space-3); display: block;">Data Mode</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
              <div class="mode-option ${selectedMode === 'demo' ? 'selected' : ''}" data-mode="demo" style="padding: var(--space-4); border-radius: var(--radius-md); cursor: pointer; border: 2px solid ${selectedMode === 'demo' ? 'var(--accent-primary)' : 'var(--border-subtle)'}; background: ${selectedMode === 'demo' ? 'rgba(var(--accent-primary-rgb), 0.08)' : 'var(--bg-secondary)'}; transition: all var(--duration-fast) ease; text-align: center;">
                <div style="font-size: 1.5rem; margin-bottom: var(--space-2);">🎭</div>
                <div style="font-size: var(--text-sm); font-weight: var(--weight-semibold);">Demo Mode</div>
                <div style="font-size: var(--text-xs); color: var(--text-muted); margin-top: var(--space-1);">Sample data to explore all features</div>
              </div>
              <div class="mode-option ${selectedMode === 'clean' ? 'selected' : ''}" data-mode="clean" style="padding: var(--space-4); border-radius: var(--radius-md); cursor: pointer; border: 2px solid ${selectedMode === 'clean' ? 'var(--accent-primary)' : 'var(--border-subtle)'}; background: ${selectedMode === 'clean' ? 'rgba(var(--accent-primary-rgb), 0.08)' : 'var(--bg-secondary)'}; transition: all var(--duration-fast) ease; text-align: center;">
                <div style="font-size: 1.5rem; margin-bottom: var(--space-2);">🚀</div>
                <div style="font-size: var(--text-sm); font-weight: var(--weight-semibold);">Start Fresh</div>
                <div style="font-size: var(--text-xs); color: var(--text-muted); margin-top: var(--space-1);">Clean workspace, your data only</div>
              </div>
            </div>
            <div style="font-size: var(--text-xs); color: var(--text-muted); margin-top: var(--space-2);">You can switch modes anytime from Settings.</div>
          </div>
          <div style="display: flex; gap: var(--space-3); justify-content: flex-end; align-items: center;">
            <div style="flex: 1; font-size: var(--text-xs); color: var(--text-muted);">Step 2 of 3</div>
            <button class="btn btn-ghost" id="onboard-back-2">← Back</button>
            <button class="btn btn-primary" id="onboard-next-2">Continue →</button>
          </div>
        </div>
      `;

      // Mode toggle
      overlay.querySelectorAll('.mode-option').forEach(opt => {
        opt.addEventListener('click', () => {
          overlay.querySelectorAll('.mode-option').forEach(o => {
            o.style.borderColor = 'var(--border-subtle)';
            o.style.background = 'var(--bg-secondary)';
            o.classList.remove('selected');
          });
          opt.style.borderColor = 'var(--accent-primary)';
          opt.style.background = 'rgba(var(--accent-primary-rgb), 0.08)';
          opt.classList.add('selected');
          selectedMode = opt.dataset.mode;
        });
      });

      document.getElementById('onboard-back-2').addEventListener('click', () => { step = 1; renderStep(); });
      document.getElementById('onboard-next-2').addEventListener('click', () => {
        const name = document.getElementById('onboard-name').value.trim();
        const company = document.getElementById('onboard-company').value.trim();
        if (name) dataStore.updateSettings({ userName: name });
        if (company) dataStore.updateSettings({ companyName: company });
        step = 3; renderStep();
      });
    } else if (step === 3) {
      overlay.innerHTML = `
        <div class="modal" style="animation: scaleIn 0.25s var(--ease-spring); max-width: 480px;">
          <div style="text-align: center; margin-bottom: var(--space-5);">
            <div style="font-size: 2rem; margin-bottom: var(--space-2);">⚡</div>
            <h2 style="font-size: var(--text-xl); font-weight: var(--weight-bold);">Core Upgrade</h2>
            <p style="color: var(--text-secondary); font-size: var(--text-sm);">I can operate at significantly enhanced capacity with a Gemini API key. This is entirely optional — I function well without one.</p>
          </div>
          <div class="input-group" style="margin-bottom: var(--space-5);">
            <label class="input-label">Gemini API Key (optional)</label>
            <input type="password" id="onboard-api-key" class="input" placeholder="Paste your API key here..." />
            <div style="font-size: var(--text-xs); color: var(--text-muted); margin-top: var(--space-1);">Free from <a href='https://aistudio.google.com/' target='_blank' style='color: var(--accent-primary-hover)'>Google AI Studio</a></div>
          </div>
          <div style="display: flex; gap: var(--space-3); justify-content: flex-end; align-items: center;">
            <div style="flex: 1; font-size: var(--text-xs); color: var(--text-muted);">Step 3 of 3</div>
            <button class="btn btn-ghost" id="onboard-back-3">← Back</button>
            <button class="btn btn-ghost" id="onboard-skip">Skip for now</button>
            <button class="btn btn-primary" id="onboard-connect">⚡ Connect</button>
          </div>
        </div>
      `;
      document.getElementById('onboard-back-3').addEventListener('click', () => { step = 2; renderStep(); });
      document.getElementById('onboard-skip').addEventListener('click', close);

      document.getElementById('onboard-connect').addEventListener('click', async () => {
        const key = document.getElementById('onboard-api-key').value.trim();
        if (!key) return;
        const btn = document.getElementById('onboard-connect');
        btn.disabled = true;
        btn.textContent = '⏳ Connecting...';
        const client = await initLLM(key);
        if (client) {
          dataStore.updateSettings({ llmApiKey: key });
          updateSidebarLLMStatus(true);
          showToast('⚡ Core upgraded — Gemini is now online.', 'success');
        } else {
          showToast('Connection failed. You can try again from Settings.', 'warning');
        }
        close();
      });
    }
  }

  const close = () => {
    localStorage.setItem('jarvis_onboarded', '1');
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
    
    // Apply selected data mode
    const currentSettings = dataStore.getSettings();
    if (selectedMode === 'clean') {
      dataStore.disableDemoMode();
    } else {
      // Make sure demo mode flag is set
      dataStore.data.demoMode = true;
      dataStore.save();
    }
    // Re-apply user settings that were entered during onboarding
    if (currentSettings.userName) dataStore.updateSettings({ userName: currentSettings.userName });
    if (currentSettings.companyName) dataStore.updateSettings({ companyName: currentSettings.companyName });
    if (currentSettings.llmApiKey) dataStore.updateSettings({ llmApiKey: currentSettings.llmApiKey });

    // Update user avatar
    updateUserAvatar(currentSettings.userName || '?');

    // Refresh dashboard to use new name and data
    if (currentView === '/dashboard') {
      const container = document.getElementById('view-container');
      VIEWS['/dashboard'].render(container);
    }
  };

  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  renderStep();
}

// ---- Keyboard Shortcuts ----
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // ⌘K — Command Palette
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (isCommandPaletteOpen()) {
        closeCommandPalette();
      } else {
        openCommandPalette();
      }
    }
    // Escape — Close command palette or mobile sidebar
    if (e.key === 'Escape') {
      if (isCommandPaletteOpen()) {
        closeCommandPalette();
      } else {
        document.getElementById('sidebar').classList.remove('open');
      }
    }
  });
}

// ---- Toast System (exported) ----
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✅', warning: '⚠️', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span style="flex:1">${message}</span>
    <button class="toast-close" style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:2px;font-size:14px;line-height:1;">✕</button>
    <div class="toast-progress" style="position:absolute;bottom:0;left:0;height:2px;background:var(--accent-primary);border-radius:0 0 var(--radius-md) var(--radius-md);animation:toastProgress 4s linear forwards;"></div>
  `;
  container.appendChild(toast);

  const dismiss = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  };

  toast.querySelector('.toast-close')?.addEventListener('click', dismiss);

  setTimeout(dismiss, 4000);
}

// ---- SVG Icons ----
function dashboardIcon() {
  return '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="11" y="3" width="6" height="4" rx="1"/><rect x="3" y="11" width="6" height="6" rx="1"/><rect x="11" y="9" width="6" height="8" rx="1"/></svg>';
}
function assistantIcon() {
  return '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="3"/><path d="M10 3v2M10 15v2M3 10h2M15 10h2"/></svg>';
}
function inboxIcon() {
  return '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 5l7 5 7-5"/><rect x="3" y="4" width="14" height="12" rx="2"/></svg>';
}
function calendarIcon() {
  return '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="14" height="13" rx="2"/><path d="M3 8h14M7 2v4M13 2v4"/></svg>';
}
function tasksIcon() {
  return '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 6l2 2 4-4"/><path d="M4 13l2 2 4-4"/><path d="M13 7h4M13 14h4"/></svg>';
}
function documentsIcon() {
  return '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 3h7l4 4v10a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M12 3v4h4"/><path d="M7 10h6M7 13h4"/></svg>';
}
function settingsIcon() {
  return '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="3"/><path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M3.87 3.87l1.41 1.41M14.72 14.72l1.41 1.41M3.87 16.13l1.41-1.41M14.72 5.28l1.41-1.41"/></svg>';
}
function analyticsIcon() {
  return '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 17V9l4-2v10M9 17V6l4 3v8M15 17V4l3 3v10"/></svg>';
}
function contactsIcon() {
  return '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="7" r="3"/><path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="16" cy="5" r="2"/><path d="M18 13c0-2-1-3.5-2.5-4"/></svg>';
}
function schedulingIcon() {
  return '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="14" height="13" rx="2"/><path d="M3 8h14M7 2v4M13 2v4"/><circle cx="10" cy="13" r="2"/><path d="M10 11v2l1.5 1"/></svg>';
}

// ---- Boot ----
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
