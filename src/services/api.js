// AssistantNet — Frontend API Client
// Wraps fetch calls to the Express backend.
// Falls back to localStorage DataStore when backend is unavailable.

const API_BASE = 'http://localhost:3001';

let isBackendAvailable = false;

// Check if backend is running
export async function checkBackend() {
  try {
    const res = await fetch(`${API_BASE}/health`, { credentials: 'include' });
    isBackendAvailable = res.ok;
  } catch {
    isBackendAvailable = false;
  }
  return isBackendAvailable;
}

export function hasBackend() {
  return isBackendAvailable;
}

// ---- Auth ----
export async function login(username, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Login failed');
  return (await res.json()).user;
}

export async function register(username, password, displayName, companyName) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password, displayName, companyName })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Registration failed');
  return (await res.json()).user;
}

export async function logout() {
  await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
}

export async function getSession() {
  const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
  if (!res.ok) return null;
  return (await res.json()).user;
}

// ---- Generic API call ----
async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  if (res.status === 401) {
    // Session expired — redirect to login
    window.dispatchEvent(new CustomEvent('auth:expired'));
    throw new Error('Session expired');
  }
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ---- Emails ----
export const apiEmails = {
  list: () => api('/emails'),
  markRead: (id) => api(`/emails/${id}/read`, { method: 'PATCH' }),
  toggleStar: (id) => api(`/emails/${id}/star`, { method: 'PATCH' }),
};

// ---- Tasks ----
export const apiTasks = {
  list: () => api('/tasks'),
  create: (task) => api('/tasks', { method: 'POST', body: JSON.stringify(task) }),
  update: (id, task) => api(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(task) }),
  delete: (id) => api(`/tasks/${id}`, { method: 'DELETE' }),
};

// ---- Meetings ----
export const apiMeetings = {
  list: () => api('/meetings'),
  create: (meeting) => api('/meetings', { method: 'POST', body: JSON.stringify(meeting) }),
  delete: (id) => api(`/meetings/${id}`, { method: 'DELETE' }),
};

// ---- Documents ----
export const apiDocs = {
  list: () => api('/documents'),
  create: (doc) => api('/documents', { method: 'POST', body: JSON.stringify(doc) }),
};

// ---- Settings ----
export const apiSettings = {
  get: () => api('/settings'),
  update: (settings) => api('/settings', { method: 'PUT', body: JSON.stringify(settings) }),
};

// ---- Search ----
export const apiSearch = {
  query: (q) => api(`/search?q=${encodeURIComponent(q)}`),
};

// ---- Activity ----
export const apiActivity = {
  list: () => api('/activity'),
  add: (activity) => api('/activity', { method: 'POST', body: JSON.stringify(activity) }),
};
