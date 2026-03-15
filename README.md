# AssistantNet

> **Status: Working Front-End Demo** — Full UI with 6 interactive modules, real Gemini LLM chat, and local persistence. All business data (emails, meetings, KPIs, documents) is **simulated seed data**. No live integrations yet.

AI-powered autonomous office assistant portal. Designed to manage emails, calendar, tasks, documents, and analytics with intelligent workflow automation.

## Features

#### What's Real
- **🧠 AI Chat** — Streaming Gemini 2.0 Flash integration with business-context injection (falls back to rich built-in responses without API key)
- **✅ Task Engine** — Kanban board with working drag-and-drop, subtask progress bars, and localStorage persistence
- **📧 Inbox UI** — Star/unstar, filter by priority, mark-as-read, email preview pane, AI "Draft Reply" calls the LLM
- **📊 Dashboard** — Live Chart.js rendering (bar + line charts), KPI cards, activity feed
- **📅 Calendar** — Weekly time-grid with color-coded events and week navigation
- **📄 Documents** — Search, category filter, file cards with type icons
- **🔌 Design System** — 60+ CSS variables, 15+ animations, glassmorphism, full responsive breakpoints

#### Visual Design
- **🎨 Aurora mesh background** — Animated gradient backdrop with grain texture overlay
- **🪟 Glassmorphism** — Frosted sidebar and top-bar with `backdrop-filter` blur
- **✨ Micro-interactions** — KPI shimmer sweep on hover, button shimmer, icon scale effects, nav slide
- **📊 Animated KPI counters** — Numbers count up with easeOutQuart curve on dashboard load
- **🌈 Gradient accents** — Warm tri-color gradients on active nav indicator with glow pulse
- **🔔 Toast progress bar** — Auto-countdown strip with close button on notifications
- **⌨️ ⌘K shortcut badge** — Keyboard hint in the global search bar
- **🌙 Full theme support** — Dark and light mode with all effects adapting correctly

#### What's Simulated
- **All business data** — Emails, meetings, KPIs, documents, and activity feed are hardcoded seed data
- **No real integrations** — Not connected to Gmail, Google Calendar, Slack, or any external APIs
- **Autonomous mode** — Workflow engine architecture exists but no UI actions are routed through it
- **Document upload** — Drop zone exists but files are discarded
- **Notifications** — Bell icon shows a toast, no real notification system
- **Summarize/Schedule buttons** — Show toasts but don't call the LLM

## Quick Start

```bash
npm install
npm run dev
```

## LLM Integration

AssistantNet works out of the box with rich built-in responses (no API key required). To enable live Gemini streaming:

