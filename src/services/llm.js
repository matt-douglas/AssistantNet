// J.A.R.V.I.S. — LLM Service (Multi-Provider: Gemini, Ollama, Fallback)
// Supports cloud (Gemini) and local (Ollama/MLX) AI backends

let genAIClient = null;
let currentProvider = 'fallback'; // 'gemini' | 'ollama' | 'fallback'
let ollamaBaseUrl = '/ollama';
let ollamaModel = '';

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


// ---- Provider Management ----

export function getProvider() { return currentProvider; }

export function setProvider(provider) {
  if (['gemini', 'ollama', 'fallback'].includes(provider)) {
    currentProvider = provider;
    console.log(`⚡ J.A.R.V.I.S. core switched to: ${provider}`);
  }
}

export function getProviderDisplayName() {
  if (currentProvider === 'gemini') return 'Core: Gemini Online';
  if (currentProvider === 'ollama') return `Core: Ollama (${ollamaModel || 'local'})`;
  return 'Core: Local Mode';
}


// ---- Gemini Provider ----

export async function initLLM(apiKey) {
  if (!apiKey) return null;
  try {
    const { GoogleGenAI } = await import('@google/genai');
    genAIClient = new GoogleGenAI({ apiKey });
    currentProvider = 'gemini';
    return genAIClient;
  } catch (err) {
    console.error('Failed to initialize Gemini:', err);
    return null;
  }
}

export function isLLMReady() {
  return currentProvider !== 'fallback';
}


// ---- Ollama Provider ----

export function setOllamaConfig(baseUrl, model) {
  if (baseUrl) ollamaBaseUrl = baseUrl.replace(/\/$/, '');
  if (model) ollamaModel = model;
}

export async function detectOllama(baseUrl) {
  const url = (baseUrl || ollamaBaseUrl).replace(/\/$/, '');
  try {
    const res = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const data = await res.json();
    const models = (data.models || []).map(m => ({
      name: m.name,
      size: m.size,
      modified: m.modified_at,
      family: m.details?.family || 'unknown',
      paramSize: m.details?.parameter_size || '',
      quantization: m.details?.quantization_level || '',
    }));
    return models;
  } catch {
    return null;
  }
}

export async function initOllama(baseUrl, model) {
  const url = (baseUrl || ollamaBaseUrl).replace(/\/$/, '');
  const models = await detectOllama(url);
  if (!models || models.length === 0) return null;

  ollamaBaseUrl = url;
  ollamaModel = model || models[0].name;
  currentProvider = 'ollama';
  console.log(`⚡ Ollama connected: ${ollamaModel} at ${ollamaBaseUrl}`);
  return { model: ollamaModel, models };
}

