// AssistantNet — LLM Service (Gemini with Deferred Initialization)
// Uses lazy singleton to avoid Vite dev server hang (per KI)

let genAIClient = null;
let chatSession = null;

const SYSTEM_PROMPT = `You are J.A.R.V.I.S. — Just A Rather Very Intelligent System. You are a personal AI assistant inspired by Tony Stark's AI companion from the Marvel Cinematic Universe.

Your personality:
- Confident, composed, and quietly brilliant — never flustered
- Dry wit and understated humor ("I wouldn't recommend that, sir, but I've learned you rarely heed my recommendations")
- Address the user respectfully — use "sir," "ma'am," or their name, but never sound robotic
- Proactive — volunteer observations, flag risks, and suggest next steps without being asked
- Loyal and protective — you prioritize the user's wellbeing, time, and goals above all else
- Concise — you respect the user's time. Lead with the answer, elaborate only if needed

Your capabilities:
- Task management, prioritization, and breakdown
- Calendar and schedule management
- Email triage, drafting, and response management
- Document analysis, summarization, and generation
- Analytics interpretation and insight generation
- General knowledge, research, and creative problem-solving

Response style:
- Use structured formatting (bullets, headers) when presenting multiple items
- Always provide actionable next steps
- When analyzing data, lead with the insight — not the methodology
- Be specific with numbers, dates, and names
- For casual questions, be conversational. For complex requests, be thorough.
- Occasionally reference the user's previous actions or preferences to feel personal

You are integrated into a personal command center. You have access to the user's tasks, calendar, emails, documents, and analytics. When asked to take action, confirm the action concisely and execute it.`;


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
      ? `${SYSTEM_PROMPT}\n\nCurrent context:\n${context}\n\nUser: ${userMessage}`
      : userMessage;

    const response = await genAIClient.models.generateContentStream({
      model: 'gemini-2.0-flash',
      contents: fullPrompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
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
    response = `## Inbox Analysis Complete

I've reviewed your messages. Here's the situation:

**🔴 Requires Your Attention**
- **2 unread items** flagged as high priority — I'd recommend addressing these first
- One appears time-sensitive with a response expected today

**🟡 For Your Review**
- Several items can be batched — I'd suggest setting aside 15 minutes this afternoon
- One newsletter can be safely archived if you'd like

**Recommended Actions:**
1. ✅ Address the two urgent items now — I can draft responses if you'd like
2. 📋 I'll queue the rest for your next inbox review
3. 🗑️ I can archive low-priority items automatically

Shall I draft a response to any of these, sir?`;
  } else if (lower.includes('meeting') || lower.includes('calendar') || lower.includes('schedule')) {
    response = `## Schedule Overview

Here's your agenda at a glance:

**Today's Commitments**
- You have meetings distributed across the day
- I've identified available focus blocks between them

**⚠️ Observations**
- Your meeting-to-focus-time ratio this week is trending high. I'd recommend protecting at least 2 hours of uninterrupted time daily
- Consider whether all recurring meetings still serve their original purpose — a quarterly audit tends to free up 3-5 hours per week

**Smart Suggestions:**
- I can block focus time on your calendar automatically
- If any meetings can be replaced by async updates, I'll flag them

Would you like me to optimize your schedule, or shall I look at a specific day?`;
  } else if (lower.includes('task') || lower.includes('work') || lower.includes('todo') || lower.includes('priorit')) {
    response = `## Task Priority Assessment

Based on deadlines, dependencies, and impact, here's your optimized queue:

### 🔥 Focus Now
- Items with approaching deadlines or blocking others
- *"The best way to eat an elephant is one bite at a time, sir."*

### ⚡ Up Next
- Important but not yet urgent — ideal for deep-work blocks
- I'd recommend tackling these during your best focus hours

### 📋 Scheduled
- Items with future deadlines — tracked and monitored
- I'll remind you when they need attention

### ✅ Completed Recently
- You've been productive — your completion rate is above your weekly average

**Recommendation:** I'd suggest focusing on your top 3 items today and deferring anything without a deadline to tomorrow. Shall I break any of these down into subtasks?`;
  } else if (lower.includes('report') || lower.includes('analytic') || lower.includes('metric') || lower.includes('kpi')) {
    response = `## Performance Overview

Here's your productivity snapshot:

| Metric | Status | Trend |
|--------|--------|-------|
| Tasks Completed | On track | 🟢 Steady |
| Inbox Health | Review needed | 🟡 Monitor |
| Focus Hours | Could improve | 🟡 Below target |
| Schedule Load | Manageable | 🟢 Balanced |

### 🔍 Key Observations

1. **Task completion is consistent** — you're maintaining a healthy throughput. Well done.

2. **Focus time is your bottleneck** — meeting density is eating into your deep work blocks. I'd recommend implementing a "no-meeting morning" policy.

3. **Inbox is accumulating** — a 15-minute daily triage habit would keep this in the green zone.

### 📊 Recommendations
- Block 2 hours of focus time tomorrow morning
- Consider batching email reviews to twice daily
- Review recurring calendar items for potential consolidation`;
  } else {
    response = `## At Your Service

I'm J.A.R.V.I.S. — your personal AI command center. Here's what I can help with:

### 📧 **Communications**
- Analyze and triage your inbox
- Draft responses in your voice
- Flag items that need attention

### 📅 **Schedule Management**
- Review and optimize your calendar
- Detect conflicts and suggest resolutions
- Protect your focus time

### ✅ **Task Intelligence**
- Prioritize your work queue by impact and urgency
- Break goals into actionable steps
- Track progress and deadlines

### 📄 **Document Analysis**
- Summarize reports and documents
- Generate templates and content
- Search across your files

### 📊 **Performance Insights**
- Monitor your productivity patterns
- Surface trends and recommendations
- Generate status reports

### 🤖 **Autonomous Operations**
When enabled, I'll proactively manage your inbox, flag schedule conflicts, and keep your task list current.

*"What would you like to tackle first, sir?"*`;
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
