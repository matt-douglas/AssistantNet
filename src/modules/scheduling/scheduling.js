// AssistantNet — Scheduling & Client Booking Module
import { dataStore } from '../../services/data.js';
import { escapeHtml, escapeAttr } from '../../services/utils.js';
import './scheduling.css';

let selectedBookingDay = null;
let selectedSlot = null;

const BOOKING_PRESETS = {
  dental: [
    { id: 'cleaning', name: 'Teeth Cleaning', duration: 45, icon: '🪥', color: '#06b6d4' },
    { id: 'exam', name: 'Dental Exam', duration: 30, icon: '🦷', color: '#6366f1' },
    { id: 'rootcanal', name: 'Root Canal', duration: 90, icon: '💉', color: '#ef4444' },
  ],
  barber: [
    { id: 'haircut', name: 'Haircut', duration: 30, icon: '✂️', color: '#6366f1' },
    { id: 'beard', name: 'Beard Trim', duration: 20, icon: '🧔', color: '#06b6d4' },
    { id: 'full', name: 'Full Service', duration: 60, icon: '💈', color: '#22c55e' },
  ],
  restaurant: [
    { id: 'dinner', name: 'Dinner Reservation', duration: 90, icon: '🍽️', color: '#f59e0b' },
    { id: 'lunch', name: 'Lunch Table', duration: 60, icon: '🥗', color: '#22c55e' },
    { id: 'event', name: 'Private Event', duration: 180, icon: '🥂', color: '#8b5cf6' },
  ],
  consulting: [
    { id: 'consultation', name: 'Consultation Call', duration: 30, icon: '📞', color: '#6366f1' },
    { id: 'strategy', name: 'Strategy Session', duration: 60, icon: '🧠', color: '#06b6d4' },
    { id: 'onboarding', name: 'Client Onboarding', duration: 45, icon: '🤝', color: '#22c55e' },
  ],
  fitness: [
    { id: 'session', name: 'Training Session', duration: 60, icon: '🏋️', color: '#22c55e' },
    { id: 'assessment', name: 'Fitness Assessment', duration: 45, icon: '📋', color: '#6366f1' },
    { id: 'class', name: 'Group Class', duration: 45, icon: '🧘', color: '#f59e0b' },
  ],
  general: [
    { id: 'consultation', name: 'Consultation Call', duration: 30, icon: '📞', color: '#6366f1' },
    { id: 'strategy', name: 'Strategy Session', duration: 60, icon: '🧠', color: '#06b6d4' },
    { id: 'onboarding', name: 'Client Onboarding', duration: 45, icon: '🤝', color: '#22c55e' },
  ],
};

const BIZ_LABELS = {
  dental: { title: 'Patient Scheduling', client: 'Patient', header: '🦷 Appointments' },
  barber: { title: 'Client Scheduling', client: 'Client', header: '💈 Appointments' },
  restaurant: { title: 'Reservations', client: 'Guest', header: '🍽️ Reservations' },
  consulting: { title: 'Scheduling', client: 'Client', header: '📅 Scheduling' },
  fitness: { title: 'Session Booking', client: 'Member', header: '🏋️ Sessions' },
  general: { title: 'Scheduling', client: 'Client', header: '📅 Scheduling' },
};

function getBookingTypes() {
  const bizType = (dataStore.getSettings().businessType) || 'general';
  return BOOKING_PRESETS[bizType] || BOOKING_PRESETS.general;
}

function getBizLabels() {
  const bizType = (dataStore.getSettings().businessType) || 'general';
  return BIZ_LABELS[bizType] || BIZ_LABELS.general;
}

const DEFAULT_AVAILABILITY = [
  { day: 'Monday',    enabled: true, start: '09:00', end: '17:00' },
  { day: 'Tuesday',   enabled: true, start: '09:00', end: '17:00' },
  { day: 'Wednesday', enabled: true, start: '09:00', end: '17:00' },
  { day: 'Thursday',  enabled: true, start: '09:00', end: '17:00' },
  { day: 'Friday',    enabled: true, start: '10:00', end: '16:00' },
  { day: 'Saturday',  enabled: false, start: '10:00', end: '14:00' },
  { day: 'Sunday',    enabled: false, start: '', end: '' },
];

