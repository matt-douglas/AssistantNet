// AssistantNet — Team / Contacts Module
import { dataStore } from '../../services/data.js';
import { showToast } from '../../main.js';
import { escapeHtml, escapeAttr } from '../../services/utils.js';
import './contacts.css';

let searchQuery = '';
let activeDept = 'all';

const AVATAR_COLORS = [
  '#6366f1', '#06b6d4', '#8b5cf6', '#ec4899', '#22c55e',
  '#f59e0b', '#ef4444', '#14b8a6', '#f97316', '#3b82f6'
];

function getColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getContacts() {
  // Auto-build contacts from emails and meetings
  const emails = dataStore.getEmails();
  const meetings = dataStore.getMeetings();

  const contactMap = new Map();

  // Static contacts with full details
  const staticContacts = [
    { name: 'Sarah Chen', email: 'sarah.chen@meridiangroup.com', role: 'VP Finance', company: 'Meridian Group', dept: 'finance', interactions: 14, lastContact: '2 hours ago' },
    { name: 'Marcus Webb', email: 'marcus@techvault.io', role: 'VP Partnerships', company: 'TechVault', dept: 'partnerships', interactions: 6, lastContact: 'Today' },
    { name: 'Linda Park', email: 'linda.park@hr.internal', role: 'HR Director', company: 'Internal', dept: 'hr', interactions: 8, lastContact: 'Today' },
    { name: 'David Kim', email: 'david.kim@legal.internal', role: 'General Counsel', company: 'Internal', dept: 'legal', interactions: 11, lastContact: 'Yesterday' },
    { name: 'Emma Rodriguez', email: 'emma.r@marketing.internal', role: 'Marketing Lead', company: 'Internal', dept: 'marketing', interactions: 9, lastContact: 'Yesterday' },
    { name: 'Jason Blackwell', email: 'jason.b@client-services.internal', role: 'Director, Client Services', company: 'Internal', dept: 'clients', interactions: 7, lastContact: 'Yesterday' },
    { name: 'Alex Rivera', email: 'alex.r@engineering.internal', role: 'Senior Engineer', company: 'Internal', dept: 'engineering', interactions: 3, lastContact: '2 days ago' },
    { name: 'Jordan Mills', email: 'jordan.m@design.internal', role: 'Product Designer', company: 'Internal', dept: 'design', interactions: 2, lastContact: '3 days ago' },
    { name: 'Priya Sharma', email: 'priya.s@revops.internal', role: 'Data Analyst', company: 'Internal', dept: 'finance', interactions: 4, lastContact: '3 days ago' },
    { name: 'Tom Hendricks', email: 'tom.h@sales.internal', role: 'Account Executive', company: 'Internal', dept: 'sales', interactions: 5, lastContact: '4 days ago' },
    { name: 'Chris Yang', email: 'chris.y@platform.internal', role: 'CTO', company: 'Internal', dept: 'engineering', interactions: 18, lastContact: 'Today' },
    { name: 'Rachel Foster', email: 'rachel.f@product.internal', role: 'Product Manager', company: 'Internal', dept: 'product', interactions: 12, lastContact: '1 day ago' },
  ];

  staticContacts.forEach(c => contactMap.set(c.email, c));

  return Array.from(contactMap.values());
}

function getFilteredContacts() {
  let contacts = getContacts();
  if (activeDept !== 'all') {
    contacts = contacts.filter(c => c.dept === activeDept);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    contacts = contacts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  }
  return contacts;
}

