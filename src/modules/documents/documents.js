// AssistantNet — Document Hub Module
import { dataStore } from '../../services/data.js';
import { quickAction, isLLMReady } from '../../services/llm.js';
import { showToast } from '../../main.js';
import { escapeHtml } from '../../services/utils.js';
import './documents.css';

let searchQuery = '';
let activeCategory = 'all';

const DOC_ICONS = {
  spreadsheet: '📊',
  document: '📝',
  presentation: '📑',
  pdf: '📄',
  image: '🖼️'
};

const TEMPLATES = [
  { icon: '📋', name: 'Meeting Notes', desc: 'Structured meeting minutes template' },
  { icon: '📊', name: 'Weekly Report', desc: 'Team performance weekly update' },
  { icon: '📧', name: 'Email Template', desc: 'Professional email frameworks' },
  { icon: '📑', name: 'Project Brief', desc: 'New project kickoff document' },
  { icon: '📈', name: 'Business Case', desc: 'ROI analysis & proposal' },
  { icon: '✅', name: 'Decision Log', desc: 'Track key decisions & rationale' },
];

export function renderDocuments(container) {
  const documents = getFilteredDocuments();
  const categories = [...new Set(dataStore.getDocuments().map(d => d.category))];

  container.innerHTML = `
    <div class="documents-view">
      <div class="documents-header animate-fade-in">
        <h1>📄 Document Hub</h1>
        <button class="btn btn-primary btn-sm" id="upload-btn">📁 Upload Document</button>
      </div>

      <div class="documents-toolbar animate-fade-in">
        <div class="documents-search">
          <svg viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          <input type="text" id="doc-search" placeholder="Search documents with AI..." value="${searchQuery}" />
        </div>
        <div class="documents-filter-chips">
          <button class="chip ${activeCategory === 'all' ? 'active' : ''}" data-cat="all">All</button>
          ${categories.map(c => `
            <button class="chip ${activeCategory === c ? 'active' : ''}" data-cat="${c}">${c.charAt(0).toUpperCase() + c.slice(1)}</button>
          `).join('')}
        </div>
      </div>

      <div class="upload-area" id="upload-area">
        <div class="upload-icon">📁</div>
        <div class="upload-text">Drag & drop files here, or click to browse</div>
        <div class="upload-hint">Supports PDF, DOC, XLS, PPT, and images</div>
      </div>

      <div class="section-header">
        <div>
          <div class="section-title">Documents</div>
          <div class="section-subtitle">${documents.length} files</div>
        </div>
      </div>

      <div class="document-grid">
        ${documents.map(renderDocumentCard).join('')}
      </div>

      <div class="templates-section">
        <div class="section-header">
          <div>
            <div class="section-title">📝 Templates</div>
            <div class="section-subtitle">Quick-start with AI-powered templates</div>
          </div>
        </div>
        <div class="template-grid">
          ${TEMPLATES.map(t => `
            <div class="template-card" data-template="${t.name}">
              <div class="template-icon">${t.icon}</div>
              <div class="template-name">${t.name}</div>
              <div class="template-desc">${t.desc}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  bindDocumentEvents(container);
}

function getFilteredDocuments() {
  let docs = dataStore.getDocuments();
  if (activeCategory !== 'all') {
    docs = docs.filter(d => d.category === activeCategory);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    docs = docs.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.owner.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q)
    );
  }
  return docs;
}

function renderDocumentCard(doc) {
  return `
    <div class="document-card" data-doc-id="${doc.id}">
      <div class="document-card-header">
        <div class="document-icon type-${doc.type}">
          ${DOC_ICONS[doc.type] || '📄'}
        </div>
        <div class="document-info">
          <div class="document-name">${doc.name}</div>
          <div class="document-meta">
            <span>${doc.size}</span>
            <span>·</span>
            <span>${doc.modified}</span>
          </div>
        </div>
      </div>
      <div class="document-card-footer">
        <div class="document-owner">
          <span>👤</span>
          <span>${doc.owner}</span>
        </div>
        <div class="document-actions">
          ${doc.shared ? '<span class="badge badge-info" style="font-size: 9px">Shared</span>' : ''}
          <button class="btn btn-ghost btn-sm doc-summarize" data-doc-name="${doc.name}" title="AI Summarize">🧠</button>
        </div>
      </div>
    </div>
  `;
}

