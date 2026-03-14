// AssistantNet — Dashboard Module (Executive Command Center)
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
  const today = new Date().toISOString().split('T')[0];
  const todayMeetings = meetings.filter(m => m.date === today);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  container.innerHTML = `
    <div class="dashboard">
      <div class="dashboard-greeting animate-fade-in-up">
        <h1>${greeting}, MD</h1>
        <p>Here's your business overview for ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.</p>
      </div>

      <div class="kpi-grid">
        ${renderKPICard('Revenue', formatCurrency(kpis.revenue.value), kpis.revenue.change, 0)}
        ${renderKPICard('Tasks Done', kpis.tasksCompleted.value, kpis.tasksCompleted.change, 1)}
        ${renderKPICard('Emails Handled', kpis.emailsHandled.value.toLocaleString(), kpis.emailsHandled.change, 2)}
        ${renderKPICard('Client Score', kpis.clientSatisfaction.value + '%', kpis.clientSatisfaction.change, 3)}
      </div>

      <div class="dashboard-grid">
        <div class="card animate-fade-in-up" style="animation-delay: 200ms">
          <div class="card-header">
            <div>
              <div class="card-title">Weekly Task Throughput</div>
              <div class="card-subtitle">Completed vs Created</div>
            </div>
          </div>
          <div class="chart-container" id="chart-tasks"></div>
        </div>

        <div class="card animate-fade-in-up" style="animation-delay: 250ms">
          <div class="card-header">
            <div>
              <div class="card-title">Revenue Trend</div>
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
          <button class="quick-action-btn" onclick="window.location.hash='#/assistant'">
            <span class="icon">🧠</span>
            <span class="label">Ask AI Assistant</span>
          </button>
          <button class="quick-action-btn" onclick="window.location.hash='#/inbox'">
            <span class="icon">📧</span>
            <span class="label">Check Inbox</span>
          </button>
          <button class="quick-action-btn" onclick="window.location.hash='#/tasks'">
            <span class="icon">✅</span>
            <span class="label">View Tasks</span>
          </button>
          <button class="quick-action-btn" onclick="window.location.hash='#/calendar'">
            <span class="icon">📅</span>
            <span class="label">Today's Schedule</span>
          </button>
          <button class="quick-action-btn" onclick="window.location.hash='#/documents'">
            <span class="icon">📄</span>
            <span class="label">Browse Documents</span>
          </button>
          <button class="quick-action-btn" id="qa-daily-brief">
            <span class="icon">📊</span>
            <span class="label">Daily Briefing</span>
          </button>
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
}

function renderKPICard(label, value, change, index) {
  const changeClass = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
  const changeIcon = change > 0 ? '↑' : change < 0 ? '↓' : '→';
  return `
    <div class="kpi-card animate-fade-in-up" style="animation-delay: ${index * 80}ms">
      <div class="kpi-label">${label}</div>
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
