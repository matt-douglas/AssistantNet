// AssistantNet — Document Hub Module
import { dataStore } from '../../services/data.js';
import { showToast } from '../../main.js';
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

  // Upload area
  const uploadArea = document.getElementById('upload-area');
  if (uploadArea) {
    uploadArea.addEventListener('click', () => {
      showToast('File browser would open here. Upload functionality coming soon!', 'info');
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
      showToast('Document uploaded!', 'success');
    });
  }

  // AI Summarize buttons
  document.querySelectorAll('.doc-summarize').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showToast(`Summarizing "${btn.dataset.docName}"...`, 'info');
      setTimeout(() => {
        showToast('Summary ready! Check AI Assistant for details.', 'success');
      }, 2000);
    });
  });

  // Templates
  document.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('click', () => {
      showToast(`Generating "${card.dataset.template}" template with AI...`, 'info');
      setTimeout(() => {
        showToast('Template generated!', 'success');
      }, 1500);
    });
  });
}

export function destroyDocuments() {}