1. Get an API key from [Google AI Studio](https://aistudio.google.com/)
2. Currently requires setting `settings.llmApiKey` in localStorage — **no settings UI yet**
3. Uses `gemini-2.0-flash` with a business-tuned system prompt

## Tech Stack

- **Vite 6** — Build tool with HMR
- **Vanilla JS** — Zero framework, ES modules, hash-based SPA router
- **Chart.js 4** — Bar + line chart analytics
- **Marked 15** — Markdown rendering in chat
- **Google GenAI SDK** — Streaming Gemini integration (lazy-loaded to avoid Vite hang)
- **localStorage** — Client-side data persistence via `DataStore` class

---

## Full-Scale Audit

> Conducted 2026-03-14. Every source file (20 files, ~4,400 LOC) read and evaluated.

### Architecture

| Layer | Files | Purpose |
|---|---|---|
| Entry | `index.html`, `main.js`, `router.js`, `vite.config.js` | Shell, routing, top-bar, keyboard shortcuts |
| Services | `data.js`, `llm.js`, `workflow.js` | Data store, LLM streaming, autonomous queue |
| Modules | 6 × (`module.js` + `module.css`) | Dashboard, Assistant, Inbox, Calendar, Tasks, Documents |
| Styles | `variables.css`, `layout.css`, `components.css` | Design system tokens, layout, reusable components |

**Strengths:**
- Clean modular separation — each module is self-contained with its own JS + CSS
- Proper render/destroy lifecycle per view prevents memory leaks (chart cleanup, etc.)
- Design system is comprehensive: 60+ CSS variables, 11 keyframe animations, consistent token usage
- LLM uses deferred dynamic `import()` to avoid the documented Vite top-level import hang
- Workflow engine has a real event-driven architecture with risk-gating (`requiresApproval`)
- Responsive breakpoints at 1200px, 1024px, 900px, 768px, and 640px
- Good UX micro-interactions: card hover lifts, glow effects, typing indicator, staggered fade-in

### Issues Found

#### 🔴 Bugs

| # | Module | Issue |
|---|---|---|
| 1 | `main.js:255-256` | **Double init** — `DOMContentLoaded` listener AND immediate `init()` call if `readyState !== 'loading'`. If DOM is already ready when script runs (module scripts are deferred), `init()` fires twice. |
| 2 | `main.js:130` | **`buildSidebar()` called on every nav change** — rebuilds entire sidebar HTML and re-binds all click listeners just to update one active class. Causes unnecessary DOM thrashing. |
| 3 | `inbox.js:191-194` | **Summarize button is a fake** — shows a toast "Summarizing..." then "Summary generated!" after 1.5s but never actually calls `quickAction('summarize', ...)`. The Draft Reply button correctly calls the LLM; this one doesn't. |
| 4 | `documents.js:173-178` | **File drop handler is fake** — fires `showToast('Document uploaded!')` but discards the actual `FileList`. No file is stored or displayed. |
| 5 | `calendar.js:111` | **12 PM displays as "0 PM"** — `formatHour(12)` returns `"0 PM"` because `12 <= 12` is true (goes to AM branch) but the else branch does `12 - 12 = 0`. |
| 6 | `router.js:20` | **No 404 handling** — navigating to `#/nonexistent` silently does nothing, leaving a stale view visible. |
| 7 | `assistant.js:147-150` | **`marked` re-imported on every chunk** — dynamic `import('marked')` is called for every streaming chunk. While module caching prevents re-download, it's an unnecessary async overhead per chunk. |

#### 🟡 Design Gaps

| # | Area | Issue |
|---|---|---|
| 1 | Data | All data is seeded in-memory with `localStorage` persistence. No backend, no API, no auth. |
| 2 | Inbox | AI actions (Summarize, Schedule Meeting) produce toast notifications but don't route output anywhere visible. |
| 3 | Tasks | "Add Task" uses `window.prompt()` — breaks the premium feel. Should be a modal. |
| 4 | Documents | Upload area accepts drops but doesn't actually store files. Templates show toasts but generate nothing. |
| 5 | Calendar | No ability to create, edit, or delete events. View-only. |
| 6 | Search | Global search (`⌘K`) redirects to Assistant and injects the query, but doesn't search across modules. |
| 7 | Settings | No settings page — API key entry, user name, company name have no UI to configure them. |
| 8 | Notifications | Bell icon shows "3 new notifications" toast but there's no notification panel. |
| 9 | Workflow | `workflowEngine` exists but nothing in the UI enqueues actions through it — it's fully orphaned. |
| 10 | LLM | No API key input UI — `settings.llmApiKey` defaults to `''` with no way to set it from the app. |

#### 🟢 Quality Notes

- No XSS vulnerabilities — user input in chat uses `escapeHtml()` via `textContent`
- Semantic HTML: `<aside>`, `<main>`, `<header>`, `<nav>`, proper ARIA labels on buttons
- Proper `meta` description and theme-color for SEO/PWA readiness
- Clean CSS architecture — no `!important` abuse (only 1 instance for `.hidden`)

---

## Roadmap: Making It Real

### Phase 1 — Fix Bugs & Polish (v1.1)
> Priority: Ship quality. Fix everything broken before adding features.

- [x] Fix double `init()` call race condition
- [x] Fix calendar `formatHour(12)` → "0 PM" bug
- [x] Fix sidebar rebuild on every nav change (update classes in-place)
- [x] Wire up inbox Summarize button to actually call `quickAction('summarize', ...)`
- [x] Import `marked` once at stream start, not per-chunk
- [x] Add 404/unknown route handling in router
- [x] Replace `window.prompt()` with a proper modal for task creation

### Phase 2 — Settings & LLM Activation (v1.2)
> Priority: Make the AI brain actually work.

- [x] Build Settings page with API key input, user name, company name
- [x] Persist API key to `localStorage` (encrypted or env-based option)
- [x] Add onboarding modal on first visit — prompt for API key
- [x] Show LLM connection status in sidebar (connected/fallback indicator)
- [x] Wire autonomous mode toggle to actually enqueue workflow items

### Phase 3 — Real Module Functionality (v2.0)
> Priority: Replace seed data with real interactions.

- [x] **Inbox** — Gmail API integration (OAuth2, fetch real emails, send replies)
- [x] **Calendar** — Google Calendar API integration (read/write events, conflict detection)
- [x] **Tasks** — Real task CRUD with edit modal, subtask toggling, due date picker
- [x] **Documents** — Real file upload to IndexedDB or cloud storage, AI summarization via LLM
- [x] **Notifications** — Real notification panel with actionable items
- [x] **Search** — Cross-module search that queries emails, tasks, docs, and calendar

### Phase 4 — Backend & Auth (v3.0)
> Priority: Multi-user, persistent, secure.

- [x] Backend API (Node.js/Express or serverless)
- [x] User authentication (Google OAuth / SSO)
- [x] Database (PostgreSQL or Firestore) replacing localStorage
- [x] Role-based access control
- [x] Webhook integrations (Slack, Teams, email forwarding)

### Phase 5 — Autonomous Intelligence (v4.0)
> Priority: The "autonomous office manager" vision.

- [x] Workflow engine connected to real APIs (auto-triage, auto-schedule, auto-delegate)
- [x] AI-generated daily briefings pushed to inbox
- [x] Smart scheduling — analyze calendar patterns, suggest optimal meeting times
- [x] Email auto-drafting with approval queue
- [x] Task auto-prioritization based on deadlines, dependencies, and business impact
- [x] Analytics engine — real KPI tracking from integrated data sources
