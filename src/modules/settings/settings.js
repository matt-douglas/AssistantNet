// J.A.R.V.I.S. — Settings Module
import { dataStore } from '../../services/data.js';
import { initLLM, initOllama, detectOllama, isLLMReady, getProvider, setProvider, setOllamaConfig, getProviderDisplayName } from '../../services/llm.js';
import { showToast } from '../../main.js';
import './settings.css';

function escapeAttr(s) { return (s || '').replace(/"/g, '&quot;'); }

export function renderSettings(container) {
  const settings = dataStore.getSettings();
  const currentProvider = getProvider();
  const ollamaConfig = settings.ollama || {};

  container.innerHTML = `
    <div class="settings-view">
      <div class="settings-header animate-fade-in">
        <h1>⚙️ Settings</h1>
        <p>Configure your J.A.R.V.I.S. systems</p>
      </div>

      <div class="settings-grid">
        <!-- Profile Section -->
        <div class="settings-section card animate-fade-in-up" style="animation-delay: 80ms">
          <div class="settings-section-header">
            <div class="settings-section-icon">👤</div>
            <div>
              <div class="settings-section-title">Profile</div>
              <div class="settings-section-desc">Your identity</div>
            </div>
          </div>
          <div class="settings-fields">
            <div class="input-group">
              <label class="input-label">Display Name / Initials</label>
              <input type="text" id="setting-username" class="input" value="${escapeAttr(settings.userName)}" placeholder="MD" />
            </div>
            <div class="input-group">
              <label class="input-label">Workspace Name</label>
              <input type="text" id="setting-company" class="input" value="${escapeAttr(settings.companyName)}" placeholder="Your Workspace" />
            </div>
            <div class="input-group">
              <label class="input-label">Business Type</label>
              <select id="setting-biz-type" class="select" style="width: 100%">
                <option value="general" ${(settings.businessType || 'general') === 'general' ? 'selected' : ''}>General</option>
                <option value="dental" ${settings.businessType === 'dental' ? 'selected' : ''}>🦷 Dental</option>
                <option value="barber" ${settings.businessType === 'barber' ? 'selected' : ''}>💈 Barber / Salon</option>
                <option value="restaurant" ${settings.businessType === 'restaurant' ? 'selected' : ''}>🍽️ Restaurant</option>
                <option value="consulting" ${settings.businessType === 'consulting' ? 'selected' : ''}>💼 Consulting</option>
                <option value="fitness" ${settings.businessType === 'fitness' ? 'selected' : ''}>🏋️ Fitness</option>
              </select>
              <div class="input-hint">Changes booking types and labels on the scheduling page.</div>
            </div>
          </div>
        </div>

        <!-- AI / LLM Section -->
        <div class="settings-section card animate-fade-in-up" style="animation-delay: 160ms">
          <div class="settings-section-header">
            <div class="settings-section-icon">⚡</div>
            <div>
              <div class="settings-section-title">AI Core</div>
              <div class="settings-section-desc">Choose your AI backend — cloud or local</div>
            </div>
            <div class="llm-status-indicator ${isLLMReady() ? 'connected' : 'disconnected'}">
              <div class="status-dot ${isLLMReady() ? 'online' : 'offline'}"></div>
              <span>${getProviderDisplayName()}</span>
            </div>
          </div>
          <div class="settings-fields">
            <!-- Provider Selector -->
            <div class="input-group">
              <label class="input-label">Provider</label>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); margin-top: var(--space-2);">
                <label class="provider-option" style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-3); border-radius: var(--radius-md); border: 2px solid ${currentProvider === 'gemini' ? 'var(--accent-primary)' : 'var(--border-subtle)'}; background: ${currentProvider === 'gemini' ? 'rgba(var(--accent-primary-rgb), 0.08)' : 'var(--bg-secondary)'}; cursor: pointer; transition: all var(--duration-fast) ease;">
                  <input type="radio" name="llm-provider" value="gemini" ${currentProvider === 'gemini' ? 'checked' : ''} style="accent-color: var(--accent-primary);" />
                  <div>
                    <div style="font-size: var(--text-sm); font-weight: var(--weight-semibold);">☁️ Gemini</div>
                    <div style="font-size: var(--text-xs); color: var(--text-muted);">Cloud API</div>
                  </div>
                </label>
                <label class="provider-option" style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-3); border-radius: var(--radius-md); border: 2px solid ${currentProvider === 'ollama' ? 'var(--accent-primary)' : 'var(--border-subtle)'}; background: ${currentProvider === 'ollama' ? 'rgba(var(--accent-primary-rgb), 0.08)' : 'var(--bg-secondary)'}; cursor: pointer; transition: all var(--duration-fast) ease;">
                  <input type="radio" name="llm-provider" value="ollama" ${currentProvider === 'ollama' ? 'checked' : ''} style="accent-color: var(--accent-primary);" />
                  <div>
                    <div style="font-size: var(--text-sm); font-weight: var(--weight-semibold);">🖥️ Ollama</div>
                    <div style="font-size: var(--text-xs); color: var(--text-muted);">Local / MLX</div>
                  </div>
                </label>
                <label class="provider-option" style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-3); border-radius: var(--radius-md); border: 2px solid ${currentProvider === 'fallback' ? 'var(--accent-primary)' : 'var(--border-subtle)'}; background: ${currentProvider === 'fallback' ? 'rgba(var(--accent-primary-rgb), 0.08)' : 'var(--bg-secondary)'}; cursor: pointer; transition: all var(--duration-fast) ease;">
                  <input type="radio" name="llm-provider" value="fallback" ${currentProvider === 'fallback' ? 'checked' : ''} style="accent-color: var(--accent-primary);" />
                  <div>
                    <div style="font-size: var(--text-sm); font-weight: var(--weight-semibold);">🤖 Built-in</div>
                    <div style="font-size: var(--text-xs); color: var(--text-muted);">No setup</div>
                  </div>
                </label>
              </div>
            </div>

            <!-- Gemini Fields (shown when gemini selected) -->
            <div id="gemini-fields" style="display: ${currentProvider === 'gemini' ? 'block' : 'none'};">
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
            </div>

            <!-- Ollama Fields (shown when ollama selected) -->
            <div id="ollama-fields" style="display: ${currentProvider === 'ollama' ? 'block' : 'none'};">
              <div class="input-group">
                <label class="input-label">Ollama Server URL</label>
                <input type="text" id="setting-ollama-url" class="input" 
                  value="${escapeAttr(settings.ollamaBaseUrl || '/ollama')}" 
                  placeholder="/ollama" />
                <div class="input-hint">Default: <code>/ollama</code> (proxied to localhost:11434). Change if Ollama runs on another machine.</div>
              </div>
              <div class="input-group">
                <label class="input-label">Model</label>
                <select id="setting-ollama-model" class="select" style="width: 100%">
                  <option value="">Detecting models...</option>
                </select>
                <div class="input-hint">Install models with <code>ollama pull mistral</code> or <code>ollama pull llama3</code></div>
              </div>
            </div>

            <!-- Fallback info -->
            <div id="fallback-fields" style="display: ${currentProvider === 'fallback' ? 'block' : 'none'};">
              <div style="padding: var(--space-4); background: var(--bg-secondary); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); font-size: var(--text-sm); color: var(--text-secondary);">
                ⚡ J.A.R.V.I.S. is operating with built-in intelligence. Responses are pre-generated but still useful. Connect Gemini or Ollama for live, context-aware AI.
              </div>
            </div>
          </div>
          <div class="settings-action-row">
            <button class="btn btn-primary btn-sm" id="test-llm-btn">⚡ Test Connection</button>
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

        <!-- Demo Mode Section -->
        <div class="settings-section card animate-fade-in-up" style="animation-delay: 360ms">
          <div class="settings-section-header">
            <div class="settings-section-icon">🎭</div>
            <div>
              <div class="settings-section-title">Demo Mode</div>
              <div class="settings-section-desc">Switch between sample data and your real workspace</div>
            </div>
          </div>
          <div class="settings-fields">
            <div class="settings-toggle-row">
              <div>
                <div class="settings-toggle-label">Demo Data</div>
                <div class="settings-toggle-desc">Load rich sample data for exploring features. Your real data will be preserved when switching back.</div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="setting-demo-mode" ${dataStore.isDemoMode() ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>
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
    if (input) input.type = input.type === 'password' ? 'text' : 'password';
  });

  // Provider radio buttons
  document.querySelectorAll('input[name="llm-provider"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const provider = e.target.value;
      // Show/hide conditional fields
      const geminiFields = document.getElementById('gemini-fields');
      const ollamaFields = document.getElementById('ollama-fields');
      const fallbackFields = document.getElementById('fallback-fields');
      if (geminiFields) geminiFields.style.display = provider === 'gemini' ? 'block' : 'none';
      if (ollamaFields) ollamaFields.style.display = provider === 'ollama' ? 'block' : 'none';
      if (fallbackFields) fallbackFields.style.display = provider === 'fallback' ? 'block' : 'none';

      // Update border styling on labels
      document.querySelectorAll('.provider-option').forEach(opt => {
        const radio = opt.querySelector('input[type="radio"]');
        const isSelected = radio?.value === provider;
        opt.style.borderColor = isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)';
        opt.style.background = isSelected ? 'rgba(var(--accent-primary-rgb), 0.08)' : 'var(--bg-secondary)';
      });

      // If Ollama selected, detect models
      if (provider === 'ollama') {
        populateOllamaModels();
      }
    });
  });

  // Auto-detect Ollama models if ollama is current provider
  if (getProvider() === 'ollama') {
    populateOllamaModels();
  }

  // Test connection (provider-aware)
  document.getElementById('test-llm-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('test-llm-btn');
    const selectedProvider = document.querySelector('input[name="llm-provider"]:checked')?.value || 'fallback';
    btn.disabled = true;
    btn.textContent = '⏳ Testing...';

    try {
      if (selectedProvider === 'gemini') {
        const apiKey = document.getElementById('setting-api-key')?.value.trim();
        if (!apiKey) {
          showToast('Enter an API key first', 'warning');
          btn.disabled = false;
          btn.textContent = '⚡ Test Connection';
          return;
        }
        const client = await initLLM(apiKey);
        if (client) {
          dataStore.updateSettings({ llmApiKey: apiKey, llmProvider: 'gemini' });
          setProvider('gemini');
          updateLLMStatusUI(true);
          showToast('⚡ Gemini connected — cloud AI online', 'success');
        } else {
          showToast('Failed to connect. Check your API key.', 'error');
          updateLLMStatusUI(false);
        }
      } else if (selectedProvider === 'ollama') {
        const baseUrl = document.getElementById('setting-ollama-url')?.value.trim() || '/ollama';
        const model = document.getElementById('setting-ollama-model')?.value;
        if (!model) {
          showToast('No model selected — install one with: ollama pull mistral', 'warning');
          btn.disabled = false;
          btn.textContent = '⚡ Test Connection';
          return;
        }
        const result = await initOllama(baseUrl, model);
        if (result) {
          dataStore.updateSettings({ llmProvider: 'ollama', ollamaModel: result.model, ollamaBaseUrl: baseUrl });
          setProvider('ollama');
          updateLLMStatusUI(true);
          showToast(`⚡ Ollama connected — ${result.model} online`, 'success');
        } else {
          showToast('Cannot reach Ollama. Is it running? (ollama serve)', 'error');
          updateLLMStatusUI(false);
        }
      } else {
        setProvider('fallback');
        dataStore.updateSettings({ llmProvider: 'fallback' });
        updateLLMStatusUI(false);
        showToast('⚡ Using built-in intelligence', 'info');
      }
    } catch (err) {
      showToast(`Connection error: ${err.message}`, 'error');
      updateLLMStatusUI(false);
    }
    btn.disabled = false;
    btn.textContent = '⚡ Test Connection';
  });

  // Save settings
  document.getElementById('save-settings-btn')?.addEventListener('click', async () => {
    const userName = document.getElementById('setting-username').value.trim();
    const companyName = document.getElementById('setting-company').value.trim();
    const apiKey = document.getElementById('setting-api-key')?.value.trim() || '';
    const autonomousMode = document.getElementById('setting-autonomous').checked;
    const businessType = document.getElementById('setting-biz-type')?.value || 'general';
    const selectedProvider = document.querySelector('input[name="llm-provider"]:checked')?.value || 'fallback';
    const ollamaUrl = document.getElementById('setting-ollama-url')?.value.trim() || '/ollama';
    const ollamaModelVal = document.getElementById('setting-ollama-model')?.value || '';

    dataStore.updateSettings({
      userName, companyName, llmApiKey: apiKey, autonomousMode, businessType,
      llmProvider: selectedProvider, ollamaModel: ollamaModelVal, ollamaBaseUrl: ollamaUrl
    });

    // Init selected provider
    if (selectedProvider === 'gemini' && apiKey) {
      const client = await initLLM(apiKey);
      setProvider(client ? 'gemini' : 'fallback');
      updateLLMStatusUI(!!client);
    } else if (selectedProvider === 'ollama') {
      setOllamaConfig(ollamaUrl, ollamaModelVal);
      const result = await initOllama(ollamaUrl, ollamaModelVal);
      setProvider(result ? 'ollama' : 'fallback');
      updateLLMStatusUI(!!result);
    } else {
      setProvider('fallback');
    }

    // Update user avatar
    if (typeof window.updateUserAvatar === 'function') {
      window.updateUserAvatar();
    } else {
      const avatarEl = document.getElementById('user-initials');
      if (avatarEl) {
        const parts = userName.trim().split(/\s+/);
        avatarEl.textContent = parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : userName.slice(0, 2).toUpperCase();
      }
    }

    // Update sidebar LLM status
    if (typeof window.updateSidebarLLMStatus === 'function') {
      window.updateSidebarLLMStatus(selectedProvider !== 'fallback');
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

  // Demo mode toggle
  document.getElementById('setting-demo-mode')?.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    if (enabled) {
      dataStore.enableDemoMode();
      showToast('🎭 Demo mode enabled — sample data loaded', 'info');
    } else {
      dataStore.disableDemoMode();
      showToast('🚀 Demo mode disabled — clean workspace loaded', 'info');
    }
    renderSettings(document.getElementById('view-container'));
  });
}

function updateLLMStatusUI(connected) {
  const indicator = document.querySelector('.llm-status-indicator');
  if (indicator) {
    indicator.className = `llm-status-indicator ${connected ? 'connected' : 'disconnected'}`;
    const dot = indicator.querySelector('.status-dot');
    if (dot) dot.className = `status-dot ${connected ? 'online' : 'offline'}`;
    const span = indicator.querySelector('span');
    if (span) span.textContent = getProviderDisplayName();
  }
  // Update sidebar status
  if (typeof window.updateSidebarLLMStatus === 'function') {
    window.updateSidebarLLMStatus(connected);
  }
}

async function populateOllamaModels() {
  const select = document.getElementById('setting-ollama-model');
  if (!select) return;

  const baseUrl = document.getElementById('setting-ollama-url')?.value.trim() || '/ollama';
  const savedModel = dataStore.getSettings().ollamaModel || '';

  select.innerHTML = '<option value="">🔍 Detecting...</option>';

  const models = await detectOllama(baseUrl);
  if (!models || models.length === 0) {
    select.innerHTML = '<option value="">❌ No models found — run: ollama pull mistral</option>';
    return;
  }

  select.innerHTML = models.map(m => {
    const size = m.paramSize || '';
    const quant = m.quantization ? ` (${m.quantization})` : '';
    const label = `${m.name}${size ? ' — ' + size : ''}${quant}`;
    const selected = m.name === savedModel ? 'selected' : '';
    return `<option value="${m.name}" ${selected}>${label}</option>`;
  }).join('');
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
