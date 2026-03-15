// J.A.R.V.I.S. — Dashboard Module (Command Center)
import { dataStore } from '../../services/data.js';
import { quickAction, isLLMReady } from '../../services/llm.js';
import { escapeHtml } from '../../services/utils.js';
import { showToast } from '../../main.js';
import './dashboard.css';

let charts = {};

export function renderDashboard(container) {
  const kpis = dataStore.getKPIs();
  const activities = dataStore.getActivityLog();
  const meetings = dataStore.getMeetings();
  const settings = dataStore.getSettings();
  const today = new Date().toISOString().split('T')[0];
  const todayMeetings = meetings.filter(m => m.date === today);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const userName = settings.userName || 'there';
  const showChecklist = !localStorage.getItem('jarvis_checklist_dismissed');

  // Calculate checklist progress
  const checklistItems = [
    { id: 'personalize', label: 'Personalize your workspace', done: settings.userName && settings.userName !== 'MD', icon: '🏢', action: 'settings' },
    { id: 'scheduling', label: 'Set up client scheduling', done: (dataStore.data.bookings || []).length > 0, icon: '📅', action: 'scheduling' },
    { id: 'inbox', label: 'Check your Smart Inbox', done: dataStore.getEmails().some(e => e.read), icon: '📧', action: 'inbox' },
    { id: 'task', label: 'Create or complete a task', done: dataStore.getTasks().some(t => t.status === 'done'), icon: '✅', action: 'tasks' },
    { id: 'calendar', label: 'Review your calendar', done: localStorage.getItem('jarvis_viewed_calendar'), icon: '📆', action: 'calendar' },
  ];
  const completedCount = checklistItems.filter(i => i.done).length;
  const progressPct = Math.round((completedCount / checklistItems.length) * 100);

  container.innerHTML = `
    <div class="dashboard">
      <div class="dashboard-greeting animate-fade-in-up">
        <h1>${greeting}, ${escapeHtml(userName)}</h1>
        <p>Here's your status update for ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.</p>
      </div>

      ${showChecklist ? `
      <div class="card animate-fade-in-up getting-started-card" style="animation-delay: 50ms; border-color: rgba(var(--accent-primary-rgb), 0.15); background: linear-gradient(135deg, var(--bg-glass), rgba(var(--accent-primary-rgb), 0.03));">
        <div class="card-header" style="margin-bottom: var(--space-3);">
          <div style="flex: 1;">
            <div class="card-title" style="display: flex; align-items: center; gap: var(--space-2);">🚀 Getting Started</div>
            <div class="card-subtitle">${completedCount}/${checklistItems.length} complete — ${progressPct === 100 ? 'All done! 🎉' : "you're making progress!"}</div>
          </div>
          <button class="btn btn-ghost btn-sm" id="dismiss-checklist" style="font-size: var(--text-xs);">Dismiss ✕</button>
        </div>
        <div style="background: var(--bg-tertiary); border-radius: var(--radius-full); height: 6px; margin-bottom: var(--space-4); overflow: hidden;">
          <div style="height: 100%; width: ${progressPct}%; background: var(--accent-gradient); border-radius: var(--radius-full); transition: width 0.5s var(--ease-out);"></div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--space-3);">
          ${checklistItems.map(item => `
            <div class="checklist-step ${item.done ? 'done' : ''}" data-action="${item.action}" style="text-align: center; padding: var(--space-3); border-radius: var(--radius-md); cursor: pointer; transition: all var(--duration-fast) ease; background: ${item.done ? 'rgba(34, 197, 94, 0.08)' : 'var(--bg-secondary)'}; border: 1px solid ${item.done ? 'rgba(34, 197, 94, 0.2)' : 'var(--border-subtle)'};">
              <div style="font-size: 1.3rem; margin-bottom: var(--space-1);">${item.done ? '✅' : item.icon}</div>
              <div style="font-size: 11px; color: ${item.done ? 'var(--color-success)' : 'var(--text-secondary)'}; line-height: 1.3;">${item.label}</div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <div class="kpi-grid">
        ${renderBusinessKPIs(kpis, settings)}
      </div>

      <div class="dashboard-grid">
        <div class="card animate-fade-in-up" style="animation-delay: 200ms">
          <div class="card-header">
            <div>
              <div class="card-title">${({dental:'Weekly Appointments',barber:'Weekly Bookings',restaurant:'Weekly Reservations',fitness:'Weekly Sessions'})[settings.businessType] || 'Weekly Task Throughput'}</div>
              <div class="card-subtitle">Completed vs Created</div>
            </div>
          </div>
          <div class="chart-container" id="chart-tasks"></div>
        </div>

        <div class="card animate-fade-in-up" style="animation-delay: 250ms">
          <div class="card-header">
            <div>
              <div class="card-title">${({dental:'Patient Volume',barber:'Client Volume',restaurant:'Reservation Trend',fitness:'Membership Trend'})[settings.businessType] || 'Revenue Trend'}</div>
              <div class="card-subtitle">Last 6 Months</div>
            </div>
          </div>
          <div class="chart-container" id="chart-revenue"></div>
        </div>

        <div class="card animate-fade-in-up" style="animation-delay: 300ms">
          <div class="card-header">
            <div>
              <div class="card-title">Today's Agenda</div>
              <div class="card-subtitle">${todayMeetings.length} meetings scheduled</div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="window.location.hash='#/calendar'">View All</button>
          </div>
          <div class="agenda-list">
            ${todayMeetings.length > 0 ? todayMeetings
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map(m => `
                <div class="agenda-item category-${m.category}">
                  <span class="agenda-time">${m.startTime} - ${m.endTime}</span>
                  <span class="agenda-title">${m.title}</span>
                  <span class="agenda-location">${m.location}</span>
                </div>
              `).join('') : `
                <div class="empty-state" style="padding: var(--space-8)">
                  <div class="empty-state-icon">📅</div>
                  <div class="empty-state-title">No meetings today</div>
                  <div class="empty-state-text">Your calendar is clear — perfect for deep work!</div>
                </div>
              `}
          </div>
        </div>

        <div class="card animate-fade-in-up" style="animation-delay: 350ms">
          <div class="card-header">
            <div>
              <div class="card-title">AI Activity Feed</div>
              <div class="card-subtitle">Autonomous actions taken</div>
            </div>
            <span class="status-pill"><span class="status-dot online"></span>Live</span>
          </div>
          <div class="activity-feed">
            ${activities.slice(0, 6).map(a => `
              <div class="activity-item">
                <span class="activity-icon">${a.icon || '🔵'}</span>
                <div class="activity-content">
                  <div class="activity-text">${a.text || 'Activity logged'}</div>
                  <div class="activity-meta">
                    <span>${a.time || 'Recently'}</span>
                    <span class="activity-badge">${a.badge === 'auto' ? 'AUTO' : 'MANUAL'}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="card animate-fade-in-up" style="animation-delay: 400ms">
        <div class="card-header">
          <div>
            <div class="card-title">Quick Actions</div>
            <div class="card-subtitle">Jump to common tasks</div>
          </div>
        </div>
        <div class="quick-actions">
          ${(() => {
            const bt = settings.businessType || 'general';
            const bookLabel = ({dental:'📋 New Patient Appointment',barber:'✂️ New Client Booking',restaurant:'🍽️ New Reservation',fitness:'🏋️ New Session'})[bt];
            const rows = [];
            if (bookLabel) rows.push(`<button class="quick-action-btn" onclick="window.location.hash='#/scheduling'"><span class="icon">${bookLabel.split(' ')[0]}</span><span class="label">${bookLabel.slice(bookLabel.indexOf(' ') + 1)}</span></button>`);
            rows.push(`<button class="quick-action-btn" onclick="window.location.hash='#/assistant'"><span class="icon">🧠</span><span class="label">Ask AI Assistant</span></button>`);
            rows.push(`<button class="quick-action-btn" onclick="window.location.hash='#/inbox'"><span class="icon">📧</span><span class="label">Check Inbox</span></button>`);
            rows.push(`<button class="quick-action-btn" onclick="window.location.hash='#/calendar'"><span class="icon">📅</span><span class="label">${({dental:'Patient Schedule',barber:'Appointments',restaurant:'Reservations'})[bt] || "Today's Schedule"}</span></button>`);
            rows.push(`<button class="quick-action-btn" onclick="window.location.hash='#/contacts'"><span class="icon">👥</span><span class="label">${({dental:'Patient Directory',barber:'Client List',restaurant:'Guest Book'})[bt] || 'Contacts'}</span></button>`);
            rows.push(`<button class="quick-action-btn" id="qa-daily-brief"><span class="icon">📊</span><span class="label">Daily Briefing</span></button>`);
            return rows.join('');
          })()}
        </div>
      </div>
    </div>
  `;

  // Animate KPI counters
  animateKPICounters();

  // Initialize charts
  setTimeout(() => initCharts(), 100);

  // Wire Daily Briefing button
  document.getElementById('qa-daily-brief')?.addEventListener('click', () => openBriefingPanel());

  // Getting Started checklist
  document.getElementById('dismiss-checklist')?.addEventListener('click', () => {
    localStorage.setItem('jarvis_checklist_dismissed', '1');
    document.querySelector('.getting-started-card')?.remove();
  });
  container.querySelectorAll('.checklist-step').forEach(step => {
    step.addEventListener('click', () => {
      const action = step.dataset.action;
      if (action) window.location.hash = '#/' + action;
    });
  });
}

function renderBusinessKPIs(kpis, settings) {
  const bt = (settings.businessType || 'general').toLowerCase();
  const bookings = dataStore.data.bookings || [];
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter(b => b.date === today).length;
  const weekBookings = bookings.length;
  const presets = {
    dental: [
      { label: 'Patients Today', value: todayBookings || 3, change: 8.5 },
      { label: 'Appointments This Week', value: weekBookings || 18, change: 12.0 },
      { label: 'Pending Recalls', value: 7, change: -15.0 },
      { label: 'Patient Satisfaction', value: '96%', change: 2.3 },
    ],
    barber: [
      { label: 'Clients Today', value: todayBookings || 8, change: 5.2 },
      { label: 'Bookings This Week', value: weekBookings || 34, change: 10.0 },
      { label: 'Avg Ticket', value: '$42', change: 6.8 },
      { label: 'Return Rate', value: '78%', change: 3.1 },
    ],
    restaurant: [
      { label: 'Covers Tonight', value: todayBookings || 42, change: 12.5 },
      { label: 'Reservations This Week', value: weekBookings || 156, change: 8.3 },
      { label: 'Tables Open', value: 6, change: 0 },
      { label: 'Guest Rating', value: '4.7★', change: 1.2 },
    ],
    fitness: [
      { label: 'Sessions Today', value: todayBookings || 6, change: 10.0 },
      { label: 'Active Members', value: 124, change: 4.5 },
      { label: 'Classes This Week', value: weekBookings || 28, change: 7.0 },
      { label: 'Retention', value: '89%', change: 2.0 },
    ],
  };
  const kpiSet = presets[bt] || [
    { label: 'Revenue', value: formatCurrency(kpis.revenue.value), change: kpis.revenue.change },
    { label: 'Tasks Done', value: kpis.tasksCompleted.value, change: kpis.tasksCompleted.change },
    { label: 'Emails Handled', value: kpis.emailsHandled.value.toLocaleString(), change: kpis.emailsHandled.change },
    { label: 'Client Score', value: kpis.clientSatisfaction.value + '%', change: kpis.clientSatisfaction.change },
  ];
  return kpiSet.map((k, i) => renderKPICard(k.label, k.value, k.change, i)).join('');
}

function renderKPICard(label, value, change, index) {
  const changeClass = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
  const changeIcon = change > 0 ? '↑' : change < 0 ? '↓' : '→';
  const icons = { 'Revenue': '💰', 'Tasks Done': '✅', 'Emails Handled': '📧', 'Client Score': '⭐',
    'Patients Today': '🦷', 'Appointments This Week': '📋', 'Pending Recalls': '📞', 'Patient Satisfaction': '😊',
    'Clients Today': '💈', 'Bookings This Week': '📅', 'Avg Ticket': '💵', 'Return Rate': '🔄',
    'Covers Tonight': '🍽️', 'Reservations This Week': '📝', 'Tables Open': '🪑', 'Guest Rating': '⭐',
    'Sessions Today': '🏋️', 'Active Members': '👥', 'Classes This Week': '📆', 'Retention': '📊' };
  const icon = icons[label] || '📈';
  return `
    <div class="kpi-card animate-fade-in-up" style="animation-delay: ${index * 80}ms">
      <div class="kpi-label">${icon} ${label}</div>
      <div class="kpi-value" data-target="${value}">${value}</div>
      <span class="kpi-change ${changeClass}">${changeIcon} ${Math.abs(change)}%</span>
    </div>
  `;
}

function formatCurrency(value) {
  if (value >= 1000000) return '$' + (value / 1000000).toFixed(2) + 'M';
  if (value >= 1000) return '$' + (value / 1000).toFixed(0) + 'K';
  return '$' + value.toFixed(0);
}

function animateKPICounters() {
  document.querySelectorAll('.kpi-value').forEach(el => {
    const target = el.dataset.target;
    // Extract numeric portion
    const match = target.match(/^([\$]?)([\d,]+\.?\d*)(.*)/); 
    if (match) {
      const prefix = match[1];
      const numStr = match[2].replace(/,/g, '');
      const num = parseFloat(numStr);
      const suffix = match[3];
      if (!isNaN(num) && num > 0) {
        const duration = 800;
        const startTime = performance.now();
        el.textContent = prefix + '0' + suffix;
        const step = (now) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          // easeOutQuart
          const eased = 1 - Math.pow(1 - progress, 4);
          const current = eased * num;
          const formatted = num >= 100 ? Math.round(current).toLocaleString() : current.toFixed(numStr.includes('.') ? (numStr.split('.')[1]?.length || 0) : 0);
          el.textContent = prefix + formatted + suffix;
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        return;
      }
    }
    // Fallback: fade in
    el.style.animation = 'countUp 0.6s var(--ease-out) forwards';
  });
}

async function initCharts() {
  const chartData = dataStore.getChartData();

  try {
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);

    // Set chart defaults
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = 'rgba(99, 102, 241, 0.08)';
    Chart.defaults.font.family = "'Inter', sans-serif";

    // Task Throughput Chart
    const tasksCtx = document.getElementById('chart-tasks');
    if (tasksCtx) {
      const canvas = document.createElement('canvas');
      tasksCtx.appendChild(canvas);
      charts.tasks = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: chartData.weeklyTasks.labels,
          datasets: [
            {
              label: 'Completed',
              data: chartData.weeklyTasks.datasets[0].data,
              backgroundColor: 'rgba(99, 102, 241, 0.6)',
              borderRadius: 6,
              borderSkipped: false,
            },
            {
              label: 'Created',
              data: chartData.weeklyTasks.datasets[1].data,
              backgroundColor: 'rgba(6, 182, 212, 0.4)',
              borderRadius: 6,
              borderSkipped: false,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { padding: 16, usePointStyle: true, pointStyleWidth: 10, boxHeight: 8 } }
          },
          scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true, grid: { color: 'rgba(99, 102, 241, 0.06)' } }
          }
        }
      });
    }

    // Revenue Trend Chart
    const revenueCtx = document.getElementById('chart-revenue');
    if (revenueCtx) {
      const canvas = document.createElement('canvas');
      revenueCtx.appendChild(canvas);
      charts.revenue = new Chart(canvas, {
        type: 'line',
        data: {
          labels: chartData.revenueByMonth.labels,
          datasets: [{
            label: 'Revenue',
            data: chartData.revenueByMonth.data,
            borderColor: '#6366f1',
            backgroundColor: (ctx) => {
              const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 200);
              gradient.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
              gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
              return gradient;
            },
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#6366f1',
            pointBorderColor: '#0c1221',
            pointBorderWidth: 2,
            borderWidth: 2.5,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => '$' + (ctx.parsed.y / 1000000).toFixed(2) + 'M'
              }
            }
          },
          scales: {
            x: { grid: { display: false } },
            y: {
              beginAtZero: false,
              grid: { color: 'rgba(99, 102, 241, 0.06)' },
              ticks: {
                callback: (val) => '$' + (val / 1000000).toFixed(1) + 'M'
              }
            }
          }
        }
      });
    }
  } catch (err) {
    console.warn('Chart.js failed to load:', err);
  }
}

export function destroyDashboard() {
  Object.values(charts).forEach(c => c?.destroy());
  charts = {};
  closeBriefingPanel();
}

// ---- Daily Briefing Panel ----
function openBriefingPanel() {
  if (document.getElementById('briefing-panel')) {
    closeBriefingPanel();
    return;
  }

  const tasks = dataStore.getTasks();
  const emails = dataStore.getEmails();
  const meetings = dataStore.getMeetings();
  const today = new Date().toISOString().split('T')[0];
  const todayMeetings = meetings.filter(m => m.date === today);
  const urgentTasks = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done');
  const unread = emails.filter(e => !e.read);

  const panel = document.createElement('div');
  panel.id = 'briefing-panel';
  panel.className = 'briefing-panel';
  panel.innerHTML = `
    <div class="briefing-header">
      <h2>📋 Daily Briefing</h2>
      <button class="btn btn-ghost btn-sm" id="close-briefing">✕</button>
    </div>
    <div class="briefing-date">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>

    <div class="briefing-section">
      <div class="briefing-section-title">🎯 Today's Priorities</div>
      ${urgentTasks.length > 0 ? urgentTasks.map(t => `
        <div class="briefing-item priority">
          <div class="briefing-item-text">${escapeHtml(t.title)}</div>
          <div class="briefing-item-meta">${(t.tags || []).join(', ')} · ${t.dueDate || 'No due date'}</div>
          <div class="briefing-item-actions">
            <button class="btn btn-ghost btn-sm briefing-snooze" data-id="${t.id}">😴 Snooze</button>
            <button class="btn btn-ghost btn-sm briefing-done" data-id="${t.id}">✅ Done</button>
          </div>
        </div>
      `).join('') : '<div class="briefing-empty">No urgent tasks — great job! 🎉</div>'}
    </div>

    <div class="briefing-section">
      <div class="briefing-section-title">📅 Schedule (${todayMeetings.length} meetings)</div>
      ${todayMeetings.length > 0 ? todayMeetings.map(m => `
        <div class="briefing-item">
          <div class="briefing-item-text">${escapeHtml(m.title)}</div>
          <div class="briefing-item-meta">${m.startTime} - ${m.endTime} · ${m.location || 'No location'}</div>
        </div>
      `).join('') : '<div class="briefing-empty">Calendar clear — focus time! 🧘</div>'}
    </div>

    <div class="briefing-section">
      <div class="briefing-section-title">📧 Inbox (${unread.length} unread)</div>
      ${unread.slice(0, 3).map(e => `
        <div class="briefing-item">
          <div class="briefing-item-text">${escapeHtml(e.subject)}</div>
          <div class="briefing-item-meta">from ${escapeHtml(e.from)} · ${e.time}</div>
        </div>
      `).join('')}
      ${unread.length > 3 ? `<div class="briefing-more">+${unread.length - 3} more</div>` : ''}
    </div>

    <div class="briefing-section">
      <div class="briefing-section-title">🧠 AI Summary</div>
      <div class="briefing-ai-summary" id="briefing-ai-summary">
        <button class="btn btn-primary btn-sm" id="generate-briefing" style="width: 100%">Generate AI Briefing</button>
      </div>
    </div>
  `;

  document.body.appendChild(panel);
  requestAnimationFrame(() => panel.classList.add('open'));

  document.getElementById('close-briefing')?.addEventListener('click', closeBriefingPanel);

  // Snooze / Done buttons
  panel.querySelectorAll('.briefing-done').forEach(btn => {
    btn.addEventListener('click', () => {
      const task = tasks.find(t => t.id == btn.dataset.id);
      if (task) {
        task.status = 'done';
        dataStore.updateTask(task.id, task);
        btn.closest('.briefing-item').style.opacity = '0.4';
        btn.closest('.briefing-item').style.textDecoration = 'line-through';
        showToast('Task marked done!', 'success');
      }
    });
  });

  panel.querySelectorAll('.briefing-snooze').forEach(btn => {
    btn.addEventListener('click', () => {
      const task = tasks.find(t => t.id == btn.dataset.id);
      if (task) {
        task.priority = 'medium';
        dataStore.updateTask(task.id, task);
        btn.closest('.briefing-item').classList.remove('priority');
        showToast('Task snoozed to medium priority', 'info');
      }
    });
  });

  // AI briefing
  document.getElementById('generate-briefing')?.addEventListener('click', async () => {
    const btn = document.getElementById('generate-briefing');
    const container = document.getElementById('briefing-ai-summary');
    btn.disabled = true;
    btn.textContent = '⏳ Generating...';

    if (isLLMReady()) {
      const summary = await quickAction('briefing',
        `Generate a concise daily briefing for a business executive.
Key data: ${urgentTasks.length} urgent tasks, ${todayMeetings.length} meetings today, ${unread.length} unread emails.
Top urgent tasks: ${urgentTasks.slice(0, 3).map(t => t.title).join(', ')}.
Provide: 3 bullet points of priorities, 1 risk alert, and 1 opportunity.`
      );
      container.innerHTML = `<div class="briefing-ai-text">${escapeHtml(summary)}</div>`;
    } else {
      container.innerHTML = `
        <div class="briefing-ai-text">
• Focus on ${urgentTasks.length} urgent tasks, especially client-facing deliverables
• ${todayMeetings.length > 0 ? `Prepare for ${todayMeetings[0]?.title || 'meetings'}` : 'No meetings — ideal for deep work'}
• Process ${unread.length} unread emails; prioritize from finance and legal

⚠️ Risk: ${urgentTasks.length > 2 ? 'High task load may cause deadline pressure' : 'Workload manageable'}
💡 Opportunity: Current task completion rate is strong — maintain momentum
        </div>
      `;
    }
  });

  // Click outside to close
  const clickOutside = (e) => {
    if (!panel.contains(e.target) && !e.target.closest('#qa-daily-brief')) {
      closeBriefingPanel();
      document.removeEventListener('click', clickOutside);
    }
  };
  setTimeout(() => document.addEventListener('click', clickOutside), 200);
}

function closeBriefingPanel() {
  const panel = document.getElementById('briefing-panel');
  if (panel) {
    panel.classList.remove('open');
    setTimeout(() => panel.remove(), 300);
  }
}
