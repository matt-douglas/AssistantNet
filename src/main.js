// AssistantNet — Main Entry Point
import './styles/variables.css';
import './styles/layout.css';
import './styles/components.css';

import { router } from './router.js';
import { dataStore } from './services/data.js';
import { initLLM } from './services/llm.js';
import { workflowEngine } from './services/workflow.js';
import { renderDashboard, destroyDashboard } from './modules/dashboard/dashboard.js';
import { renderAssistant, destroyAssistant } from './modules/assistant/assistant.js';
import { renderInbox, destroyInbox } from './modules/inbox/inbox.js';
import { renderCalendar, destroyCalendar } from './modules/calendar/calendar.js';
import { renderTasks, destroyTasks } from './modules/tasks/tasks.js';
import { renderDocuments, destroyDocuments } from './modules/documents/documents.js';
import { renderSettings, destroySettings } from './modules/settings/settings.js';
import { isLLMReady } from './services/llm.js';

// Navigation config
const NAV_ITEMS = [
  { section: 'WORKSPACE' },
  { path: '/dashboard', label: 'Dashboard', icon: dashboardIcon(), badge: null },
  { path: '/assistant', label: 'AI Assistant', icon: assistantIcon(), badge: null },
  { path: '/inbox', label: 'Smart Inbox', icon: inboxIcon(), badge: () => dataStore.getEmails().filter(e => !e.read).length || null },
  { section: 'MANAGE' },
  { path: '/calendar', label: 'Calendar', icon: calendarIcon(), badge: null },
  { path: '/tasks', label: 'Task Engine', icon: tasksIcon(), badge: () => dataStore.getTasks().filter(t => t.priority === 'urgent' && t.status !== 'done').length || null },
  { path: '/documents', label: 'Documents', icon: documentsIcon(), badge: null },
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
};

let currentView = null;

// ---- Initialize App ----
function init() {
  buildSidebar();
  setupRouter();
  setupTopBar();
  setupKeyboardShortcuts();

  // Try to init LLM from stored API key
  const settings = dataStore.getSettings();
  if (settings.llmApiKey) {
    initLLM(settings.llmApiKey).then(() => updateSidebarLLMStatus(isLLMReady()));
  }

  // Set autonomous mode UI
  updateAutonomousUI(settings.autonomousMode);

  // Expose globally for settings module
  window.updateSidebarLLMStatus = updateSidebarLLMStatus;

  // Start router
  router.start();

  // Show onboarding if first visit (no API key set)
  if (!settings.llmApiKey && !localStorage.getItem('assistantnet_onboarded')) {
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

  // Transition animation
  container.style.opacity = '0';
  container.style.transform = 'translateY(8px)';

  setTimeout(() => {
    view.render(container);
    currentView = path;

    requestAnimationFrame(() => {
      container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      container.style.opacity = '1';
      container.style.transform = 'translateY(0)';
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

  // Global search
  const searchInput = document.getElementById('global-search');
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const query = searchInput.value.trim();
      if (query) {
        router.navigate('/assistant');
        setTimeout(() => {
          const chatInput = document.getElementById('chat-input');
          if (chatInput) {
            chatInput.value = query;
            chatInput.dispatchEvent(new Event('input'));
          }
        }, 300);
      }
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

  // Notifications
  document.getElementById('notifications-btn')?.addEventListener('click', () => {
    showToast('3 new notifications', 'info');
  });
}

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
    if (modeSpan) modeSpan.textContent = enabled ? 'AI Active' : 'Manual Mode';
    if (dot) dot.style.background = enabled ? 'var(--color-success)' : 'var(--color-warning)';
  }
}

function updateSidebarLLMStatus(connected) {
  const llmEl = document.getElementById('llm-status-text');
  const llmDot = document.getElementById('llm-status-dot');
  if (llmEl) llmEl.textContent = connected ? 'Gemini Connected' : 'LLM: Fallback';
  if (llmDot) {
    llmDot.className = connected ? 'status-dot online' : 'status-dot offline';
  }
}

function showOnboardingModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <div class="modal" style="animation: scaleIn 0.2s var(--ease-spring); max-width: 480px">
      <h2 style="background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-size: var(--text-2xl)">Welcome to AssistantNet 🧠</h2>
      <p style="color: var(--text-secondary); margin: var(--space-3) 0 var(--space-5)">To unlock live AI features, enter your Gemini API key. You can skip this and use built-in responses instead.</p>
      <div class="input-group" style="margin-bottom: var(--space-5)">
        <label class="input-label">Gemini API Key</label>
        <input type="password" id="onboard-api-key" class="input" placeholder="Paste your API key here..." />
        <div style="font-size: var(--text-xs); color: var(--text-muted); margin-top: var(--space-1)">Free from <a href='https://aistudio.google.com/' target='_blank' style='color: var(--accent-primary-hover)'>Google AI Studio</a></div>
      </div>
      <div style="display: flex; gap: var(--space-3); justify-content: flex-end">
        <button class="btn btn-ghost" id="onboard-skip">Skip for now</button>
        <button class="btn btn-primary" id="onboard-connect">🔌 Connect</button>
      </div>
    </div>
  `;

  const close = () => {
    localStorage.setItem('assistantnet_onboarded', '1');
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
  };

  document.getElementById('onboard-skip').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

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
      showToast('✅ Gemini connected! AI is now live.', 'success');
    } else {
      showToast('Failed to connect. You can try again from Settings.', 'warning');
    }
    close();
  });
}

// ---- Keyboard Shortcuts ----
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // ⌘K — Focus search
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      document.getElementById('global-search')?.focus();
    }
    // Escape — Close mobile sidebar
    if (e.key === 'Escape') {
      document.getElementById('sidebar').classList.remove('open');
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
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
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

// ---- Boot ----
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
