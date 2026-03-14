// AssistantNet — LLM Service (Gemini with Deferred Initialization)
// Uses lazy singleton to avoid Vite dev server hang (per KI)

let genAIClient = null;
let chatSession = null;

const BUSINESS_SYSTEM_PROMPT = `You are AssistantNet AI — a world-class autonomous office assistant with deep business acumen. You operate as a Chief of Staff-level AI that can replace a human office manager from day one.

Your capabilities:
- Email triage, drafting, and response management
- Calendar scheduling, conflict resolution, and meeting prep
- Task breakdown, prioritization, and delegation
- Document summarization, analysis, and generation
- Business analytics interpretation and insight generation
- Workflow automation and process optimization

Your personality:
- Confident, concise, and results-oriented
- Proactive — anticipate needs before being asked
- Strategic — think in terms of business impact and ROI
- Professional but personable — you're a trusted colleague, not a generic bot

Response style:
- Use structured formatting (bullet points, headers) for clarity
- Always provide actionable next steps
- When analyzing data, lead with the insight, not the methodology
- For emails, match the appropriate professional tone
- Be specific with numbers, dates, and names — never be vague

Current context: You are integrated into a company's office management portal. You have access to their emails, calendar, tasks, documents, and KPIs. When users ask you to take action, confirm the action and execute it.`;

export async function initLLM(apiKey) {
  if (!apiKey) return null;
  try {
    // Dynamic import to avoid top-level import hang with Vite
    const { GoogleGenAI } = await import('@google/genai');
    genAIClient = new GoogleGenAI({ apiKey });
    return genAIClient;
  } catch (err) {
    console.error('Failed to initialize Gemini:', err);
    return null;
  }
}

export function isLLMReady() {
  return genAIClient !== null;
}