async function* streamOllama(userMessage, context) {
  const systemContent = context
    ? `${SYSTEM_PROMPT}\n\nCurrent context:\n${context}`
    : SYSTEM_PROMPT;

  try {
    const res = await fetch(`${ollamaBaseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userMessage }
        ],
        stream: true,
        options: {
          temperature: 0.7,
          num_predict: 2048,
        }
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Ollama ${res.status}: ${err}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          if (json.message?.content) {
            yield json.message.content;
          }
          if (json.done) return;
        } catch {
          // skip malformed JSON chunks
        }
      }
    }
  } catch (err) {
    console.error('Ollama stream error:', err);
    yield `I encountered an error communicating with the local model. Error: ${err.message}. Falling back to built-in intelligence.`;
    yield* simulateStream(userMessage, context);
  }
}


// ---- Unified Streaming Interface ----

export async function* streamChat(userMessage, context = '') {
  if (currentProvider === 'ollama' && ollamaModel) {
    yield* streamOllama(userMessage, context);
    return;
  }

  if (currentProvider === 'gemini' && genAIClient) {
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
      yield `I encountered an error communicating with Gemini. Error: ${err.message}. Falling back to built-in intelligence.`;
    }
    return;
  }

  // Fallback
  yield* simulateStream(userMessage, context);
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
let fallbackCounter = 0;

async function* simulateStream(userMessage, context) {
  const lower = userMessage.toLowerCase().trim();
  let response;

  // Greetings
  if (/^(hi|hey|hello|yo|sup|what'?s up|howdy|good (morning|afternoon|evening))/.test(lower)) {
    const greetings = [
      `Good to see you, sir. All systems nominal.\n\nI'm ready when you are — ask me about your **tasks**, **schedule**, **inbox**, or anything else on your mind.`,
      `At your service. Everything's running smoothly.\n\nWhat can I help you with? I can check your **emails**, review your **calendar**, or tackle your **task list**.`,
      `Hello, sir. J.A.R.V.I.S. online and operational.\n\nShall I pull up your **priorities for today**, check your **inbox**, or is there something specific?`,
    ];
    response = greetings[fallbackCounter++ % greetings.length];
  }
  // Thanks
  else if (/^(thanks|thank you|thx|cheers|appreciate)/.test(lower)) {
    const thanks = [
      `You're welcome, sir. That's what I'm here for.\n\nAnything else I can help with?`,
      `Happy to help. Just say the word if you need anything else.`,
      `Of course. I'll be here when you need me.`,
    ];
    response = thanks[fallbackCounter++ % thanks.length];
  }
  // Help / what can you do
  else if (lower.includes('help') || lower.includes('what can you') || lower.includes('what do you') || lower.includes('how do i')) {
    response = `Here's what I can do for you:\n\n- **📧 "Check my inbox"** — email triage and drafting\n- **📅 "What's on my calendar?"** — schedule review\n- **✅ "Show my tasks"** — priority queue\n- **📊 "Performance report"** — metrics overview\n- **✍️ "Draft an email"** — content generation\n\nFor full AI capabilities, connect **Gemini** or **Ollama** in Settings → AI Core.\n\n*Currently running on built-in intelligence — I'm limited to preset responses, but still useful for navigation.*`;
  }
  // Email / inbox
  else if (lower.includes('email') || lower.includes('inbox') || lower.includes('draft') || lower.includes('mail')) {
    response = `## Inbox Analysis\n\nHere's the situation:\n\n**🔴 Requires Attention**\n- 2 unread items flagged as high priority\n- One appears time-sensitive\n\n**🟡 For Review**\n- Several items can be batched for later\n\n**Actions:**\n1. ✅ Address urgent items first\n2. 📋 Queue the rest\n3. 🗑️ Archive low-priority\n\nShall I draft a response?`;
  }
  // Calendar / schedule / meeting
  else if (lower.includes('meeting') || lower.includes('calendar') || lower.includes('schedule') || lower.includes('agenda')) {
    response = `## Schedule Overview\n\n**Today**\n- Meetings across the day with focus blocks between them\n\n**⚠️ Suggestion**\n- Protect at least 2 hours of uninterrupted focus time daily\n- Audit recurring meetings quarterly — tends to free up 3-5 hours/week\n\nWould you like me to optimize your schedule?`;
  }
  // Tasks / work
  else if (lower.includes('task') || lower.includes('work') || lower.includes('todo') || lower.includes('priorit') || lower.includes('focus')) {
    response = `## Task Queue\n\n### 🔥 Focus Now\nItems with approaching deadlines or blocking others\n\n### ⚡ Up Next\nImportant but not urgent — save for deep-work blocks\n\n### 📋 Scheduled\nFuture deadlines — monitored and tracked\n\n**Recommendation:** Focus on your top 3 items today. Shall I break any down into subtasks?`;
  }
  // Reports / analytics
  else if (lower.includes('report') || lower.includes('analytic') || lower.includes('metric') || lower.includes('kpi') || lower.includes('performance')) {
    response = `## Performance Snapshot\n\n| Metric | Status | Trend |\n|--------|--------|-------|\n| Tasks Completed | On track | 🟢 |\n| Inbox Health | Needs review | 🟡 |\n| Focus Hours | Below target | 🟡 |\n| Schedule Load | Balanced | 🟢 |\n\n**Key insight:** Focus time is your bottleneck. Consider a no-meeting morning policy.`;
  }
  // Generic — rotate between short, varied responses
  else {
    const generic = [
      `I understand you're asking about: *"${userMessage}"*\n\nWith built-in intelligence I'm limited to preset responses. For a proper conversation, connect an AI provider:\n\n- **☁️ Gemini** — free cloud AI via [AI Studio](https://aistudio.google.com/)\n- **🖥️ Ollama** — free local AI on your Mac (\`brew install ollama\`)\n\nConfigure either in **Settings → AI Core**.`,
      `That's a great question, sir. Unfortunately, built-in mode can't generate custom responses.\n\nI can still help with:\n- 📧 *"Check my inbox"*\n- 📅 *"What's on my schedule?"*\n- ✅ *"Show my tasks"*\n- 📊 *"Performance report"*\n\nOr connect **Ollama** or **Gemini** in Settings for full conversational AI.`,
      `I'd love to give you a proper answer, but built-in mode only handles preset topics.\n\nTry asking about your **emails**, **tasks**, **calendar**, or **metrics** — or connect a live AI in Settings for unlimited conversation.`,
    ];
    response = generic[fallbackCounter++ % generic.length];
  }

  // Stream the response in chunks
  const words = response.split(' ');
  const chunkSize = 4;
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    yield chunk + ' ';
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

export default { initLLM, initOllama, detectOllama, isLLMReady, streamChat, quickAction, getProvider, setProvider, getProviderDisplayName, setOllamaConfig, getOllamaModels: detectOllama };