function bindDocumentEvents(container) {
  // Search
  const searchInput = document.getElementById('doc-search');
  if (searchInput) {
    let debounce;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        searchQuery = e.target.value;
        renderDocuments(container);
      }, 300);
    });
  }

  // Category filters
  document.querySelectorAll('.documents-filter-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      activeCategory = chip.dataset.cat;
      renderDocuments(container);
    });
  });

  // Upload button — trigger hidden file input
  const uploadBtn = document.getElementById('upload-btn');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.multiple = true;
      fileInput.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp';
      fileInput.addEventListener('change', () => {
        processFileUpload(fileInput.files, container);
      });
      fileInput.click();
    });
  }

  // Upload area
  const uploadArea = document.getElementById('upload-area');
  if (uploadArea) {
    uploadArea.addEventListener('click', () => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.multiple = true;
      fileInput.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp';
      fileInput.addEventListener('change', () => {
        processFileUpload(fileInput.files, container);
      });
      fileInput.click();
    });
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = 'var(--accent-primary)';
      uploadArea.style.background = 'rgba(99, 102, 241, 0.05)';
    });
    uploadArea.addEventListener('dragleave', () => {
      uploadArea.style.borderColor = '';
      uploadArea.style.background = '';
    });
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = '';
      uploadArea.style.background = '';
      processFileUpload(e.dataTransfer.files, container);
    });
  }

  // AI Summarize buttons
  document.querySelectorAll('.doc-summarize').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const docName = btn.dataset.docName;
      showToast(`Summarizing "${docName}"...`, 'info');
      btn.disabled = true;
      if (isLLMReady()) {
        const summary = await quickAction('summarize', `Document: ${docName}`);
        showToast('Summary generated!', 'success');
        // Show summary in a modal
        const overlay = document.getElementById('modal-overlay');
        overlay.classList.remove('hidden');
        overlay.innerHTML = `
          <div class="modal" style="animation: scaleIn 0.2s var(--ease-spring); max-width: 540px; max-height: 80vh; overflow-y: auto">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4)">
              <h2>🧠 AI Summary</h2>
              <button class="btn btn-ghost btn-sm" id="close-doc-summary">✕</button>
            </div>
            <div style="font-size: var(--text-sm); color: var(--text-secondary); margin-bottom: var(--space-3)">${escapeHtml(docName)}</div>
            <div style="white-space: pre-wrap; font-size: var(--text-sm); padding: var(--space-4); background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-subtle)">${escapeHtml(summary)}</div>
            <div style="display: flex; gap: var(--space-3); justify-content: flex-end; margin-top: var(--space-4)">
              <button class="btn btn-ghost" id="close-doc-summary-btn">Close</button>
            </div>
          </div>
        `;
        const close = () => { overlay.classList.add('hidden'); overlay.innerHTML = ''; };
        document.getElementById('close-doc-summary')?.addEventListener('click', close);
        document.getElementById('close-doc-summary-btn')?.addEventListener('click', close);
        overlay.addEventListener('click', (ev) => { if (ev.target === overlay) close(); });
      } else {
        showToast('Document summarization requires an LLM connection. Add your API key in Settings.', 'warning');
      }
      btn.disabled = false;
    });
  });

  // Templates — create real documents
  document.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('click', () => {
      const templateName = card.dataset.template;
      dataStore.addDocument({
        name: templateName,
        type: 'document',
        category: 'templates',
        size: '12 KB',
        owner: 'You',
        modified: 'Just now',
        shared: false
      });
      showToast(`"${templateName}" template created!`, 'success');
      renderDocuments(container);
    });
  });
}

function processFileUpload(files, container) {
  if (!files || files.length === 0) return;
  for (const file of files) {
    const sizeStr = file.size > 1024 * 1024
      ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
      : (file.size / 1024).toFixed(1) + ' KB';
    dataStore.addDocument({
      name: file.name,
      type: file.type.includes('pdf') ? 'pdf' : file.type.includes('image') ? 'image' : 'document',
      category: 'general',
      size: sizeStr,
      owner: 'You',
      modified: 'Just now',
      shared: false
    });
  }
  showToast(`${files.length} document${files.length > 1 ? 's' : ''} uploaded!`, 'success');
  renderDocuments(container);
}

export function destroyDocuments() {}

