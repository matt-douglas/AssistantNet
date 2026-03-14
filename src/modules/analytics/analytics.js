// AssistantNet — Analytics & Insights Module
import { dataStore } from '../../services/data.js';
import { quickAction, isLLMReady } from '../../services/llm.js';
import './analytics.css';

export function renderAnalytics(container) {
  const tasks = dataStore.getTasks();
  const emails = dataStore.getEmails();
  const meetings = dataStore.getMeetings();
  const kpis = dataStore.getKPIs();
  const chartData = dataStore.getChartData();

  // Compute productivity metrics
  const metrics = computeMetrics(tasks, emails, meetings);

  container.innerHTML = `
    <div class="analytics-view">
      <div class="analytics-header animate-fade-in">
        <h1>📈 Analytics & Insights</h1>
        <div class="analytics-period-selector">
          <button class="chip active">This Week</button>
          <button class="chip">This Month</button>
          <button class="chip">This Quarter</button>
        </div>
      </div>

      <!-- Score Cards -->
      <div class="score-cards">
        ${renderScoreCard('📧', metrics.emailsProcessed, 'Emails Processed', metrics.emailChange, 0)}
        ${renderScoreCard('✅', metrics.tasksCompleted, 'Tasks Completed', metrics.taskChange, 1)}
        ${renderScoreCard('📅', metrics.meetingsThisWeek, 'Meetings Attended', '+3', 2)}
        ${renderScoreCard('⚡', metrics.avgResponseTime, 'Avg Response Time', '-12%', 3)}
        ${renderScoreCard('🎯', metrics.focusHours + 'h', 'Focus Time', '+18%', 4)}
      </div>

      <!-- Productivity Score Ring -->
      <div class="productivity-ring-card animate-fade-in-up" style="animation-delay: 100ms">
        <div class="ring-container">
          <svg viewBox="0 0 120 120">
            <defs>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#6366f1" />
                <stop offset="100%" stop-color="#06b6d4" />
              </linearGradient>
            </defs>
            <circle class="ring-bg" cx="60" cy="60" r="52" />
            <circle class="ring-progress" cx="60" cy="60" r="52"
              stroke-dasharray="${2 * Math.PI * 52}"
              stroke-dashoffset="${2 * Math.PI * 52 * (1 - metrics.productivityScore / 100)}"
            />
          </svg>
          <div class="ring-center-text">
            <div class="ring-score">${metrics.productivityScore}</div>
            <div class="ring-label">Score</div>
          </div>
        </div>
        <div class="ring-breakdown">
          <div class="ring-breakdown-title">Productivity Breakdown</div>
          <div class="ring-metric">
            <span class="ring-metric-label">Task Completion Rate</span>
            <span class="ring-metric-value">${metrics.taskCompletionRate}%</span>
          </div>
          <div class="ring-metric">
            <span class="ring-metric-label">Email Response Rate</span>
            <span class="ring-metric-value">${metrics.emailResponseRate}%</span>
          </div>
          <div class="ring-metric">
            <span class="ring-metric-label">Meeting Attendance</span>
            <span class="ring-metric-value">${metrics.meetingAttendance}%</span>
          </div>
          <div class="ring-metric">
            <span class="ring-metric-label">Focus Efficiency</span>
            <span class="ring-metric-value">${metrics.focusEfficiency}%</span>
          </div>
          <div class="ring-metric">
            <span class="ring-metric-label">Task Velocity (tasks/day)</span>
            <span class="ring-metric-value">${metrics.taskVelocity}</span>
          </div>
        </div>
      </div>

      <!-- Charts Grid -->
      <div class="analytics-charts-grid">
        <!-- Email Volume Heatmap -->
        <div class="analytics-chart-card animate-fade-in-up" style="animation-delay: 200ms">
          <div class="card-header">
            <div>
              <div class="card-title">📧 Email Activity Heatmap</div>
              <div class="card-subtitle">Volume by day and time of day</div>
            </div>
          </div>
          <div class="heatmap-container" id="email-heatmap"></div>
        </div>

        <!-- Task Distribution -->
        <div class="analytics-chart-card animate-fade-in-up" style="animation-delay: 250ms">
          <div class="card-header">
            <div>
              <div class="card-title">📊 Task Distribution</div>
              <div class="card-subtitle">By category</div>
            </div>
          </div>
          <div class="category-bars" id="task-distribution"></div>
        </div>

        <!-- Workload Chart -->
        <div class="analytics-chart-card animate-fade-in-up" style="animation-delay: 300ms">
          <div class="card-header">
            <div>
              <div class="card-title">⚡ Weekly Workload</div>
              <div class="card-subtitle">Tasks completed vs created</div>
            </div>
          </div>
          <div class="chart-area" id="chart-workload"></div>
        </div>

        <!-- Revenue Chart -->
        <div class="analytics-chart-card animate-fade-in-up" style="animation-delay: 350ms">
          <div class="card-header">
            <div>
              <div class="card-title">💰 Revenue Trajectory</div>
              <div class="card-subtitle">6-month trend</div>
            </div>
          </div>
          <div class="chart-area" id="chart-revenue-analytics"></div>
        </div>
      </div>

      <!-- AI Insights -->
      <div class="ai-insights-card animate-fade-in-up" style="animation-delay: 400ms">
        <div class="card-header">
          <div>
            <div class="card-title">🧠 AI-Powered Insights</div>
            <div class="card-subtitle">Generated from your activity data</div>
          </div>
          <button class="btn btn-secondary btn-sm" id="refresh-insights">🔄 Refresh</button>
        </div>
        <div class="insight-items" id="insight-items">
          ${renderInsights(metrics)}
        </div>
      </div>
    </div>
  `;

  // Render heatmap and charts
  renderHeatmap();
  renderTaskDistribution(tasks);
  setTimeout(() => initAnalyticsCharts(chartData), 100);

  // Bind refresh insights
  document.getElementById('refresh-insights')?.addEventListener('click', async () => {
    const btn = document.getElementById('refresh-insights');
    btn.disabled = true;
    btn.textContent = '⏳ Analyzing...';
    const container = document.getElementById('insight-items');
    if (isLLMReady()) {
      const result = await quickAction('analyze',
        `You are a business intelligence AI. Analyze this data and provide 4 actionable insights.
        
Tasks: ${tasks.length} total, ${tasks.filter(t => t.status === 'done').length} completed, ${tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length} urgent pending.
Emails: ${emails.length} total, ${emails.filter(e => !e.read).length} unread.
Meetings: ${meetings.length} this week.
Revenue: $${(kpis.revenue.value / 1000000).toFixed(2)}M (${kpis.revenue.change > 0 ? '+' : ''}${kpis.revenue.change}%)
Client Satisfaction: ${kpis.clientSatisfaction.value}%

Format each insight as: ICON | TITLE | DESCRIPTION (one per line, separated by |)`
      );
      container.innerHTML = parseAIInsights(result);
    }
    btn.disabled = false;
    btn.textContent = '🔄 Refresh';
  });
}