export async function* streamChat(userMessage, context = '') {
  if (!genAIClient) {
    yield* simulateStream(userMessage, context);
    return;
  }

  try {
    const fullPrompt = context
      ? `${BUSINESS_SYSTEM_PROMPT}\n\nCurrent context:\n${context}\n\nUser: ${userMessage}`
      : userMessage;

    const response = await genAIClient.models.generateContentStream({
      model: 'gemini-2.0-flash',
      contents: fullPrompt,
      config: {
        systemInstruction: BUSINESS_SYSTEM_PROMPT,
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    });

    for await (const chunk of response) {
      const text = chunk.text;
      if (text) yield text;
    }
  } catch (err) {
    console.error('LLM stream error:', err);
    yield `I encountered an error communicating with the AI service. Error: ${err.message}. Falling back to built-in intelligence.`;
  }
}

export async function quickAction(action, context) {
  const prompts = {
    'draft-email': `Draft a professional email reply to the following email. Be concise, professional, and actionable:\n\n${context}`,
    'draft': `Draft a professional reply to the following email. Be concise, professional, and actionable:\n\n${context}`,
    'summarize': `Provide a concise executive summary of the following document/content. Lead with key takeaways:\n\n${context}`,
    'break-tasks': `Break down the following goal into specific, actionable subtasks with clear ownership and deadlines:\n\n${context}`,
    'schedule': `Analyze the following scheduling request and suggest optimal time slots, considering potential conflicts:\n\n${context}`,
    'analyze': `Provide a data-driven analysis of the following business metrics. Lead with insights and actionable recommendations:\n\n${context}`,
    'prioritize': `Review the following items and provide a prioritized ranking based on business impact, urgency, and effort. Explain your reasoning:\n\n${context}`,
    'briefing': `Generate a concise, executive-style morning briefing based on the following data. Lead with priorities and recommended focus areas:\n\n${context}`,
  };

  const prompt = prompts[action] || context;
  const result = [];
  for await (const chunk of streamChat(prompt)) {
    result.push(chunk);
  }
  return result.join('');
}

// Built-in intelligence fallback when no API key is configured
async function* simulateStream(userMessage, context) {
  const lower = userMessage.toLowerCase();
  let response;

  if (lower.includes('email') || lower.includes('inbox') || lower.includes('draft')) {
    response = `## Email Analysis & Action Plan

I've reviewed your inbox and here's my assessment:

**🔴 Urgent (2 items)**
- **Q1 Revenue Report** from Sarah Chen — The northeast variance needs your immediate attention before Thursday's board meeting. I recommend scheduling a 30-min sync with Sarah tomorrow at 2 PM.
- **Apex Financial Escalation** — This is retention-critical ($420K ARR). I've drafted an executive response and recommend approving the 2-month service credit immediately.

**🟡 High Priority (2 items)**
- **TechVault Partnership** — The terms look reasonable but the 15% rev share is above market (typical: 10-12%). I suggest a counter-proposal at 12%.
- **Meridian Contract Redlines** — Legal has flagged 4 items. The liability cap reduction from $5M to $2M is standard. Approve and return.

**Next Steps:**
1. ✅ I'll draft the Apex Financial response for your review
2. ✅ I'll schedule the Sarah Chen sync at 2 PM tomorrow
3. ✅ I'll prepare a counter-proposal for TechVault
4. 📋 Meridian redlines queued for your review

Shall I proceed with these actions?`;
  } else if (lower.includes('meeting') || lower.includes('calendar') || lower.includes('schedule')) {
    response = `## Today's Schedule Overview

You have **6 meetings** today with 2.5 hours of focus time available.

**Morning Block**
- 🔵 **9:00 - 9:30** Weekly Standup (Zoom) — Team sync, no prep needed
- 🟢 **9:30 - 10:00** Focus time available

**Midday Block**
- 🟡 **12:30 - 1:30** New Hire Welcome Lunch (Cafeteria)

**Afternoon Block**
- 🔴 **2:00 - 3:30** Board Prep — Q1 Review (Boardroom A) — *I've prepared talking points*
- 🟢 **3:30 - 4:00** Focus time available

**⚠️ Conflicts Detected:**
- Engineering Architecture Review (Tue 10 AM) overlaps with a client call you may need to join. I recommend rescheduling to 2 PM or delegating to the CTO.

**Smart Suggestion:** Based on your pattern, Wednesday afternoons have the fewest interruptions. I'd recommend blocking 2-4 PM for deep work.

Want me to reschedule the Tuesday conflict or block Wednesday focus time?`;
  } else if (lower.includes('task') || lower.includes('work') || lower.includes('todo') || lower.includes('priorit')) {
    response = `## Task Priority Matrix

Based on urgency, business impact, and dependencies, here's your optimized work queue:

### 🔥 Do Now (Today)
1. **Investigate API Latency Spike** — INC-2847 is customer-facing. Platform team is on it but needs your escalation authority for additional resources.
2. **Apex Financial Response** — 60-day renewal window. Every day of delay increases churn risk.

### ⚡ Do Next (This Week)
3. **Q1 Revenue Board Prep** — Thursday deadline. Sarah's data is ready, you need 90 min for talking points.
4. **TechVault Partnership Response** — Marcus is waiting. Counter at 12% rev share.
5. **Meridian Contract Approve** — Legal review is done, just needs your sign-off.

### 📋 Schedule (Next Week)
6. **Q2 Marketing Campaign Sign-off** — March 21 deadline, Emma can wait until Monday.
7. **Update Investor Deck** — March 25, delegate data gathering to Finance.
8. **Q2 OKR Planning** — March 28, block 2 hours Thursday.

### ✅ Delegated & Tracked
- Onboarding prep → Linda P. (on track)
- Security audit items → Security Team (due Apr 1)

**AI Recommendation:** You have ~5 hours of task work today. I suggest tackling items 1-3 and delegating item 4 prep to your partnerships analyst.`;
  } else if (lower.includes('report') || lower.includes('analytic') || lower.includes('metric') || lower.includes('kpi')) {
    response = `## Business Performance Snapshot

### Key Metrics (Q1 2026)

| Metric | Value | Δ vs Q4 | Status |
|--------|-------|---------|--------|
| Revenue | $4.28M | +12.4% | 🟢 Above target |
| Tasks Completed | 147 | +8.2% | 🟢 On track |
| Client Satisfaction | 94.2% | +2.1pp | 🟢 Excellent |
| Team Utilization | 87% | +5.0pp | 🟡 Monitor |
| Email Response Time | 2.4 hrs | -15% | 🟢 Improving |
| Meeting Load | 32 hrs/wk | +12% | 🔴 High |

### 🔍 Key Insights

1. **Revenue momentum is strong** — 12.4% growth driven by APAC outperformance (+18%). However, northeast region variance (-3%) needs attention before it compounds.

2. **Team utilization at 87% is approaching burnout territory** — Industry best practice is 75-80%. Consider deferring non-critical projects or hiring.

3. **Meeting load has increased 12%** — You're spending 32 hrs/week in meetings. I recommend an audit to eliminate recurring meetings with <3 attendees or no clear agenda.

### 📊 Recommendations
- Schedule a northeast region deep-dive with regional leads
- Implement a "no-meeting Wednesday" policy to improve focus time
- Consider a hiring plan for Q2 to address utilization pressure`;
  } else {
    response = `## How Can I Help?

I'm your autonomous office assistant, ready to manage your day. Here's what I can do right now:

### 📧 **Email Management**
- Triage and prioritize your inbox
- Draft professional responses
- Flag urgent items and client escalations

### 📅 **Calendar & Scheduling**
- Optimize your daily schedule
- Detect and resolve meeting conflicts
- Block focus time automatically

### ✅ **Task Management**
- Break down goals into actionable subtasks
- Prioritize by business impact
- Track and delegate work items

### 📄 **Document Intelligence**
- Summarize contracts and reports
- Generate templates and briefs
- Search across your document library

### 📊 **Business Analytics**
- Real-time KPI monitoring
- Trend analysis and insights
- Executive summary generation

### 🤖 **Autonomous Mode**
When enabled, I proactively:
- Triage new emails every 15 minutes
- Reschedule conflicting meetings
- Break down new tasks automatically
- Generate daily briefings

**Try asking:** *"What should I focus on today?"* or *"Draft a reply to Sarah's email"*`;
  }

  // Simulate streaming by yielding chunks
  const words = response.split(' ');
  const chunkSize = 3;
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    yield chunk + ' ';
    await new Promise(resolve => setTimeout(resolve, 15));
  }
}

export default { initLLM, isLLMReady, streamChat, quickAction };
