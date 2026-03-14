// AssistantNet — Settings Module
import { dataStore } from '../../services/data.js';
import { initLLM, isLLMReady } from '../../services/llm.js';
import { showToast } from '../../main.js';
import { escapeAttr } from '../../services/utils.js';
import './settings.css';

export function renderSettings(container) {
  const settings = dataStore.getSettings();

  container.innerHTML = `
    <div class="settings-view">
      <div class="settings-header animate-fade-in">
        <h1>⚙️ Settings</h1>
        <p>Configure your AssistantNet experience</p>
      </div>

      <div class="settings-grid">
        <!-- Profile Section -->
        <div class="settings-section card animate-fade-in-up" style="animation-delay: 80ms">
          <div class="settings-section-header">
            <div class="settings-section-icon">👤</div>
            <div>
              <div class="settings-section-title">Profile</div>
              <div class="settings-section-desc">Your identity within AssistantNet</div>
            </div>
          </div>
          <div class="settings-fields">
            <div class="input-group">
              <label class="input-label">Display Name / Initials</label>
              <input type="text" id="setting-username" class="input" value="${escapeAttr(settings.userName)}" placeholder="MD" />
            </div>
            <div class="input-group">
              <label class="input-label">Company Name</label>
              <input type="text" id="setting-company" class="input" value="${escapeAttr(settings.companyName)}" placeholder="Your Company" />
            </div>
          </div>
        </div>

        <!-- AI / LLM Section -->
        <div class="settings-section card animate-fade-in-up" style="animation-delay: 160ms">
          <div class="settings-section-header">
            <div class="settings-section-icon">🧠</div>
            <div>
              <div class="settings-section-title">AI Configuration</div>
              <div class="settings-section-desc">Connect your Gemini API key for live AI</div>
            </div>
            <div class="llm-status-indicator ${isLLMReady() ? 'connected' : 'disconnected'}">
              <div class="status-dot ${isLLMReady() ? 'online' : 'offline'}"></div>
              <span>${isLLMReady() ? 'Connected' : 'Using Fallback'}</span>
            </div>
          </div>
          <div class="settings-fields">
            <div class="input-group">
              <label class="input-label">Gemini API Key</label>
              <div class="api-key-row">
                <input type="password" id="setting-api-key" class="input" 
                  value="${settings.llmApiKey || ''}" 
                  placeholder="Enter your Gemini API key..." />
                <button class="btn btn-ghost btn-sm" id="toggle-key-visibility" title="Show/hide key">👁️</button>
              </div>
              <div class="input-hint">Get a free key from <a href="https://aistudio.google.com/" target="_blank" rel="noopener">Google AI Studio</a>. Uses gemini-2.0-flash.</div>
            </div>
            <div class="input-group">
              <label class="input-label">AI Model</label>
              <select id="setting-model" class="select" style="width: 100%" disabled>
                <option selected>gemini-2.0-flash</option>
              </select>
              <div class="input-hint">More models coming in a future update.</div>
            </div>
          </div>
          <div class="settings-action-row">
            <button class="btn btn-primary btn-sm" id="test-llm-btn">🔌 Test Connection</button>
          </div>
        </div>

        <!-- Automation Section -->
        <div class="settings-section card animate-fade-in-up" style="animation-delay: 240ms">
          <div class="settings-section-header">
            <div class="settings-section-icon">🤖</div>
            <div>
              <div class="settings-section-title">Automation</div>
              <div class="settings-section-desc">Control autonomous workflow behavior</div>
            </div>
          </div>
          <div class="settings-fields">
            <div class="settings-toggle-row">
              <div>
                <div class="settings-toggle-label">Autonomous Mode</div>
                <div class="settings-toggle-desc">AI proactively handles low-risk work items</div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="setting-autonomous" ${settings.autonomousMode ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- Data Section -->
        <div class="settings-section card animate-fade-in-up" style="animation-delay: 320ms">
          <div class="settings-section-header">
            <div class="settings-section-icon">💾</div>
            <div>
              <div class="settings-section-title">Data Management</div>
              <div class="settings-section-desc">Local storage and data controls</div>
            </div>
          </div>
          <div class="settings-fields">
            <div class="settings-info-row">
              <span>Local storage used</span>
              <span class="mono">${getStorageSize()}</span>
            </div>
            <div class="settings-info-row">
              <span>Data persistence</span>
              <span class="badge badge-info">localStorage</span>
            </div>
          </div>
          <div class="settings-action-row">
            <button class="btn btn-danger btn-sm" id="reset-data-btn">🗑️ Reset All Data</button>
          </div>
        </div>
      </div>

      <!-- Save bar -->
      <div class="settings-save-bar animate-fade-in-up" style="animation-delay: 400ms">
        <button class="btn btn-primary btn-lg" id="save-settings-btn">💾 Save Settings</button>
      </div>
    </div>
  `;

  bindSettingsEvents();
}