function computeMetrics(tasks, emails, meetings) {
  const done = tasks.filter(t => t.status === 'done').length;
  const total = tasks.length;
  const urgent = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length;
  const unread = emails.filter(e => !e.read).length;
  const read = emails.filter(e => e.read).length;

  const taskCompletionRate = total > 0 ? Math.round((done / total) * 100) : 0;
  const emailResponseRate = emails.length > 0 ? Math.round((read / emails.length) * 100) : 0;
  const meetingAttendance = 92;
  const focusEfficiency = 78;

  // Weighted productivity score
  const productivityScore = Math.round(
    taskCompletionRate * 0.35 +
    emailResponseRate * 0.25 +
    meetingAttendance * 0.2 +
    focusEfficiency * 0.2
  );

  return {
    emailsProcessed: emails.length,
    emailChange: `${unread > 0 ? '-' : '+'}${Math.abs(emails.length - unread)}`,
    tasksCompleted: done,
    taskChange: `+${done}`,
    meetingsThisWeek: meetings.length,
    avgResponseTime: '2.4h',
    focusHours: 18,
    productivityScore,
    taskCompletionRate,
    emailResponseRate,
    meetingAttendance,
    focusEfficiency,
    taskVelocity: (done / 5).toFixed(1),
    urgentPending: urgent,
  };
}

function renderScoreCard(icon, value, label, change, index) {
  const changeStr = String(change);
  const changeClass = changeStr.startsWith('+') ? 'positive' : changeStr.startsWith('-') ? 'negative' : 'neutral';
  return `
    <div class="score-card animate-fade-in-up" style="animation-delay: ${index * 60}ms">
      <div class="score-card-icon">${icon}</div>
      <div class="score-card-value">${value}</div>
      <div class="score-card-label">${label}</div>
      <div class="score-card-change ${changeClass}">${change} this week</div>
    </div>
  `;
}

function renderHeatmap() {
  const container = document.getElementById('email-heatmap');
  if (!container) return;

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = ['6a', '8a', '10a', '12p', '2p', '4p', '6p', '8p'];

  // Generate mock heatmap data
  const heatData = days.map(() =>
    hours.map(() => Math.random() > 0.3 ? Math.floor(Math.random() * 15) : 0)
  );

  const maxVal = Math.max(...heatData.flat(), 1);

  const getColor = (val) => {
    if (val === 0) return 'rgba(99, 102, 241, 0.04)';
    const intensity = val / maxVal;
    if (intensity < 0.25) return 'rgba(99, 102, 241, 0.15)';
    if (intensity < 0.5) return 'rgba(99, 102, 241, 0.35)';
    if (intensity < 0.75) return 'rgba(99, 102, 241, 0.55)';
    return 'rgba(99, 102, 241, 0.85)';
  };

  container.innerHTML = `
    ${days.map((day, di) => `
      <div class="heatmap-row">
        <span class="heatmap-label">${day}</span>
        <div class="heatmap-cells">
          ${heatData[di].map((val, hi) => `
            <div class="heatmap-cell" style="background: ${getColor(val)}" title="${day} ${hours[hi]}: ${val} emails"></div>
          `).join('')}
        </div>
      </div>
    `).join('')}
    <div class="heatmap-hour-labels">
      ${hours.map(h => `<span>${h}</span>`).join('')}
    </div>
  `;
}

