// AssistantNet — Calendar & Scheduling Module
import { dataStore } from '../../services/data.js';
import { escapeAttr } from '../../services/utils.js';
import { showToast } from '../../main.js';
import './calendar.css';

let currentWeekOffset = 0;

export function renderCalendar(container) {
  localStorage.setItem('jarvis_viewed_calendar', '1');
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
          <button class="btn btn-primary btn-sm" id="cal-add-event" style="margin-left: var(--space-3)">+ Add Event</button>
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

  // Add Event button
  document.getElementById('cal-add-event')?.addEventListener('click', () => {
    showAddEventModal(container);
  });

  // Click on events to edit
  document.querySelectorAll('.calendar-event').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const meetingId = el.dataset.meetingId;
      if (meetingId) showEditEventModal(meetingId, container);
    });
  });

  // Click on upcoming cards to edit
  document.querySelectorAll('.upcoming-card[data-meeting-id]').forEach(card => {
    card.addEventListener('click', () => {
      showEditEventModal(card.dataset.meetingId, container);
    });
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
           style="top: ${topOffset}px; height: ${Math.max(height, 30)}px; cursor: pointer;"
           title="${m.title}\n${m.startTime} - ${m.endTime}\n${m.location}"
           data-meeting-id="${m.id}">
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
    <div class="upcoming-card" data-meeting-id="${meeting.id}" style="cursor: pointer">
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

// ---- Add Event Modal ----
function showAddEventModal(container) {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('hidden');

  const today = new Date().toISOString().split('T')[0];

  overlay.innerHTML = `
    <div class="modal" style="animation: scaleIn 0.2s var(--ease-spring); max-width: 500px">
      <h2>📅 New Event</h2>
      <div class="input-group" style="margin-bottom: var(--space-4)">
        <label class="input-label">Title</label>
        <input type="text" id="event-title" class="input" placeholder="Meeting title" autofocus />
      </div>
      <div style="display: flex; gap: var(--space-3); margin-bottom: var(--space-4)">
        <div class="input-group" style="flex: 1">
          <label class="input-label">Date</label>
          <input type="date" id="event-date" class="input" value="${today}" />
        </div>
        <div class="input-group" style="flex: 1">
          <label class="input-label">Category</label>
          <select id="event-category" class="select" style="width: 100%">
            <option value="team">Team</option>
            <option value="external">External</option>
            <option value="clients">Clients</option>
            <option value="engineering">Engineering</option>
            <option value="marketing">Marketing</option>
            <option value="executive">Executive</option>
            <option value="hr">HR</option>
            <option value="product">Product</option>
            <option value="company">Company</option>
          </select>
        </div>
      </div>
      <div style="display: flex; gap: var(--space-3); margin-bottom: var(--space-4)">
        <div class="input-group" style="flex: 1">
          <label class="input-label">Start Time</label>
          <input type="time" id="event-start" class="input" value="09:00" />
        </div>
        <div class="input-group" style="flex: 1">
          <label class="input-label">End Time</label>
          <input type="time" id="event-end" class="input" value="10:00" />
        </div>
      </div>
      <div class="input-group" style="margin-bottom: var(--space-5)">
        <label class="input-label">Location</label>
        <input type="text" id="event-location" class="input" placeholder="e.g. Zoom, Conference Room A" />
      </div>
      <div style="display: flex; gap: var(--space-3); justify-content: flex-end">
        <button class="btn btn-ghost" id="cancel-event-btn">Cancel</button>
        <button class="btn btn-primary" id="save-event-btn">📅 Create Event</button>
      </div>
    </div>
  `;

  const close = () => { overlay.classList.add('hidden'); overlay.innerHTML = ''; };
  document.getElementById('cancel-event-btn').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.getElementById('event-title')?.focus();

  document.getElementById('save-event-btn').addEventListener('click', () => {
    const title = document.getElementById('event-title').value.trim();
    if (!title) { document.getElementById('event-title').focus(); return; }

    dataStore.addMeeting({
      title,
      date: document.getElementById('event-date').value,
      startTime: document.getElementById('event-start').value,
      endTime: document.getElementById('event-end').value,
      location: document.getElementById('event-location').value.trim() || 'No location',
      category: document.getElementById('event-category').value,
      attendees: [],
      recurring: false,
    });

    showToast('Event created!', 'success');
    close();
    renderCalendar(container);
  });
}

// ---- Edit Event Modal ----
function showEditEventModal(meetingId, container) {
  const meeting = dataStore.getMeetings().find(m => m.id === meetingId);
  if (!meeting) return;

  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('hidden');

  overlay.innerHTML = `
    <div class="modal" style="animation: scaleIn 0.2s var(--ease-spring); max-width: 500px">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4)">
        <h2>✏️ Edit Event</h2>
        <button class="btn btn-ghost btn-sm" id="close-edit-event">✕</button>
      </div>
      <div class="input-group" style="margin-bottom: var(--space-4)">
        <label class="input-label">Title</label>
        <input type="text" id="edit-event-title" class="input" value="${escapeAttr(meeting.title)}" />
      </div>
      <div style="display: flex; gap: var(--space-3); margin-bottom: var(--space-4)">
        <div class="input-group" style="flex: 1">
          <label class="input-label">Date</label>
          <input type="date" id="edit-event-date" class="input" value="${meeting.date}" />
        </div>
        <div class="input-group" style="flex: 1">
          <label class="input-label">Category</label>
          <select id="edit-event-category" class="select" style="width: 100%">
            ${['team','external','clients','engineering','marketing','executive','hr','product','company'].map(c =>
              `<option value="${c}" ${meeting.category === c ? 'selected' : ''}>${c.charAt(0).toUpperCase() + c.slice(1)}</option>`
            ).join('')}
          </select>
        </div>
      </div>
      <div style="display: flex; gap: var(--space-3); margin-bottom: var(--space-4)">
        <div class="input-group" style="flex: 1">
          <label class="input-label">Start Time</label>
          <input type="time" id="edit-event-start" class="input" value="${meeting.startTime}" />
        </div>
        <div class="input-group" style="flex: 1">
          <label class="input-label">End Time</label>
          <input type="time" id="edit-event-end" class="input" value="${meeting.endTime}" />
        </div>
      </div>
      <div class="input-group" style="margin-bottom: var(--space-5)">
        <label class="input-label">Location</label>
        <input type="text" id="edit-event-location" class="input" value="${escapeAttr(meeting.location || '')}" />
      </div>
      <div style="display: flex; gap: var(--space-3); justify-content: space-between">
        <button class="btn btn-danger btn-sm" id="delete-event-btn">🗑️ Delete</button>
        <div style="display: flex; gap: var(--space-3)">
          <button class="btn btn-ghost" id="cancel-edit-event">Cancel</button>
          <button class="btn btn-primary" id="save-edit-event">💾 Save Changes</button>
        </div>
      </div>
    </div>
  `;

  const close = () => { overlay.classList.add('hidden'); overlay.innerHTML = ''; };
  document.getElementById('close-edit-event').addEventListener('click', close);
  document.getElementById('cancel-edit-event').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  document.getElementById('save-edit-event').addEventListener('click', () => {
    const title = document.getElementById('edit-event-title').value.trim();
    if (!title) return;

    dataStore.updateMeeting(meetingId, {
      title,
      date: document.getElementById('edit-event-date').value,
      startTime: document.getElementById('edit-event-start').value,
      endTime: document.getElementById('edit-event-end').value,
      location: document.getElementById('edit-event-location').value.trim() || 'No location',
      category: document.getElementById('edit-event-category').value,
    });

    showToast('Event updated!', 'success');
    close();
    renderCalendar(container);
  });

  document.getElementById('delete-event-btn').addEventListener('click', () => {
    dataStore.deleteMeeting(meetingId);
    showToast('Event deleted', 'info');
    close();
    renderCalendar(container);
  });
}

export function destroyCalendar() {}
