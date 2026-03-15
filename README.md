# J.A.R.V.I.S.

> **Just A Rather Very Intelligent System** — A personal AI command center inspired by Tony Stark's AI companion. Manage your tasks, calendar, inbox, documents, and analytics with intelligent automation.

> **Status: Working Full-Stack Demo** — 11 interactive modules, real Gemini LLM chat, Express + SQLite backend, and localStorage persistence. Ships with **Demo Mode** (rich sample data) and **Start Fresh** (clean workspace for real use).

## Screenshots

| Dashboard | Calendar |
|---|---|
| ![Dashboard](screenshots/dashboard.png) | ![Calendar](screenshots/calendar.png) |

| Task Engine | Analytics |
|---|---|
| ![Tasks](screenshots/tasks.png) | ![Analytics](screenshots/analytics.png) |

| Smart Inbox | AI Assistant |
|---|---|
| ![Inbox](screenshots/inbox.png) | ![Assistant](screenshots/assistant.png) |

| Documents | Scheduling |
|---|---|
| ![Documents](screenshots/documents.png) | ![Scheduling](screenshots/scheduling.png) |

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` — the JARVIS onboarding wizard walks you through setup.

## Features

#### Core Modules
- **⚡ JARVIS AI Chat** — Streaming Gemini 2.0 Flash with JARVIS personality (witty, proactive, formal address). Falls back to rich built-in responses without API key
- **✅ Task Engine** — Kanban board with drag-and-drop, subtask progress, full CRUD, localStorage persistence
- **📧 Smart Inbox** — Star/unstar, priority filters, mark-as-read, AI "Draft Reply" and "Summarize"
- **📊 Dashboard** — Live Chart.js charts, KPI cards with animated counters, activity feed, getting-started checklist
- **📅 Calendar** — Weekly time-grid, color-coded events, week navigation, full CRUD via modals
- **📄 Documents** — Search, category filter, file upload (button + drag-and-drop), template generation
- **📆 Scheduling** — Booking management with configurable appointment types and time slots
- **⚙️ Settings** — Profile, workspace config, API key, theme toggle, autonomous mode, demo mode toggle
- **📈 Analytics** — Productivity scorecards, trend charts, and AI-generated insights

#### Onboarding & Personalization
- **3-step JARVIS onboarding** — Initialize → Identification Protocol → Core Upgrade (optional API key)
- **Demo Mode / Start Fresh** — Toggle between rich sample data and clean workspace anytime from Settings
- **Persistent local data** — Everything stays on your machine via localStorage (no cloud required)

#### Visual Design
- **🎨 Aurora mesh background** — Animated gradient backdrop with grain texture overlay
- **🪟 Glassmorphism** — Frosted sidebar and top-bar with `backdrop-filter` blur
- **✨ Micro-interactions** — KPI shimmer, button effects, nav slide, animated counters
- **🌙 Full theme support** — Dark and light mode with all effects adapting

## LLM Integration

J.A.R.V.I.S. works out of the box with rich built-in responses (no API key required). To enable live Gemini streaming:

1. Go to **Settings → AI Configuration** (or set up during onboarding Step 3)
2. Enter your API key from [Google AI Studio](https://aistudio.google.com/)
3. Click **Test Connection** to verify
4. Uses `gemini-2.0-flash` with a JARVIS-tuned system prompt

## Tech Stack

- **Vite 6** — Build tool with HMR
- **Vanilla JS** — Zero framework, ES modules, hash-based SPA router
- **Express 5 + SQLite** — Backend API (optional, falls back to localStorage)
- **Chart.js 4** — Bar + line chart analytics
- **Marked 15** — Markdown rendering in chat
- **Google GenAI SDK** — Streaming Gemini integration (lazy-loaded)
- **localStorage** — Client-side data persistence via `DataStore` class

---

## Architecture

| Layer | Files | Purpose |
| --- | --- | --- |
| Entry | `index.html`, `main.js`, `router.js`, `vite.config.js` | Shell, routing, top-bar, keyboard shortcuts |
| Services | `data.js`, `llm.js`, `workflow.js`, `utils.js`, `api.js` | Data store, LLM streaming, autonomous queue, utilities |
| Modules | 11 × (`module.js` + `module.css`) | Dashboard, Assistant, Inbox, Calendar, Tasks, Documents, Scheduling, Settings, Analytics, Contacts, Command Palette |
| Styles | `variables.css`, `layout.css`, `components.css` | Design system tokens, layout, reusable components |
| Backend | `server/index.js`, `server/auth.js`, `server/db.js` | Express API, JWT auth, SQLite persistence |

---

## Roadmap

### ✅ Phase 1 — Bug Fixes & Polish (v1.1)
- [x] Fix double `init()` call race condition, calendar formatting, sidebar rebuilds
- [x] Wire inbox Summarize button to LLM, modal task creation, 404 handling

### ✅ Phase 2 — Settings & LLM Activation (v1.2)
- [x] Settings page with API key, user profile, business type
- [x] Calendar and Documents CRUD, upload button, duplicate utility cleanup

### ✅ Phase 3 — JARVIS Transformation (v2.0)
- [x] Rebrand to J.A.R.V.I.S. (branding, personality, system prompt)
- [x] Universal onboarding wizard with JARVIS personality
- [x] Demo Mode / Start Fresh toggle for sample data vs real use
- [x] Generalized seed data, JARVIS-voiced fallback responses

### 🔲 Phase 4 — Real Integrations (v3.0)
- [ ] Gmail API integration (OAuth2, real email send/receive)
- [ ] Google Calendar API (read/write events)
- [ ] Push notification system
- [ ] Cross-module search with AI

### 🔲 Phase 5 — Backend & Auth (v4.0)
- [ ] User authentication (Google OAuth / SSO)
- [ ] PostgreSQL replacing localStorage
- [ ] Role-based access control
- [ ] Webhook integrations (Slack, Teams)
