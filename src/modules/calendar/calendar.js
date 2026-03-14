// AssistantNet — Calendar & Scheduling Module
import { dataStore } from '../../services/data.js';
import './calendar.css';

let currentWeekOffset = 0;

export function renderCalendar(container) {
  const meetings = dataStore.getMeetings();
  const weekDates = getWeekDates(currentWeekOffset);
  const today = new Date().toISOString().split('T')[0];
  const hours = Array.from({ length: 10 }, (_, i) => i + 8); // 8 AM - 5 PM

  container.innerHTML = `
    <div class="calendar-view">
      <div class="calendar-header animate-fade-in">
        <h1>📅 Calendar</h1>
        <div class="calendar-nav">
          <button class="calendar-nav-btn" id="cal-prev">← Prev</button>
          <div class="calendar-period">${formatWeekRange(weekDates)}</div>
          <button class="calendar-nav-btn" id="cal-next">Next →</button>
          <button class="calendar-nav-btn" id="cal-today">Today</button>
        </div>
      </div>

      <div class="calendar-week animate-fade-in-up">
        <!-- Header Row -->
        <div class="calendar-day-header" style="background: var(--bg-secondary)">
          <span style="font-size: 10px; color: var(--text-muted)">TIME</span>
        </div>
        ${weekDates.map(d => `
          <div class="calendar-day-header ${d.iso === today ? 'today' : ''}">
            <span class="day-number">${d.date.getDate()}</span>
            ${d.dayName}
          </div>
        `).join('')}

        <!-- Time Slots -->
        <div class="calendar-time-col">
          ${hours.map(h => `
            <div class="calendar-time-slot-label">${formatHour(h)}</div>
          `).join('')}
        </div>

        ${weekDates.map(d => `
          <div class="calendar-day-col">
            ${hours.map(() => `<div class="calendar-slot"></div>`).join('')}
            ${renderEventsForDay(meetings, d.iso, hours[0])}
          </div>
        `).join('')}
      </div>

      <!-- Upcoming Meetings -->
      <div class="calendar-upcoming">
        <div class="section-header">
          <div>
            <div class="section-title">Upcoming This Week</div>
            <div class="section-subtitle">${meetings.length} meetings scheduled</div>
          </div>
        </div>
        <div class="grid-2">
          ${meetings
            .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
            .map(m => renderUpcomingCard(m))
            .join('')}
        </div>
      </div>
    </div>
  `;

  // Bind navigation
  document.getElementById('cal-prev')?.addEventListener('click', () => {
    currentWeekOffset--;
    renderCalendar(container);
  });
  document.getElementById('cal-next')?.addEventListener('click', () => {
    currentWeekOffset++;
    renderCalendar(container);
  });
  document.getElementById('cal-today')?.addEventListener('click', () => {
    currentWeekOffset = 0;
    renderCalendar(container);
  });
}

function getWeekDates(offset) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + (offset * 7));

  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
  return days.map((name, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      dayName: name,
      date: d,
      iso: d.toISOString().split('T')[0]
    };
  });
}

function formatWeekRange(dates) {
  const start = dates[0].date;
  const end = dates[dates.length - 1].date;
  const opts = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', opts)} — ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
}

function formatHour(h) {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function renderEventsForDay(meetings, dateIso, startHour) {
  const dayMeetings = meetings.filter(m => m.date === dateIso);
  return dayMeetings.map(m => {
    const [sh, sm] = m.startTime.split(':').map(Number);
    const [eh, em] = m.endTime.split(':').map(Number);
    const topOffset = (sh - startHour) * 60 + sm;
    const height = (eh - sh) * 60 + (em - sm);

    return `
      <div class="calendar-event cat-${m.category}"
           style="top: ${topOffset}px; height: ${Math.max(height, 30)}px;"
           title="${m.title}\n${m.startTime} - ${m.endTime}\n${m.location}">
        <div class="event-title">${m.title}</div>
        <div class="event-time">${m.startTime} - ${m.endTime}</div>
        ${height > 45 ? `<div class="event-location">${m.location}</div>` : ''}
      </div>
    `;
  }).join('');
}

function renderUpcomingCard(meeting) {
  const catColors = {
    team: '#6366f1', executive: '#ef4444', engineering: '#06b6d4',
    external: '#22c55e', marketing: '#f59e0b', clients: '#ef4444',
    hr: '#8b5cf6', product: '#ec4899', company: '#14b8a6'
  };

  return `
    <div class="upcoming-card">
      <div class="upcoming-dot" style="background: ${catColors[meeting.category] || '#6366f1'}"></div>
      <div class="upcoming-info">
        <div class="upcoming-title">${meeting.title}</div>
        <div class="upcoming-meta">${formatMeetingDate(meeting.date)} · ${meeting.startTime} - ${meeting.endTime} · ${meeting.location}</div>
      </div>
      ${meeting.recurring ? '<span class="tag">🔄 Recurring</span>' : ''}
    </div>
  `;
}

function formatMeetingDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function destroyCalendar() {}