export function renderContacts(container) {
  const contacts = getFilteredContacts();
  const allContacts = getContacts();
  const departments = [...new Set(allContacts.map(c => c.dept))];
  const internal = allContacts.filter(c => c.company === 'Internal').length;
  const external = allContacts.length - internal;

  container.innerHTML = `
    <div class="contacts-view">
      <div class="contacts-header animate-fade-in">
        <h1>👥 Team & Contacts</h1>
      </div>

      <div class="contacts-stats animate-fade-in">
        <div class="contacts-stat">
          <span class="contacts-stat-value">${allContacts.length}</span> Total Contacts
        </div>
        <div class="contacts-stat">
          <span class="contacts-stat-value">${internal}</span> Internal
        </div>
        <div class="contacts-stat">
          <span class="contacts-stat-value">${external}</span> External
        </div>
      </div>

      <div class="contacts-toolbar animate-fade-in">
        <div class="contacts-search">
          <svg viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          <input type="text" id="contact-search" placeholder="Search people..." value="${escapeAttr(searchQuery)}" />
        </div>
        <div style="display: flex; gap: var(--space-2); flex-wrap: wrap">
          <button class="chip ${activeDept === 'all' ? 'active' : ''}" data-dept="all">All</button>
          ${departments.map(d => `
            <button class="chip ${activeDept === d ? 'active' : ''}" data-dept="${d}">${d.charAt(0).toUpperCase() + d.slice(1)}</button>
          `).join('')}
        </div>
      </div>

      <div class="contacts-grid">
        ${contacts.map((c, i) => renderContactCard(c, i)).join('')}
      </div>
    </div>
  `;

  bindContactEvents(container);
}

function renderContactCard(contact, index) {
  return `
    <div class="contact-card animate-fade-in-up" style="animation-delay: ${index * 40}ms" data-email="${escapeAttr(contact.email)}">
      <div class="contact-card-head">
        <div class="contact-avatar" style="background: ${getColor(contact.name)}">${getInitials(contact.name)}</div>
        <div class="contact-info">
          <div class="contact-name">${escapeHtml(contact.name)}</div>
          <div class="contact-role">${escapeHtml(contact.role)}</div>
          <div class="contact-company">${escapeHtml(contact.company)}</div>
        </div>
      </div>
      <div class="contact-meta">
        <span class="tag">${contact.dept}</span>
        ${contact.company !== 'Internal' ? '<span class="badge badge-info" style="font-size: 9px">External</span>' : ''}
      </div>
      <div class="contact-detail-row">
        <svg viewBox="0 0 16 16" fill="none"><path d="M3 5l5 3.5L13 5" stroke="currentColor" stroke-width="1.2"/><rect x="2" y="3.5" width="12" height="9" rx="1.5" stroke="currentColor" stroke-width="1.2"/></svg>
        <span>${escapeHtml(contact.email)}</span>
      </div>
      <div class="contact-detail-row">
        <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.2"/><path d="M8 4v4l2.5 2.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
        <span>Last contact: ${contact.lastContact}</span>
      </div>
      <div class="contact-detail-row">
        <svg viewBox="0 0 16 16" fill="none"><path d="M2 13V3h12v10H2z" stroke="currentColor" stroke-width="1.2"/><path d="M5 1v4M11 1v4M2 6h12" stroke="currentColor" stroke-width="1.2"/></svg>
        <span>${contact.interactions} interactions</span>
      </div>
      <div class="contact-actions">
        <button class="btn btn-ghost btn-sm contact-action-email" data-name="${escapeAttr(contact.name)}">📧 Email</button>
        <button class="btn btn-ghost btn-sm contact-action-meeting" data-name="${escapeAttr(contact.name)}">📅 Meet</button>
        <button class="btn btn-ghost btn-sm contact-action-task" data-name="${escapeAttr(contact.name)}">✅ Task</button>
      </div>
    </div>
  `;
}

function bindContactEvents(container) {
  // Search
  const searchInput = document.getElementById('contact-search');
  if (searchInput) {
    let debounce;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        searchQuery = e.target.value;
        renderContacts(container);
      }, 300);
    });
  }

  // Department filter
  document.querySelectorAll('.contacts-toolbar .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      activeDept = chip.dataset.dept;
      renderContacts(container);
    });
  });

  // Contact card click → detail modal
  document.querySelectorAll('.contact-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.contact-actions')) return;
      const email = card.dataset.email;
      const contact = getContacts().find(c => c.email === email);
      if (contact) showContactDetail(contact);
    });
  });

  // Quick actions
  document.querySelectorAll('.contact-action-email').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showToast(`Opening compose for ${btn.dataset.name}...`, 'info');
    });
  });

  document.querySelectorAll('.contact-action-meeting').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = btn.dataset.name;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dataStore.addMeeting({
        title: `Meeting with ${name}`,
        date: tomorrow.toISOString().split('T')[0],
        startTime: '14:00',
        endTime: '15:00',
        location: 'Zoom',
        category: 'external',
        attendees: [name]
      });
      showToast(`Meeting scheduled with ${name}`, 'success');
    });
  });

  document.querySelectorAll('.contact-action-task').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = btn.dataset.name;
      dataStore.addTask({
        title: `Follow up with ${name}`,
        status: 'todo',
        priority: 'medium',
        assignee: 'You',
        dueDate: 'This week',
        tags: ['follow-up'],
        subtasks: []
      });
      showToast(`Task created for ${name}`, 'success');
    });
  });
}

