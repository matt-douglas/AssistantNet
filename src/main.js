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
];

// View registry
const VIEWS = {
  '/dashboard': { render: renderDashboard, destroy: destroyDashboard },
  '/assistant': { render: renderAssistant, destroy: destroyAssistant },
  '/inbox': { render: renderInbox, destroy: destroyInbox },
  '/calendar': { render: renderCalendar, destroy: destroyCalendar },
  '/tasks': { render: renderTasks, destroy: destroyTasks },
  '/documents': { render: renderDocuments, destroy: destroyDocuments },
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
    initLLM(settings.llmApiKey);
  }

  // Set autonomous mode UI
  updateAutonomousUI(settings.autonomousMode);

  // Start router
  router.start();
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
    const span = status.querySelector('span');
    const dot = status.querySelector('.ai-pulse');
    if (enabled) {
      span.textContent = 'AI Active';
      dot.style.background = 'var(--color-success)';
    } else {
      span.textContent = 'Manual Mode';
      dot.style.background = 'var(--color-warning)';
    }
  }
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

// ---- Boot ----
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