function bindSettingsEvents() {
  // Toggle API key visibility
  document.getElementById('toggle-key-visibility')?.addEventListener('click', () => {
    const input = document.getElementById('setting-api-key');
    input.type = input.type === 'password' ? 'text' : 'password';
  });

  // Test LLM connection
  document.getElementById('test-llm-btn')?.addEventListener('click', async () => {
    const apiKey = document.getElementById('setting-api-key').value.trim();
    const btn = document.getElementById('test-llm-btn');
    if (!apiKey) {
      showToast('Enter an API key first', 'warning');
      return;
    }
    btn.disabled = true;
    btn.textContent = '⏳ Testing...';
    try {
      const client = await initLLM(apiKey);
      if (client) {
        showToast('✅ Gemini connected successfully!', 'success');
        // Persist the key on successful test
        dataStore.updateSettings({ llmApiKey: apiKey });
        updateLLMStatusUI(true);
      } else {
        showToast('Failed to connect. Check your API key.', 'error');
        updateLLMStatusUI(false);
      }
    } catch (err) {
      showToast(`Connection error: ${err.message}`, 'error');
      updateLLMStatusUI(false);
    }
    btn.disabled = false;
    btn.textContent = '🔌 Test Connection';
  });

  // Save settings
  document.getElementById('save-settings-btn')?.addEventListener('click', async () => {
    const userName = document.getElementById('setting-username').value.trim() || 'MD';
    const companyName = document.getElementById('setting-company').value.trim() || 'Your Company';
    const apiKey = document.getElementById('setting-api-key').value.trim();
    const autonomousMode = document.getElementById('setting-autonomous').checked;

    dataStore.updateSettings({ userName, companyName, llmApiKey: apiKey, autonomousMode });

    // Init LLM if key provided
    if (apiKey) {
      const client = await initLLM(apiKey);
      updateLLMStatusUI(!!client);
    }

    // Update user avatar
    const avatarEl = document.getElementById('user-avatar');
    if (avatarEl) {
      avatarEl.querySelector('span').textContent = userName.slice(0, 2).toUpperCase();
    }

    showToast('Settings saved!', 'success');
  });

  // Reset data
  document.getElementById('reset-data-btn')?.addEventListener('click', () => {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('hidden');
    overlay.innerHTML = `
      <div class="modal" style="animation: scaleIn 0.2s var(--ease-spring)">
        <h2>⚠️ Reset All Data</h2>
        <p style="color: var(--text-secondary); margin-bottom: var(--space-5)">This will clear all emails, tasks, meetings, documents, and settings. This action cannot be undone.</p>
        <div style="display: flex; gap: var(--space-3); justify-content: flex-end">
          <button class="btn btn-ghost" id="cancel-reset-btn">Cancel</button>
          <button class="btn btn-danger" id="confirm-reset-btn">Reset Everything</button>
        </div>
      </div>
    `;
    document.getElementById('cancel-reset-btn').addEventListener('click', () => {
      overlay.classList.add('hidden');
      overlay.innerHTML = '';
    });
    document.getElementById('confirm-reset-btn').addEventListener('click', () => {
      dataStore.reset();
      overlay.classList.add('hidden');
      overlay.innerHTML = '';
      showToast('All data has been reset.', 'info');
      renderSettings(document.getElementById('view-container'));
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.add('hidden');
        overlay.innerHTML = '';
      }
    });
  });
}

function updateLLMStatusUI(connected) {
  const indicator = document.querySelector('.llm-status-indicator');
  if (indicator) {
    indicator.className = `llm-status-indicator ${connected ? 'connected' : 'disconnected'}`;
    const dot = indicator.querySelector('.status-dot');
    if (dot) dot.className = `status-dot ${connected ? 'online' : 'offline'}`;
    const span = indicator.querySelector('span');
    if (span) span.textContent = connected ? 'Connected' : 'Using Fallback';
  }
  // Update sidebar status
  if (typeof window.updateSidebarLLMStatus === 'function') {
    window.updateSidebarLLMStatus(connected);
  }
}

function getStorageSize() {
  try {
    const data = localStorage.getItem('assistantnet_data');
    if (!data) return '0 KB';
    const bytes = new Blob([data]).size;
    if (bytes > 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / 1024).toFixed(1) + ' KB';
  } catch { return 'Unknown'; }
}



export function destroySettings() {}