function showContactDetail(contact) {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('hidden');

  // Build interaction timeline from emails
  const emails = dataStore.getEmails().filter(e => e.from === contact.name || e.email === contact.email);
  const meetings = dataStore.getMeetings().filter(m => (m.attendees || []).some(a => a.includes(contact.name.split(' ')[0])));

  const timeline = [
    ...emails.map(e => ({ icon: '📧', text: e.subject, time: e.time, type: 'email' })),
    ...meetings.map(m => ({ icon: '📅', text: m.title, time: `${m.date} ${m.startTime}`, type: 'meeting' })),
  ].slice(0, 6);

  overlay.innerHTML = `
    <div class="modal" style="animation: scaleIn 0.2s var(--ease-spring); max-width: 540px; max-height: 80vh; overflow-y: auto">
      <div style="display: flex; justify-content: flex-end">
        <button class="btn btn-ghost btn-sm" id="close-contact-detail">✕</button>
      </div>
      <div class="contact-detail-header">
        <div class="contact-detail-avatar" style="background: ${getColor(contact.name)}">${getInitials(contact.name)}</div>
        <div class="contact-detail-info">
          <h2>${escapeHtml(contact.name)}</h2>
          <div style="color: var(--text-secondary); font-size: var(--text-sm)">${escapeHtml(contact.role)}</div>
          <div style="color: var(--accent-primary); font-size: var(--text-sm)">${escapeHtml(contact.company)}</div>
        </div>
      </div>
      <div style="display: flex; gap: var(--space-3); margin-bottom: var(--space-4); flex-wrap: wrap">
        <span class="tag">${contact.dept}</span>
        <span class="badge badge-info">${contact.interactions} interactions</span>
        <span style="font-size: var(--text-xs); color: var(--text-muted)">Last: ${contact.lastContact}</span>
      </div>
      <div style="padding: var(--space-3); background: var(--bg-secondary); border-radius: var(--radius-md); font-size: var(--text-sm); margin-bottom: var(--space-4)">
        📧 ${escapeHtml(contact.email)}
      </div>

      ${timeline.length > 0 ? `
        <div class="contact-timeline">
          <div class="timeline-title">Recent Interactions</div>
          ${timeline.map(t => `
            <div class="timeline-item">
              <div class="timeline-icon">${t.icon}</div>
              <div class="timeline-content">
                <div class="timeline-text">${escapeHtml(t.text)}</div>
                <div class="timeline-time">${t.time}</div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="empty-state" style="padding: var(--space-6)">
          <div class="empty-state-title">No recent interactions</div>
        </div>
      `}

      <div style="display: flex; gap: var(--space-3); justify-content: flex-end; margin-top: var(--space-4); padding-top: var(--space-3); border-top: 1px solid var(--border-subtle)">
        <button class="btn btn-ghost" id="close-contact-btn">Close</button>
        <button class="btn btn-primary btn-sm" id="contact-quick-email">📧 Send Email</button>
      </div>
    </div>
  `;

  const close = () => { overlay.classList.add('hidden'); overlay.innerHTML = ''; };
  document.getElementById('close-contact-detail')?.addEventListener('click', close);
  document.getElementById('close-contact-btn')?.addEventListener('click', close);
  document.getElementById('contact-quick-email')?.addEventListener('click', () => {
    showToast(`Opening compose for ${contact.name}...`, 'info');
    close();
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

export function destroyContacts() {
  searchQuery = '';
  activeDept = 'all';
}