function renderTaskDistribution(tasks) {
  const container = document.getElementById('task-distribution');
  if (!container) return;

  // Aggregate by tag
  const tagCounts = {};
  tasks.forEach(t => {
    (t.tags || []).forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxCount = sorted.length > 0 ? sorted[0][1] : 1;

  const colors = ['#6366f1', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

  container.innerHTML = sorted.map(([tag, count], i) => `
    <div class="category-bar-item">
      <span class="category-bar-label">${tag}</span>
      <div class="category-bar-track">
        <div class="category-bar-fill" style="width: ${(count / maxCount) * 100}%; background: ${colors[i % colors.length]}">
          ${count}
        </div>
      </div>
      <span class="category-bar-value">${Math.round((count / tasks.length) * 100)}%</span>
    </div>
  `).join('');
}

function renderInsights(metrics) {
  const insights = [
    {
      icon: '🎯',
      title: 'Task velocity is above average',
      desc: `You're completing ${metrics.taskVelocity} tasks/day. The team average is 1.8. Keep this pace to close all urgent items by end of week.`
    },
    {
      icon: '⚠️',
      title: `${metrics.urgentPending} urgent tasks pending`,
      desc: 'Consider blocking 2 hours of focus time today to address the highest-priority items before the board meeting.'
    },
    {
      icon: '📧',
      title: 'Email volume trending down',
      desc: 'Emails are down 3.1% this week. The AI-powered triage has been handling 40% of incoming messages automatically.'
    },
    {
      icon: '📊',
      title: 'Revenue growth accelerating',
      desc: 'Q1 revenue is up 12.4% YoY. APAC exceeded targets by 18%, partially offsetting the northeast region shortfall.'
    }
  ];

  return insights.map(i => `
    <div class="insight-item">
      <div class="insight-icon">${i.icon}</div>
      <div class="insight-content">
        <div class="insight-title">${i.title}</div>
        <div class="insight-desc">${i.desc}</div>
      </div>
    </div>
  `).join('');
}

function parseAIInsights(text) {
  const lines = text.split('\n').filter(l => l.includes('|'));
  if (lines.length < 2) {
    return `<div class="insight-item"><div class="insight-icon">🧠</div><div class="insight-content"><div class="insight-title">AI Analysis</div><div class="insight-desc">${text}</div></div></div>`;
  }
  return lines.slice(0, 4).map(line => {
    const parts = line.split('|').map(s => s.trim());
    const icon = parts[0] || '💡';
    const title = parts[1] || 'Insight';
    const desc = parts[2] || '';
    return `
      <div class="insight-item">
        <div class="insight-icon">${icon}</div>
        <div class="insight-content">
          <div class="insight-title">${title}</div>
          <div class="insight-desc">${desc}</div>
        </div>
      </div>
    `;
  }).join('');
}

async function initAnalyticsCharts(chartData) {
  try {
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);

    // Workload chart
    const workloadEl = document.getElementById('chart-workload');
    if (workloadEl) {
      const canvas = document.createElement('canvas');
      workloadEl.appendChild(canvas);
      new Chart(canvas, {
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
            legend: { position: 'top', labels: { padding: 12, usePointStyle: true, pointStyleWidth: 10, boxHeight: 8 } }
          },
          scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true, grid: { color: 'rgba(99, 102, 241, 0.06)' } }
          }
        }
      });
    }

    // Revenue chart
    const revenueEl = document.getElementById('chart-revenue-analytics');
    if (revenueEl) {
      const canvas = document.createElement('canvas');
      revenueEl.appendChild(canvas);
      new Chart(canvas, {
        type: 'line',
        data: {
          labels: chartData.revenueByMonth.labels,
          datasets: [{
            label: 'Revenue',
            data: chartData.revenueByMonth.data,
            borderColor: '#6366f1',
            backgroundColor: (ctx) => {
              const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 200);
              gradient.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
              gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
              return gradient;
            },
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointHoverRadius: 7,
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
              callbacks: { label: (ctx) => '$' + (ctx.parsed.y / 1000000).toFixed(2) + 'M' }
            }
          },
          scales: {
            x: { grid: { display: false } },
            y: {
              beginAtZero: false,
              grid: { color: 'rgba(99, 102, 241, 0.06)' },
              ticks: { callback: (val) => '$' + (val / 1000000).toFixed(1) + 'M' }
            }
          }
        }
      });
    }
  } catch (err) {
    console.warn('Chart.js failed to load:', err);
  }
}

export function destroyAnalytics() {}