function getBookings() {
  return dataStore.data.bookings || [];
}

function addBooking(booking) {
  if (!dataStore.data.bookings) dataStore.data.bookings = [];
  const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  const newBooking = { id, status: 'confirmed', createdAt: new Date().toISOString(), ...booking };
  dataStore.data.bookings.unshift(newBooking);

  // Also add to calendar meetings
  dataStore.addMeeting({
    title: `${booking.type}: ${booking.clientName}`,
    date: booking.date,
    startTime: booking.time,
    endTime: calculateEndTime(booking.time, booking.duration),
    attendees: [booking.clientName],
    category: 'clients',
    location: booking.location || 'Video Call',
  });

  dataStore.save();
  return newBooking;
}

function cancelBooking(id) {
  const bookings = getBookings();
  const booking = bookings.find(b => b.id === id);
  if (booking) { booking.status = 'cancelled'; dataStore.save(); }
}

function calculateEndTime(startTime, durationMin) {
  const [h, m] = startTime.split(':').map(Number);
  const totalMin = h * 60 + m + durationMin;
  return `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
}

function getAvailableSlots(date, duration = 30) {
  const dayName = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
  const avail = DEFAULT_AVAILABILITY.find(a => a.day === dayName);
  if (!avail || !avail.enabled) return [];

  const meetings = dataStore.getMeetings().filter(m => m.date === date);
  const bookings = getBookings().filter(b => b.date === date && b.status !== 'cancelled');

  const [startH, startM] = avail.start.split(':').map(Number);
  const [endH, endM] = avail.end.split(':').map(Number);
  const startMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;

  const slots = [];
  for (let t = startMin; t + duration <= endMin; t += 30) {
    const slotStart = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
    const slotEnd = calculateEndTime(slotStart, duration);

    // Check for conflicts
    const conflict = [...meetings, ...bookings.map(b => ({ startTime: b.time, endTime: calculateEndTime(b.time, b.duration) }))].some(m => {
      return slotStart < m.endTime && slotEnd > m.startTime;
    });

    slots.push({ time: slotStart, available: !conflict });
  }
  return slots;
}

function getNext7Days() {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      date: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
      isToday: i === 0,
    });
  }
  return days;
}

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'toast animate-fade-in-up';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

export function renderScheduling(container) {
  const bookings = getBookings();
  const upcoming = bookings.filter(b => b.status !== 'cancelled');
  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
  const BOOKING_TYPES = getBookingTypes();
  const labels = getBizLabels();
  const settings = dataStore.getSettings();
  const displayName = settings.companyName || settings.userName || 'your business';

  const days = getNext7Days();
  selectedBookingDay = selectedBookingDay || days[1]?.date || days[0].date;
  const slots = getAvailableSlots(selectedBookingDay, 30);

  const avatarColors = ['#6366f1', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  container.innerHTML = `
    <div class="scheduling-view">
      <div class="scheduling-header animate-fade-in">
        <div>
          <h1>${labels.header}</h1>
          <p style="color: var(--text-secondary); margin-top: var(--space-1);">Manage your availability and ${labels.client.toLowerCase()} bookings</p>
        </div>
        <div class="scheduling-stats">
          <div class="scheduling-stat">
            <div class="scheduling-stat-value">${confirmedCount}</div>
            <div class="scheduling-stat-label">Confirmed</div>
          </div>
          <div class="scheduling-stat">
            <div class="scheduling-stat-value">${pendingCount}</div>
            <div class="scheduling-stat-label">Pending</div>
          </div>
          <div class="scheduling-stat">
            <div class="scheduling-stat-value">${upcoming.length}</div>
            <div class="scheduling-stat-label">Total</div>
          </div>
        </div>
      </div>

      <!-- Booking Link -->
      <div class="booking-link-banner animate-fade-in-up">
        <div class="booking-link-info">
          <span style="font-size: 1.2rem;">🔗</span>
          <div>
            <div style="font-weight: var(--weight-medium); font-size: var(--text-sm);">Your Booking Link</div>
            <div class="booking-link-url">book.assistantnet.io/md</div>
          </div>
        </div>
        <div style="display: flex; gap: var(--space-2);">
          <button class="btn btn-secondary btn-sm" id="copy-booking-link">📋 Copy Link</button>
          <button class="btn btn-primary btn-sm" id="share-booking-link">↗ Share</button>
        </div>
      </div>

      <div class="availability-section">
        <!-- Left: Client Booking Preview -->
        <div class="client-preview animate-fade-in-up" style="animation-delay: 0.1s;">
          <h3>📆 Book with ${escapeHtml(displayName)}</h3>
          <div class="client-preview-subtitle">Select a service, date, and available time slot</div>

          <div class="booking-types" style="margin-bottom: var(--space-4);">
            ${BOOKING_TYPES.map((t, i) => `
              <div class="booking-type-card ${i === 0 ? 'selected' : ''}" data-type="${t.id}" data-duration="${t.duration}">
                <div class="booking-type-icon">${t.icon}</div>
                <div class="booking-type-name">${t.name}</div>
                <div class="booking-type-duration">${t.duration} min</div>
              </div>
            `).join('')}
          </div>

          <div class="client-day-picker">
            ${days.map(d => `
              <button class="client-day-btn ${d.date === selectedBookingDay ? 'selected' : ''}" data-date="${d.date}">
                <span class="client-day-num">${d.dayNum}</span>
                <span class="client-day-name">${d.dayName}</span>
              </button>
            `).join('')}
          </div>

          <div class="client-slots" id="client-slots-grid">
            ${slots.length > 0 ? slots.map(s => `
              <button class="client-slot-btn ${!s.available ? 'unavailable' : ''} ${selectedSlot === s.time ? 'selected' : ''}"
                data-time="${s.time}" ${!s.available ? 'disabled' : ''}>
                ${s.time}
              </button>
            `).join('') : '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: var(--space-4);">No available slots this day</div>'}
          </div>

          <div class="client-form" id="booking-form" style="${selectedSlot ? '' : 'display:none;'}">
            <input class="input" type="text" id="client-name" placeholder="${labels.client} name" />
            <input class="input" type="email" id="client-email" placeholder="${labels.client} email" />
            <input class="input" type="text" id="client-notes" placeholder="Notes (optional)" />
            <button class="btn btn-primary" id="confirm-booking" style="width: 100%;">
              ✅ Confirm Appointment — ${selectedSlot || '—'} on ${selectedBookingDay ? new Date(selectedBookingDay + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
            </button>
          </div>
        </div>

        <!-- Right: Availability Config -->
        <div class="availability-card animate-fade-in-up" style="animation-delay: 0.15s;">
          <h3>⏰ Your Availability</h3>
          <div class="time-slots-grid">
            ${DEFAULT_AVAILABILITY.map(a => `
              <div class="time-slot-row">
                <div class="time-slot-day">${a.day}</div>
                <div class="time-slot-range">${a.enabled ? `${a.start} — ${a.end}` : 'Unavailable'}</div>
                <div class="time-slot-toggle ${a.enabled ? 'active' : ''}" data-day="${a.day}"></div>
              </div>
            `).join('')}
          </div>
          <div style="margin-top: var(--space-4); padding-top: var(--space-3); border-top: 1px solid var(--border-subtle);">
            <div style="font-size: var(--text-xs); color: var(--text-muted); margin-bottom: var(--space-2);">Appointment Buffer</div>
            <div style="display: flex; gap: var(--space-2);">
              <button class="chip active">15 min</button>
              <button class="chip">30 min</button>
              <button class="chip">None</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Upcoming Bookings -->
      <div class="card animate-fade-in-up" style="animation-delay: 0.2s;">
        <div class="card-header">
          <div>
            <div class="card-title">Upcoming Appointments</div>
            <div class="card-subtitle">${upcoming.length} scheduled</div>
          </div>
        </div>
        ${upcoming.length > 0 ? `
          <div class="bookings-list">
            ${upcoming.map(b => {
              const color = avatarColors[b.clientName.charCodeAt(0) % avatarColors.length];
              const initials = b.clientName.split(' ').map(w => w[0]).join('').substr(0, 2).toUpperCase();
              const dateStr = new Date(b.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              return `
                <div class="booking-row">
                  <div class="booking-avatar" style="background: ${color};">${initials}</div>
                  <div class="booking-client-info">
                    <div class="booking-client-name">${escapeHtml(b.clientName)}</div>
                    <div class="booking-client-email">${escapeHtml(b.clientEmail || '')}</div>
                  </div>
                  <div class="booking-datetime">${dateStr}<br/>${b.time} (${b.duration}m)</div>
                  <span class="booking-type-label">${escapeHtml(b.type)}</span>
                  <span class="booking-status ${b.status}">${b.status}</span>
                  <div class="booking-actions">
                    ${b.status === 'confirmed' ? `<button class="btn btn-ghost btn-sm cancel-booking" data-id="${b.id}">Cancel</button>` : ''}
                  </div>
                </div>`;
            }).join('')}
          </div>
        ` : `
          <div class="bookings-empty">
            <div class="bookings-empty-icon">📅</div>
            <div style="font-size: var(--text-base); font-weight: var(--weight-medium); margin-bottom: var(--space-1);">No appointments yet</div>
            <div style="font-size: var(--text-sm);">Share your booking link to start receiving client appointments</div>
          </div>
        `}
      </div>
    </div>
  `;

  bindSchedulingEvents(container);
}

function bindSchedulingEvents(container) {
  // Copy link
  document.getElementById('copy-booking-link')?.addEventListener('click', () => {
    navigator.clipboard?.writeText('https://book.assistantnet.io/md').catch(() => {});
    showToast('Booking link copied!');
  });

  // Share link
  document.getElementById('share-booking-link')?.addEventListener('click', () => {
    if (navigator.share) {
      navigator.share({ title: 'Book a meeting with me', url: 'https://book.assistantnet.io/md' });
    } else {
      navigator.clipboard?.writeText('https://book.assistantnet.io/md').catch(() => {});
      showToast('Booking link copied!');
    }
  });

  // Day picker
  container.querySelectorAll('.client-day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedBookingDay = btn.dataset.date;
      selectedSlot = null;
      renderScheduling(container);
    });
  });

  // Booking type selection
  container.querySelectorAll('.booking-type-card').forEach(card => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.booking-type-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedSlot = null;
      renderScheduling(container);
    });
  });

  // Slot selection
  container.querySelectorAll('.client-slot-btn:not(.unavailable)').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedSlot = btn.dataset.time;
      renderScheduling(container);
    });
  });

  // Confirm booking
  document.getElementById('confirm-booking')?.addEventListener('click', () => {
    const name = document.getElementById('client-name')?.value?.trim();
    const email = document.getElementById('client-email')?.value?.trim();
    const notes = document.getElementById('client-notes')?.value?.trim();
    const selectedType = container.querySelector('.booking-type-card.selected');
    const typeName = selectedType?.querySelector('.booking-type-name')?.textContent || 'Consultation Call';
    const duration = parseInt(selectedType?.dataset.duration) || 30;

    if (!name) { showToast('Please enter a client name'); return; }
    if (!selectedSlot) { showToast('Please select a time slot'); return; }

    addBooking({
      clientName: name,
      clientEmail: email,
      notes: notes || '',
      type: typeName,
      duration,
      date: selectedBookingDay,
      time: selectedSlot,
      location: 'Video Call',
    });

    showToast(`✅ Appointment booked: ${name} at ${selectedSlot}`);
    selectedSlot = null;
    renderScheduling(container);
  });

  // Cancel booking
  container.querySelectorAll('.cancel-booking').forEach(btn => {
    btn.addEventListener('click', () => {
      cancelBooking(btn.dataset.id);
      showToast('Appointment cancelled');
      renderScheduling(container);
    });
  });

  // Toggle availability
  container.querySelectorAll('.time-slot-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');
      const day = toggle.dataset.day;
      const avail = DEFAULT_AVAILABILITY.find(a => a.day === day);
      if (avail) avail.enabled = !avail.enabled;
    });
  });
}

export function destroyScheduling() {
  selectedBookingDay = null;
  selectedSlot = null;
}
